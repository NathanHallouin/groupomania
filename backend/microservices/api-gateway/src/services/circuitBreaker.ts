import winston from 'winston';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Circuit open, requests blocked
  HALF_OPEN = 'half_open' // Recovery test
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening
  recoveryTimeout: number;      // Time before recovery attempt (ms)
  monitoringPeriod: number;     // Monitoring period (ms)
  expectedResponseTime: number; // Expected response time (ms)
  minimumRequests: number;      // Minimum number of requests for evaluation
}

/**
 * Circuit breaker statistics
 */
interface CircuitStats {
  serviceName: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  stateChangedAt: Date;
  averageResponseTime: number;
}

/**
 * Circuit Breaker pattern for protection against cascading failures
 */
export class CircuitBreaker {
  private circuits: Map<string, CircuitStats> = new Map();
  private config: CircuitBreakerConfig;
  private logger: winston.Logger;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 secondes
      expectedResponseTime: 1000, // 1 seconde
      minimumRequests: 10,
      ...config
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()]
    });

    this.startMonitoring();
  }

  /**
   * Check if the circuit is open for a service
   */
  public isOpen(serviceName: string): boolean {
    const circuit = this.getCircuit(serviceName);
    return circuit.state === CircuitState.OPEN;
  }

  /**
   * Check if the circuit is closed for a service
   */
  public isClosed(serviceName: string): boolean {
    const circuit = this.getCircuit(serviceName);
    return circuit.state === CircuitState.CLOSED;
  }

  /**
   * Check if the circuit is half-open for a service
   */
  public isHalfOpen(serviceName: string): boolean {
    const circuit = this.getCircuit(serviceName);
    return circuit.state === CircuitState.HALF_OPEN;
  }

  /**
   * Record a success
   */
  public recordSuccess(serviceName: string, responseTime: number = 0): void {
    const circuit = this.getCircuit(serviceName);
    
    circuit.successCount++;
    circuit.totalRequests++;
    circuit.lastSuccessTime = new Date();
    
    // Update average response time
    if (responseTime > 0) {
      circuit.averageResponseTime = this.calculateMovingAverage(
        circuit.averageResponseTime,
        responseTime,
        Math.min(circuit.totalRequests, 100)
      );
    }

    // Reset failure counter on success
    if (circuit.state === CircuitState.HALF_OPEN) {
      // In half-open mode, a few successes close the circuit
      if (circuit.successCount >= 3) {
        this.closeCircuit(serviceName);
      }
    } else if (circuit.state === CircuitState.CLOSED && circuit.failureCount > 0) {
      // Gradually reduce the number of failures
      circuit.failureCount = Math.max(0, circuit.failureCount - 1);
    }

    this.logger.debug(`Success recorded for ${serviceName}`, {
      state: circuit.state,
      successCount: circuit.successCount,
      failureCount: circuit.failureCount,
      responseTime
    });
  }

  /**
   * Record a failure
   */
  public recordFailure(serviceName: string, error?: Error): void {
    const circuit = this.getCircuit(serviceName);
    
    circuit.failureCount++;
    circuit.totalRequests++;
    circuit.lastFailureTime = new Date();

    this.logger.warn(`Failure recorded for ${serviceName}`, {
      error: error?.message,
      state: circuit.state,
      failureCount: circuit.failureCount,
      successCount: circuit.successCount
    });

    // Check if failure threshold is reached
    if (this.shouldOpenCircuit(circuit)) {
      this.openCircuit(serviceName);
    }
  }

  /**
   * Record a timeout
   */
  public recordTimeout(serviceName: string, responseTime: number): void {
    const circuit = this.getCircuit(serviceName);
    
    // A timeout is considered a failure
    this.recordFailure(serviceName, new Error(`Timeout after ${responseTime}ms`));
    
    this.logger.warn(`Timeout recorded for ${serviceName}`, {
      responseTime,
      expectedResponseTime: this.config.expectedResponseTime
    });
  }

  /**
   * Check if a request can pass
   */
  public canExecute(serviceName: string): boolean {
    const circuit = this.getCircuit(serviceName);

    switch (circuit.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if recovery timeout has elapsed
        if (this.shouldAttemptRecovery(circuit)) {
          this.halfOpenCircuit(serviceName);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Allow a limited number of test requests
        return circuit.totalRequests < 5;

      default:
        return false;
    }
  }

  /**
   * Get statistics for a circuit
   */
  public getCircuitStats(serviceName: string): CircuitStats {
    return { ...this.getCircuit(serviceName) };
  }

  /**
   * Get statistics for all circuits
   */
  public getAllCircuitStats(): { [serviceName: string]: CircuitStats } {
    const result: { [serviceName: string]: CircuitStats } = {};
    
    for (const [serviceName, stats] of this.circuits.entries()) {
      result[serviceName] = { ...stats };
    }

    return result;
  }

  /**
   * Force close a circuit
   */
  public forceClose(serviceName: string): void {
    this.closeCircuit(serviceName);
    this.logger.info(`Circuit forcibly closed for ${serviceName}`);
  }

  /**
   * Force open a circuit
   */
  public forceOpen(serviceName: string): void {
    this.openCircuit(serviceName);
    this.logger.info(`Circuit forcibly opened for ${serviceName}`);
  }

  /**
   * Get or create a circuit for a service
   */
  private getCircuit(serviceName: string): CircuitStats {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        serviceName,
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        totalRequests: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        stateChangedAt: new Date(),
        averageResponseTime: 0
      });
    }

    return this.circuits.get(serviceName)!;
  }

  /**
   * Check if the circuit should be opened
   */
  private shouldOpenCircuit(circuit: CircuitStats): boolean {
    // Need a minimum number of requests to evaluate
    if (circuit.totalRequests < this.config.minimumRequests) {
      return false;
    }

    // Check failure rate
    const failureRate = circuit.failureCount / circuit.totalRequests;
    const failureThresholdRate = this.config.failureThreshold / this.config.minimumRequests;

    return failureRate >= failureThresholdRate || 
           circuit.failureCount >= this.config.failureThreshold;
  }

  /**
   * Check if a recovery attempt should be made
   */
  private shouldAttemptRecovery(circuit: CircuitStats): boolean {
    if (!circuit.lastFailureTime) return false;

    const timeSinceLastFailure = Date.now() - circuit.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  /**
   * Open a circuit
   */
  private openCircuit(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    
    if (circuit.state !== CircuitState.OPEN) {
      circuit.state = CircuitState.OPEN;
      circuit.stateChangedAt = new Date();
      
      this.logger.warn(`Circuit opened for ${serviceName}`, {
        failureCount: circuit.failureCount,
        totalRequests: circuit.totalRequests,
        failureRate: (circuit.failureCount / circuit.totalRequests * 100).toFixed(2) + '%'
      });
    }
  }

  /**
   * Close a circuit
   */
  private closeCircuit(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    
    circuit.state = CircuitState.CLOSED;
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.totalRequests = 0;
    circuit.stateChangedAt = new Date();
    
    this.logger.info(`Circuit closed for ${serviceName}`);
  }

  /**
   * Set a circuit to half-open mode
   */
  private halfOpenCircuit(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    
    circuit.state = CircuitState.HALF_OPEN;
    circuit.successCount = 0;
    circuit.totalRequests = 0;
    circuit.stateChangedAt = new Date();
    
    this.logger.info(`Circuit half-opened for ${serviceName} - testing recovery`);
  }

  /**
   * Calculate a moving average
   */
  private calculateMovingAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  /**
   * Start periodic monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performPeriodicCheck();
    }, this.config.monitoringPeriod);

    this.logger.info('Circuit breaker monitoring started');
  }

  /**
   * Periodic circuit verification
   */
  private performPeriodicCheck(): void {
    const now = new Date();

    for (const [serviceName, circuit] of this.circuits.entries()) {
      // Clean up old inactive circuits
      if (circuit.totalRequests === 0 &&
          now.getTime() - circuit.stateChangedAt.getTime() > 3600000) { // 1 hour
        this.circuits.delete(serviceName);
        continue;
      }

      // Check open circuits for recovery attempt
      if (circuit.state === CircuitState.OPEN && this.shouldAttemptRecovery(circuit)) {
        this.halfOpenCircuit(serviceName);
      }

      // Analyze performance for closed circuits
      if (circuit.state === CircuitState.CLOSED && circuit.totalRequests > 0) {
        const responseTimeThreshold = this.config.expectedResponseTime * 2;
        if (circuit.averageResponseTime > responseTimeThreshold) {
          this.logger.warn(`Slow response time detected for ${serviceName}: ${circuit.averageResponseTime}ms`);
        }
      }
    }
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.logger.info('Circuit breaker monitoring stopped');
  }
}
