import Redis from "ioredis";
import { env } from "./env.js";

let instance: Redis | null = null;

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
