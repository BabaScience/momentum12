import Redis from 'ioredis';
import { env } from './env.js';

let redisClient: Redis | null = null;

export const connectRedis = async (): Promise<Redis> => {
  if (redisClient) {
    return redisClient;
  }
  
  redisClient = new Redis(env.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) {
        console.error('❌ Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    lazyConnect: true,
  });
  
  redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });
  
  redisClient.on('error', (error) => {
    console.error('❌ Redis connection error:', error.message);
  });
  
  redisClient.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });
  
  try {
    await redisClient.connect();
  } catch (error) {
    console.warn('⚠️ Redis connection failed, continuing without caching:', error);
  }
  
  return redisClient;
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Redis disconnected gracefully');
  }
};

// Cache helper functions
export const cacheSet = async (key: string, value: unknown, ttlSeconds?: number): Promise<void> => {
  if (!redisClient) return;
  
  const stringValue = JSON.stringify(value);
  if (ttlSeconds) {
    await redisClient.setex(key, ttlSeconds, stringValue);
  } else {
    await redisClient.set(key, stringValue);
  }
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!redisClient) return null;
  
  const value = await redisClient.get(key);
  if (!value) return null;
  
  return JSON.parse(value) as T;
};

export const cacheDelete = async (key: string): Promise<void> => {
  if (!redisClient) return;
  await redisClient.del(key);
};

export const cacheClear = async (pattern: string): Promise<void> => {
  if (!redisClient) return;
  
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
};

