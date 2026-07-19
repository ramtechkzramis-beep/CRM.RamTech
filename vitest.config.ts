import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    // Тот же алиас, что и в tsconfig: без него тесты падают на импортах "@/lib/…"
    // (типы стираются при компиляции, а вот значения — нет).
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
