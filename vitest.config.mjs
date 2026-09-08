import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve("./src"),
      // See the file for why. Without this, no route that marks itself
      // server-only can be imported by a test.
      "server-only": path.resolve("./test/server-only-stub.ts"),
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
