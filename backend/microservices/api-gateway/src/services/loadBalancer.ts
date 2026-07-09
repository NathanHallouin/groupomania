import winston from 'winston';
import { ServiceInfo } from './serviceDiscovery';

/**
 * Load balancing strategies
 */
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  WEIGHTED = 'weighted',
  RANDOM = 'random'
}

/**
 * Interface for instance statistics
 */
interface InstanceStats {
  serviceId: string;
  activeConnections: number;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastRequestTime: Date;
}

/**
 * Load Balancer to distribute requests across instances
 */
export class LoadBalancer {
  private instanceStats: Map<string, InstanceStats> = new Map();
  private roundRobinCounters: Map<string, number> = new Map();
  private strategy: LoadBalancingStrategy = LoadBalancingStrategy.WEIGHTED;
  private logger: winston.Logger;

  constructor(strategy: LoadBalancingStrategy = LoadBalancingStrategy.WEIGHTED) {
    this.strategy = strategy;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()]
    });
  }

  /**
   * Initialize the load balancer
   */
  public async initialize(): Promise<void> {
    this.logger.info(`Load Balancer initialized with strategy: ${this.strategy}`);
    
    // Clean up statistics periodically
    setInterval(() => {
      this.cleanupStats();
    }, 300000); // Every 5 minutes
  }

  /**
   * Get the next instance of a service
   */
  public getNextInstance(serviceName: string, availableInstances?: ServiceInfo[]): string | null {
    if (!availableInstances || availableInstances.length === 0) {
      return null;
    }

    const healthyInstances = availableInstances.filter(instance => 
      instance.health === 'healthy'
    );

    if (healthyInstances.length === 0) {
      this.logger.warn(`No healthy instances available for service: ${serviceName}`);
      return null;
    }

    let selectedInstance: ServiceInfo;

    switch (this.strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        selectedInstance = this.roundRobinSelection(serviceName, healthyInstances);
        break;
      
      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        selectedInstance = this.leastConnectionsSelection(healthyInstances);
        break;
      
      case LoadBalancingStrategy.WEIGHTED:
        selectedInstance = this.weightedSelection(healthyInstances);
        break;
      
      case LoadBalancingStrategy.RANDOM:
        selectedInstance = this.randomSelection(healthyInstances);
        break;
      
      default:
        selectedInstance = this.weightedSelection(healthyInstances);
    }

    const instanceUrl = `http://${selectedInstance.host}:${selectedInstance.port}`;
    
    // Update statistics
    this.updateInstanceStats(selectedInstance.id, 'request_started');
    
    this.logger.debug(`Selected instance for ${serviceName}: ${instanceUrl}`);
    return instanceUrl;
  }

  /**
   * Round Robin selection
   */
  private roundRobinSelection(serviceName: string, instances: ServiceInfo[]): ServiceInfo {
    if (!this.roundRobinCounters.has(serviceName)) {
      this.roundRobinCounters.set(serviceName, 0);
    }

    const counter = this.roundRobinCounters.get(serviceName)!;
    const selectedInstance = instances[counter % instances.length];
    
    this.roundRobinCounters.set(serviceName, counter + 1);
    
    return selectedInstance;
  }

  /**
   * Least connections selection
   */
  private leastConnectionsSelection(instances: ServiceInfo[]): ServiceInfo {
    let selectedInstance = instances[0];
    let minConnections = this.getInstanceStats(selectedInstance.id).activeConnections;

    for (const instance of instances) {
      const connections = this.getInstanceStats(instance.id).activeConnections;
      if (connections < minConnections) {
        minConnections = connections;
        selectedInstance = instance;
      }
    }

    return selectedInstance;
  }

  /**
   * Weighted selection
   */
  private weightedSelection(instances: ServiceInfo[]): ServiceInfo {
    // Calculate weights based on performance and configuration
    const weightedInstances = instances.map(instance => {
      const stats = this.getInstanceStats(instance.id);
      const configWeight = instance.metadata?.weight || 1;
      
      // Performance factor based on response time and error rate
      const performanceFactor = this.calculatePerformanceFactor(stats);
      
      return {
        instance,
        weight: configWeight * performanceFactor
      };
    });

    // Weighted random selection
    const totalWeight = weightedInstances.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of weightedInstances) {
      random -= item.weight;
      if (random <= 0) {
        return item.instance;
      }
    }

    // Fallback
    return instances[0];
  }

  /**
   * Random selection
   */
  private randomSelection(instances: ServiceInfo[]): ServiceInfo {
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex];
  }

  /**
   * Calculate performance factor
   */
  private calculatePerformanceFactor(stats: InstanceStats): number {
    let factor = 1.0;

    // Penalize high response times
    if (stats.averageResponseTime > 1000) {
      factor *= 0.5;
    } else if (stats.averageResponseTime > 500) {
      factor *= 0.7;
    } else if (stats.averageResponseTime > 200) {
      factor *= 0.9;
    }

    // Penalize high error rates
    if (stats.errorRate > 0.1) { // 10%
      factor *= 0.3;
    } else if (stats.errorRate > 0.05) { // 5%
      factor *= 0.6;
    } else if (stats.errorRate > 0.01) { // 1%
      factor *= 0.8;
    }

    // Penalize high number of connections
    if (stats.activeConnections > 100) {
      factor *= 0.5;
    } else if (stats.activeConnections > 50) {
      factor *= 0.7;
    } else if (stats.activeConnections > 20) {
      factor *= 0.9;
    }

    return Math.max(factor, 0.1); // Minimum 10%
  }

  /**
   * Update instance statistics
   */
  public updateInstanceStats(serviceId: string, event: string, data?: any): void {
    const stats = this.getInstanceStats(serviceId);

    switch (event) {
      case 'request_started':
        stats.activeConnections++;
        stats.totalRequests++;
        stats.lastRequestTime = new Date();
        break;

      case 'request_completed':
        stats.activeConnections = Math.max(0, stats.activeConnections - 1);
        if (data?.responseTime) {
          // Calculate moving average
          stats.averageResponseTime = (stats.averageResponseTime * 0.9) + (data.responseTime * 0.1);
        }
        break;

      case 'request_failed':
        stats.activeConnections = Math.max(0, stats.activeConnections - 1);
        // Calculate error rate with moving average
        const errorRate = stats.errorRate || 0;
        stats.errorRate = (errorRate * 0.95) + (0.05); // Increase error rate
        break;

      case 'request_success':
        // Slightly decrease error rate
        stats.errorRate = (stats.errorRate || 0) * 0.99;
        break;
    }

    this.instanceStats.set(serviceId, stats);
  }

  /**
   * Get instance statistics
   */
  private getInstanceStats(serviceId: string): InstanceStats {
    if (!this.instanceStats.has(serviceId)) {
      this.instanceStats.set(serviceId, {
        serviceId,
        activeConnections: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        lastRequestTime: new Date()
      });
    }

    return this.instanceStats.get(serviceId)!;
  }

  /**
   * Get all statistics
   */
  public getAllStats(): { [serviceId: string]: InstanceStats } {
    const result: { [serviceId: string]: InstanceStats } = {};
    
    for (const [serviceId, stats] of this.instanceStats.entries()) {
      result[serviceId] = { ...stats };
    }

    return result;
  }

  /**
   * Clean up old statistics
   */
  private cleanupStats(): void {
    const now = new Date();
    const maxAge = 3600000; // 1 hour

    for (const [serviceId, stats] of this.instanceStats.entries()) {
      const age = now.getTime() - stats.lastRequestTime.getTime();
      
      if (age > maxAge && stats.activeConnections === 0) {
        this.instanceStats.delete(serviceId);
        this.logger.debug(`Cleaned up stats for inactive service: ${serviceId}`);
      }
    }
  }

  /**
   * Change load balancing strategy
   */
  public setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    this.logger.info(`Load balancing strategy changed to: ${strategy}`);
  }

  /**
   * Get current strategy
   */
  public getStrategy(): LoadBalancingStrategy {
    return this.strategy;
  }

  /**
   * Reset counters (useful for tests)
   */
  public resetCounters(): void {
    this.roundRobinCounters.clear();
    this.instanceStats.clear();
    this.logger.info('Load balancer counters reset');
  }
}
