import Redis from "ioredis";
import { env } from "./env.js";

let instance: Redis | null = null;
let limiterInstance: Redis | null = null;

export const getRedis = (): Redis => {
  if (instance) return instance;

  instance = new Redis(env.REDIS_URL, {
    tls: env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: null,
    lazyConnect: false,
    enableReadyCheck: true,
    /*
      Exponential backoff capped at 30 seconds so unreachable Redis hosts
      do not flood the console or DNS resolver.
    */
    retryStrategy: (times: number) => Math.min(times * 2000, 30000),
  });

  instance.on("connect", () => console.log("Redis connected"));
  instance.on("error", (err: Error) => console.error("Redis error:", err.message));

  return instance;
};

/*
  Connection for rate limiting only. BullMQ needs commands that wait
  for Redis to come back, but a web request must not wait, so this one
  fails within seconds and the limiter falls back to memory.
*/
export const getLimiterRedis = (): Redis => {
  if (limiterInstance) return limiterInstance;

  limiterInstance = new Redis(env.REDIS_URL, {
    tls: env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    commandTimeout: 2000,
    retryStrategy: (times: number) => Math.min(times * 2000, 30000),
  });

  limiterInstance.on("error", (err: Error) =>
    console.error("Rate limiter Redis error:", err.message)
  );

  return limiterInstance;
};
