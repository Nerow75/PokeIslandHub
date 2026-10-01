// vite.config.ts

/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { pluginSauvegarde } from "./serveur/pluginSauvegarde.ts";

/* Dossier gitignoré contenant la sauvegarde du joueur et son historique. */
const DOSSIER_DONNEES_JOUEUR = fileURLToPath(new URL("./donnees", import.meta.url));

export default defineConfig({
  plugins: [react(), pluginSauvegarde(DOSSIER_DONNEES_JOUEUR)],
  /* Port fixe : la copie de secours du navigateur (localStorage) dépend de l'origine. */
  server: { port: 5173, strictPort: true },
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "serveur/**/*.test.ts"],
  },
});
