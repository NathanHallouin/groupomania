import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

/**
 * Request metrics
 */
interface RequestMetrics {
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  service: string;
  userId?: string;
  userAgent?: string;
  ip: string;
}

/**
 * Aggregated metrics by service
 */
interface ServiceMetrics {
  serviceName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  lastRequestTime: Date;
}

/**
 * Metrics collector for the API Gateway
 */
export class MetricsCollector {
  private requestMetrics: RequestMetrics[] = [];
  private serviceMetrics: Map<string, ServiceMetrics> = new Map();
  private logger: winston.Logger;
  private maxMetricsHistory: number = 10000;
  private aggregationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()]
    });

    this.startAggregation();
  }

  /**
   * Middleware to collect request metrics
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Generate a unique ID for the request
      (req as any).requestId = this.generateRequestId();
      (req as any).startTime = startTime;

      // Intercept response end
      res.on('finish', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        this.recordRequest({
          timestamp: new Date(),
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          service: this.extractServiceFromPath(req.path),
          userId: (req as any).user?.userId,
          userAgent: req.get('User-Agent'),
          ip: req.ip || 'unknown'
        });
      });

      next();
    };
  }

  /**
   * Record a request
   */
  public recordRequest(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics);

    // Limit metrics history
    if (this.requestMetrics.length > this.maxMetricsHistory) {
      this.requestMetrics.shift();
    }

    // Update service metrics
    this.updateServiceMetrics(metrics);

    this.logger.debug('Request recorded', {
      method: metrics.method,
      path: metrics.path,
      responseTime: metrics.responseTime,
      statusCode: metrics.statusCode
    });
  }

  /**
   * Record a service response
   */
  public recordResponse(serviceName: string, statusCode: number, responseTime: number): void {
    const metrics: RequestMetrics = {
      timestamp: new Date(),
      method: 'PROXY',
      path: `/${serviceName}`,
      statusCode,
      responseTime,
      service: serviceName,
      ip: 'gateway'
    };

    this.recordRequest(metrics);
  }

  /**
   * Get global metrics
   */
  public getMetrics(): any {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Filter metrics from the last hour
    const recentMetrics = this.requestMetrics.filter(m => m.timestamp >= oneHourAgo);

    return {
      timestamp: now.toISOString(),
      overview: this.getOverviewMetrics(recentMetrics),
      services: this.getServiceMetrics(),
      traffic: this.getTrafficMetrics(recentMetrics),
      errors: this.getErrorMetrics(recentMetrics),
      performance: this.getPerformanceMetrics(recentMetrics)
    };
  }

  /**
   * Get overview metrics
   */
  private getOverviewMetrics(metrics: RequestMetrics[]): any {
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;

    const responseTimes = metrics.map(m => m.responseTime);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests * 100) : 0,
      averageResponseTime: Math.round(averageResponseTime),
      requestsPerSecond: this.calculateRequestsPerSecond(metrics)
    };
  }

  /**
   * Get metrics by service
   */
  private getServiceMetrics(): { [serviceName: string]: ServiceMetrics } {
    const result: { [serviceName: string]: ServiceMetrics } = {};
    
    for (const [serviceName, metrics] of this.serviceMetrics.entries()) {
      result[serviceName] = { ...metrics };
    }

    return result;
  }

  /**
   * Get traffic metrics
   */
  private getTrafficMetrics(metrics: RequestMetrics[]): any {
    const now = new Date();
    const intervals = [5, 15, 30, 60]; // minutes

    const trafficByInterval = intervals.map(minutes => {
      const cutoff = new Date(now.getTime() - minutes * 60000);
      const intervalMetrics = metrics.filter(m => m.timestamp >= cutoff);
      
      return {
        interval: `${minutes}m`,
        requests: intervalMetrics.length,
        requestsPerSecond: intervalMetrics.length / (minutes * 60),
        averageResponseTime: this.calculateAverageResponseTime(intervalMetrics)
      };
    });

    return {
      byInterval: trafficByInterval,
      byMethod: this.groupByMethod(metrics),
      byStatus: this.groupByStatus(metrics),
      topPaths: this.getTopPaths(metrics, 10)
    };
  }

  /**
   * Get error metrics
   */
  private getErrorMetrics(metrics: RequestMetrics[]): any {
    const errorMetrics = metrics.filter(m => m.statusCode >= 400);
    
    const errorsByStatus = this.groupByStatus(errorMetrics);
    const errorsByService = this.groupByService(errorMetrics);
    const errorsByPath = this.groupByPath(errorMetrics);

    return {
      totalErrors: errorMetrics.length,
      errorsByStatus,
      errorsByService,
      errorsByPath: Object.entries(errorsByPath)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
    };
  }

  /**
   * Get performance metrics
   */
  private getPerformanceMetrics(metrics: RequestMetrics[]): any {
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    
    if (responseTimes.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        median: 0,
        p95: 0,
        p99: 0
      };
    }

    return {
      min: responseTimes[0],
      max: responseTimes[responseTimes.length - 1],
      average: Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length),
      median: this.calculatePercentile(responseTimes, 50),
      p95: this.calculatePercentile(responseTimes, 95),
      p99: this.calculatePercentile(responseTimes, 99)
    };
  }

  /**
   * Update service metrics
   */
  private updateServiceMetrics(requestMetrics: RequestMetrics): void {
    const serviceName = requestMetrics.service;
    
    if (!this.serviceMetrics.has(serviceName)) {
      this.serviceMetrics.set(serviceName, {
        serviceName,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        lastRequestTime: new Date()
      });
    }

    const metrics = this.serviceMetrics.get(serviceName)!;
    
    metrics.totalRequests++;
    metrics.lastRequestTime = requestMetrics.timestamp;
    
    if (requestMetrics.statusCode < 400) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update response times
    metrics.averageResponseTime = this.calculateMovingAverage(
      metrics.averageResponseTime,
      requestMetrics.responseTime,
      metrics.totalRequests
    );
    
    metrics.minResponseTime = Math.min(metrics.minResponseTime, requestMetrics.responseTime);
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, requestMetrics.responseTime);
    
    // Calculate error rate
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;
  }

  /**
   * Extract service name from path
   */
  private extractServiceFromPath(path: string): string {
    const match = path.match(/^\/api\/v\d+\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Calculate requests per second
   */
  private calculateRequestsPerSecond(metrics: RequestMetrics[]): number {
    if (metrics.length === 0) return 0;

    const timeSpan = Date.now() - metrics[0].timestamp.getTime();
    const seconds = timeSpan / 1000;
    
    return seconds > 0 ? metrics.length / seconds : 0;
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(metrics: RequestMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.responseTime, 0);
    return Math.round(total / metrics.length);
  }

  /**
   * Calculate a moving average
   */
  private calculateMovingAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  /**
   * Calculate a percentile
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  /**
   * Group by HTTP method
   */
  private groupByMethod(metrics: RequestMetrics[]): { [method: string]: number } {
    return metrics.reduce((acc, m) => {
      acc[m.method] = (acc[m.method] || 0) + 1;
      return acc;
    }, {} as { [method: string]: number });
  }

  /**
   * Group by status code
   */
  private groupByStatus(metrics: RequestMetrics[]): { [status: string]: number } {
    return metrics.reduce((acc, m) => {
      const statusGroup = `${Math.floor(m.statusCode / 100)}xx`;
      acc[statusGroup] = (acc[statusGroup] || 0) + 1;
      return acc;
    }, {} as { [status: string]: number });
  }

  /**
   * Group by service
   */
  private groupByService(metrics: RequestMetrics[]): { [service: string]: number } {
    return metrics.reduce((acc, m) => {
      acc[m.service] = (acc[m.service] || 0) + 1;
      return acc;
    }, {} as { [service: string]: number });
  }

  /**
   * Group by path
   */
  private groupByPath(metrics: RequestMetrics[]): { [path: string]: number } {
    return metrics.reduce((acc, m) => {
      acc[m.path] = (acc[m.path] || 0) + 1;
      return acc;
    }, {} as { [path: string]: number });
  }

  /**
   * Get top paths
   */
  private getTopPaths(metrics: RequestMetrics[], limit: number): { [path: string]: number } {
    const pathCounts = this.groupByPath(metrics);
    
    return Object.entries(pathCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, limit)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
  }

  /**
   * Start periodic aggregation
   */
  private startAggregation(): void {
    this.aggregationInterval = setInterval(() => {
      this.performAggregation();
    }, 60000); // Every minute

    this.logger.info('Metrics aggregation started');
  }

  /**
   * Perform periodic aggregation
   */
  private performAggregation(): void {
    // Clean up old metrics (more than 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600000);
    this.requestMetrics = this.requestMetrics.filter(m => m.timestamp >= twentyFourHoursAgo);

    // Calculate P95 for each service
    for (const [serviceName, serviceMetrics] of this.serviceMetrics.entries()) {
      const serviceRequestMetrics = this.requestMetrics.filter(m => m.service === serviceName);
      const responseTimes = serviceRequestMetrics.map(m => m.responseTime).sort((a, b) => a - b);
      
      serviceMetrics.p95ResponseTime = this.calculatePercentile(responseTimes, 95);
      serviceMetrics.requestsPerSecond = this.calculateRequestsPerSecond(serviceRequestMetrics);
    }

    this.logger.debug('Metrics aggregation completed', {
      totalMetrics: this.requestMetrics.length,
      services: this.serviceMetrics.size
    });
  }

  /**
   * Flush metrics
   */
  public async flush(): Promise<void> {
    // Save important metrics before flushing
    const summary = this.getMetrics();
    this.logger.info('Metrics summary before flush', summary);

    // Clear the data
    this.requestMetrics = [];
    this.serviceMetrics.clear();
  }

  /**
   * Stop the metrics collector
   */
  public stop(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
    this.logger.info('Metrics collector stopped');
  }
}
