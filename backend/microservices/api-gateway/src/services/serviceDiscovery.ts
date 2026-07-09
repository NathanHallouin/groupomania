import Redis from 'redis';
import winston from 'winston';

/**
 * Interface to define a service
 */
export interface ServiceInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  version: string;
  health: 'healthy' | 'unhealthy' | 'unknown';
  lastHeartbeat: Date;
  metadata?: {
    region?: string;
    datacenter?: string;
    weight?: number;
    tags?: string[];
  };
}

/**
 * Service Discovery for microservices management
 */
export class ServiceDiscovery {
  private services: Map<string, ServiceInfo[]> = new Map();
  private redisClient: Redis.RedisClientType;
  private logger: winston.Logger;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()]
    });

    this.redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
  }

  /**
   * Initialize service discovery
   */
  public async initialize(): Promise<void> {
    try {
      await this.redisClient.connect();
      this.logger.info('Service Discovery connected to Redis');

      // Load services from Redis
      await this.loadServicesFromRedis();

      // Start health checks
      this.startHealthChecks();

      // Listen for service changes
      this.subscribeToServiceChanges();
    } catch (error) {
      this.logger.error('Failed to initialize Service Discovery:', error);
      throw error;
    }
  }

  /**
   * Register a service
   */
  public async registerService(service: Omit<ServiceInfo, 'lastHeartbeat'>): Promise<void> {
    const serviceWithHeartbeat: ServiceInfo = {
      ...service,
      lastHeartbeat: new Date()
    };

    // Add to local registry
    if (!this.services.has(service.name)) {
      this.services.set(service.name, []);
    }

    const serviceList = this.services.get(service.name)!;
    const existingIndex = serviceList.findIndex(s => s.id === service.id);

    if (existingIndex >= 0) {
      serviceList[existingIndex] = serviceWithHeartbeat;
    } else {
      serviceList.push(serviceWithHeartbeat);
    }

    // Save in Redis
    await this.saveServiceToRedis(serviceWithHeartbeat);

    this.logger.info(`Service registered: ${service.name}:${service.id}`);
  }

  /**
   * Unregister a service
   */
  public async unregisterService(serviceName: string, serviceId: string): Promise<void> {
    const serviceList = this.services.get(serviceName);
    if (serviceList) {
      const filteredList = serviceList.filter(s => s.id !== serviceId);
      this.services.set(serviceName, filteredList);
    }

    // Remove from Redis
    await this.removeServiceFromRedis(serviceName, serviceId);

    this.logger.info(`Service unregistered: ${serviceName}:${serviceId}`);
  }

  /**
   * Get a service by name
   */
  public getService(serviceName: string): ServiceInfo | null {
    const services = this.getHealthyServices(serviceName);
    if (services.length === 0) return null;

    // Return the service with the highest weight or randomly
    return this.selectService(services);
  }

  /**
   * Get all healthy services of a type
   */
  public getHealthyServices(serviceName?: string): ServiceInfo[] {
    if (serviceName) {
      const services = this.services.get(serviceName) || [];
      return services.filter(s => s.health === 'healthy');
    }

    // Return all healthy services
    const allHealthyServices: ServiceInfo[] = [];
    for (const serviceList of this.services.values()) {
      allHealthyServices.push(...serviceList.filter(s => s.health === 'healthy'));
    }
    return allHealthyServices;
  }

  /**
   * Get all services
   */
  public getAllServices(): { [serviceName: string]: ServiceInfo[] } {
    const result: { [serviceName: string]: ServiceInfo[] } = {};
    for (const [name, services] of this.services.entries()) {
      result[name] = services;
    }
    return result;
  }

  /**
   * Update service health status
   */
  public async updateServiceHealth(serviceName: string, serviceId: string, health: 'healthy' | 'unhealthy'): Promise<void> {
    const serviceList = this.services.get(serviceName);
    if (serviceList) {
      const service = serviceList.find(s => s.id === serviceId);
      if (service) {
        service.health = health;
        service.lastHeartbeat = new Date();
        await this.saveServiceToRedis(service);
      }
    }
  }

  /**
   * Select a service according to a strategy
   */
  private selectService(services: ServiceInfo[]): ServiceInfo {
    if (services.length === 1) return services[0];

    // Weight-based selection strategy
    const weightedServices = services.filter(s => s.metadata?.weight && s.metadata.weight > 0);
    
    if (weightedServices.length > 0) {
      const totalWeight = weightedServices.reduce((sum, s) => sum + (s.metadata?.weight || 1), 0);
      let random = Math.random() * totalWeight;
      
      for (const service of weightedServices) {
        random -= (service.metadata?.weight || 1);
        if (random <= 0) return service;
      }
    }

    // Fallback: random selection
    return services[Math.floor(Math.random() * services.length)];
  }

  /**
   * Load services from Redis
   */
  private async loadServicesFromRedis(): Promise<void> {
    try {
      const keys = await this.redisClient.keys('service:*');
      
      for (const key of keys) {
        const serviceData = await this.redisClient.get(key);
        if (serviceData) {
          const service: ServiceInfo = JSON.parse(serviceData);
          service.lastHeartbeat = new Date(service.lastHeartbeat);
          
          if (!this.services.has(service.name)) {
            this.services.set(service.name, []);
          }
          
          this.services.get(service.name)!.push(service);
        }
      }

      this.logger.info(`Loaded ${keys.length} services from Redis`);
    } catch (error) {
      this.logger.error('Failed to load services from Redis:', error);
    }
  }

  /**
   * Save a service in Redis
   */
  private async saveServiceToRedis(service: ServiceInfo): Promise<void> {
    const key = `service:${service.name}:${service.id}`;
    await this.redisClient.setEx(key, 300, JSON.stringify(service)); // TTL 5 minutes
  }

  /**
   * Remove a service from Redis
   */
  private async removeServiceFromRedis(serviceName: string, serviceId: string): Promise<void> {
    const key = `service:${serviceName}:${serviceId}`;
    await this.redisClient.del(key);
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Every 30 seconds

    this.logger.info('Health checks started');
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    const now = new Date();
    const staleThreshold = 120000; // 2 minutes

    for (const [serviceName, serviceList] of this.services.entries()) {
      for (let i = serviceList.length - 1; i >= 0; i--) {
        const service = serviceList[i];
        const timeSinceHeartbeat = now.getTime() - service.lastHeartbeat.getTime();

        if (timeSinceHeartbeat > staleThreshold) {
          // Service considered dead
          this.logger.warn(`Service ${serviceName}:${service.id} appears to be dead, removing`);
          await this.unregisterService(serviceName, service.id);
        } else {
          // Ping the service to check its health
          await this.pingService(service);
        }
      }
    }
  }

  /**
   * Ping a service to check its health
   */
  private async pingService(service: ServiceInfo): Promise<void> {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`http://${service.host}:${service.port}/health`, {
        method: 'GET'
      });

      const newHealth = response.ok ? 'healthy' : 'unhealthy';
      if (service.health !== newHealth) {
        await this.updateServiceHealth(service.name, service.id, newHealth);
        this.logger.info(`Service ${service.name}:${service.id} health changed to ${newHealth}`);
      }
    } catch (error) {
      if (service.health !== 'unhealthy') {
        await this.updateServiceHealth(service.name, service.id, 'unhealthy');
        this.logger.warn(`Service ${service.name}:${service.id} health check failed:`, error);
      }
    }
  }

  /**
   * Subscribe to service changes
   */
  private subscribeToServiceChanges(): void {
    // Future implementation to listen for real-time changes
    this.logger.info('Service change subscription initialized');
  }

  /**
   * Disconnect service discovery
   */
  public async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.redisClient.isOpen) {
      await this.redisClient.disconnect();
    }

    this.logger.info('Service Discovery disconnected');
  }
}
