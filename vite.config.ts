// vite.config.ts

/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { pluginSauvegarde } from "./serveur/pluginSauvegarde.ts";

/*
 * Dossier gitignoré contenant la sauvegarde du joueur et son historique.
 * POKEISLANDHUB_DONNEES permet de pointer ailleurs (essais sans toucher à la vraie sauvegarde).
 */
const DOSSIER_DONNEES_JOUEUR =
  process.env["POKEISLANDHUB_DONNEES"] ?? fileURLToPath(new URL("./donnees", import.meta.url));

/*
 * Mode "portable" (npm run build:portable) : un seul bundle, ressources inlinées,
 * chemins relatifs. scripts/construire-portable.ts en fait un fichier HTML unique
 * qui s'ouvre d'un double-clic, sans serveur.
 */
const BUILD_PORTABLE = {
  base: "./",
  build: {
    outDir: "dist-portable",
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    rolldownOptions: { output: { codeSplitting: false } },
  },
} as const;

export default defineConfig(({ mode }) => ({
  plugins: [react(), pluginSauvegarde(DOSSIER_DONNEES_JOUEUR)],
  ...(mode === "portable" ? BUILD_PORTABLE : {}),
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "serveur/**/*.test.ts"],
  },
}));
