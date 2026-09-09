import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./test/setup.ts"] },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "./__mocks__/server-only.ts"),
      "next/font/google": path.resolve(__dirname, "./__mocks__/next/font/google.ts"),
    },
  },
});
