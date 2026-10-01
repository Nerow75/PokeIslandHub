// vite.config.ts

/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  /*
   * Port fixe : la progression vit dans le localStorage, propre à chaque origine.
   * Changer de port ferait apparaître une sauvegarde vide.
   */
  server: { port: 5173, strictPort: true },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
