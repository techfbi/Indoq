import { defineConfig } from "vitest/config";

/*
  Tests never touch the network. The env values below only let the
  config module load, no real service is ever contacted.
*/
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      SUPABASE_URL: "http://localhost:54321",
      SUPABASE_ANON_KEY: "test-anon",
      SUPABASE_SERVICE_ROLE_KEY: "test-service",
      SUPABASE_JWT_SECRET: "test-secret",
      REDIS_URL: "redis://localhost:6379",
      GROQ_API_KEY: "test-groq",
      OPENAI_API_KEY: "test-openai",
    },
  },
});
