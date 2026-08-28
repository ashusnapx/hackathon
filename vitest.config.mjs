import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    env: {
      TZ: "Asia/Kolkata",
    },
  },
});
