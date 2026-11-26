import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// jsdom gives the tests a browser like document and window
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
