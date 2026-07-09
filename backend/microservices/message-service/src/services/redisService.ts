import Redis from 'ioredis';
import { config } from '../config/config';

/**
 * Redis service for cache and session management
 */
export class RedisService {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.setupEventHandlers();
  }

  /**
   * Configure Redis event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('✅ Redis connection established');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      console.log('✅ Redis service connected');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Store a value with optional expiration
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);

      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      console.error(`Error saving to Redis (${key}):`, error);
      // Do not propagate error to avoid breaking the application
    }
  }

  /**
   * Retrieve a value
   */
  async get(key: string): Promise<any | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error retrieving from Redis (${key}):`, error);
      return null;
    }
  }

  /**
   * Delete one or more keys
   */
  async del(key: string | string[]): Promise<number> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      return await this.client.del(...keys);
    } catch (error) {
      console.error(`Error deleting from Redis:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking Redis (${key}):`, error);
      return false;
    }
  }

  /**
   * Set expiration on an existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Error setting Redis expiration (${key}):`, error);
      return false;
    }
  }

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error(`Error incrementing Redis (${key}):`, error);
      return 0;
    }
  }

  /**
   * Decrement a numeric value
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      console.error(`Error decrementing Redis (${key}):`, error);
      return 0;
    }
  }

  /**
   * Add an element to a set (SET)
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      console.error(`Error adding to Redis set (${key}):`, error);
      return 0;
    }
  }

  /**
   * Remove an element from a set (SET)
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.srem(key, ...members);
    } catch (error) {
      console.error(`Error removing from Redis set (${key}):`, error);
      return 0;
    }
  }

  /**
   * Get all members of a set (SET)
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      console.error(`Error retrieving Redis set (${key}):`, error);
      return [];
    }
  }

  /**
   * Check if an element exists in a set (SET)
   */
  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch (error) {
      console.error(`Error checking Redis set (${key}):`, error);
      return false;
    }
  }

  /**
   * Store a WebSocket user session
   */
  async setUserSession(userId: number, socketId: string, sessionData: any): Promise<void> {
    const sessionKey = `session:${userId}:${socketId}`;
    await this.set(sessionKey, sessionData, 3600); // 1 hour

    // Add to user sessions list
    await this.sadd(`user:${userId}:sessions`, socketId);
  }

  /**
   * Retrieve a WebSocket user session
   */
  async getUserSession(userId: number, socketId: string): Promise<any | null> {
    const sessionKey = `session:${userId}:${socketId}`;
    return await this.get(sessionKey);
  }

  /**
   * Delete a WebSocket user session
   */
  async removeUserSession(userId: number, socketId: string): Promise<void> {
    const sessionKey = `session:${userId}:${socketId}`;
    await this.del(sessionKey);

    // Remove from user sessions list
    await this.srem(`user:${userId}:sessions`, socketId);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: number): Promise<string[]> {
    return await this.smembers(`user:${userId}:sessions`);
  }

  /**
   * Store users typing in a channel
   */
  async addTypingUser(channelId: number, userId: number): Promise<void> {
    const key = `typing:${channelId}`;
    await this.sadd(key, userId.toString());
    await this.expire(key, 10); // 10 seconds
  }

  /**
   * Remove a user from the typing users list
   */
  async removeTypingUser(channelId: number, userId: number): Promise<void> {
    const key = `typing:${channelId}`;
    await this.srem(key, userId.toString());
  }

  /**
   * Get the list of users typing in a channel
   */
  async getTypingUsers(channelId: number): Promise<number[]> {
    const key = `typing:${channelId}`;
    const userIds = await this.smembers(key);
    return userIds.map(id => parseInt(id, 10));
  }

  /**
   * Store connected users
   */
  async setUserOnline(userId: number): Promise<void> {
    await this.sadd('users:online', userId.toString());
    await this.set(`user:${userId}:last_seen`, new Date(), 86400); // 24 hours
  }

  /**
   * Mark a user as offline
   */
  async setUserOffline(userId: number): Promise<void> {
    await this.srem('users:online', userId.toString());
    await this.set(`user:${userId}:last_seen`, new Date(), 86400); // 24 hours
  }

  /**
   * Check if a user is online
   */
  async isUserOnline(userId: number): Promise<boolean> {
    return await this.sismember('users:online', userId.toString());
  }

  /**
   * Get the list of online users
   */
  async getOnlineUsers(): Promise<number[]> {
    const userIds = await this.smembers('users:online');
    return userIds.map(id => parseInt(id, 10));
  }

  /**
   * Clean up expired data
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up expired sessions
      const sessionKeys = await this.client.keys('session:*');
      const expiredSessions = [];

      for (const key of sessionKeys) {
        const ttl = await this.client.ttl(key);
        if (ttl === -1 || ttl === -2) { // No expiration or expired
          expiredSessions.push(key);
        }
      }

      if (expiredSessions.length > 0) {
        await this.del(expiredSessions);
        console.log(`🧹 ${expiredSessions.length} expired sessions cleaned up`);
      }

      // Clean up expired typing data
      const typingKeys = await this.client.keys('typing:*');
      for (const key of typingKeys) {
        const ttl = await this.client.ttl(key);
        if (ttl === -2) { // Expired
          await this.del(key);
        }
      }

    } catch (error) {
      console.error('Error during Redis cleanup:', error);
    }
  }

  /**
   * Get Redis statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.client.info();
      const dbSize = await this.client.dbsize();

      return {
        connected: this.isConnected,
        dbSize,
        info: info.split('\r\n').reduce((acc: any, line: string) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error('Error retrieving Redis stats:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      console.log('✅ Redis service disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting Redis:', error);
    }
  }

  /**
   * Get the Redis client (for advanced operations)
   */
  getClient(): Redis {
    return this.client;
  }
}
