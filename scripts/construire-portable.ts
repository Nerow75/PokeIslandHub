// scripts/construire-portable.ts

/*
 * Construit dist-portable/PokeIslandHub.html : l'application entière (code, styles,
 * polices, données) dans un seul fichier, à ouvrir d'un double-clic sans serveur ni
 * installation. Sans serveur de dev, la progression vit dans le navigateur
 * (export / import JSON pour la sauvegarder ou la transférer).
 *
 * Usage : npm run build:portable
 */

import { execSync } from "node:child_process";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { RACINE_PROJET } from "./cobblemon/archive.ts";

const DOSSIER_SORTIE = join(RACINE_PROJET, "dist-portable");
const FICHIER_FINAL = join(DOSSIER_SORTIE, "PokeIslandHub.html");

/* Un "</script" dans le code inliné fermerait la balise : il est neutralisé. */
function echapperScript(code: string): string {
  return code.replaceAll("</script", "<\\/script");
}

async function construire(): Promise<void> {
  execSync("npx vite build --mode portable", { cwd: RACINE_PROJET, stdio: "inherit" });

  const fichiers = await readdir(join(DOSSIER_SORTIE, "assets"));
  const script = fichiers.find((f) => f.endsWith(".js"));
  const styles = fichiers.filter((f) => f.endsWith(".css"));
  if (!script || fichiers.filter((f) => f.endsWith(".js")).length !== 1) {
    throw new Error(`Un seul fichier JS attendu dans dist-portable/assets : ${fichiers.join(", ")}`);
  }

  let html = await readFile(join(DOSSIER_SORTIE, "index.html"), "utf8");
  const code = await readFile(join(DOSSIER_SORTIE, "assets", script), "utf8");
  const css = (
    await Promise.all(styles.map((f) => readFile(join(DOSSIER_SORTIE, "assets", f), "utf8")))
  ).join("\n");
  const favicon = await readFile(join(DOSSIER_SORTIE, "favicon.svg"));

  html = html
    .replace(/<script type="module"[^>]*src="[^"]*"><\/script>/, () => "")
    .replace(/<link rel="stylesheet"[^>]*>/g, () => "")
    .replace(
      /href="[^"]*favicon\.svg"/,
      () => `href="data:image/svg+xml;base64,${favicon.toString("base64")}"`,
    )
    .replace("</head>", () => `<style>\n${css}\n</style>\n</head>`)
    .replace(
      "</body>",
      () => `<script type="module">\n${echapperScript(code)}\n</script>\n</body>`,
    );
  if (html.includes("./assets/")) {
    throw new Error("Une ressource externe reste référencée dans le HTML portable.");
  }

  await writeFile(FICHIER_FINAL, html);
  for (const entree of await readdir(DOSSIER_SORTIE)) {
    if (join(DOSSIER_SORTIE, entree) !== FICHIER_FINAL) {
      await rm(join(DOSSIER_SORTIE, entree), { recursive: true });
    }
  }
  const taille = (Buffer.byteLength(html) / 1024 / 1024).toFixed(1);
  process.stdout.write(`dist-portable/PokeIslandHub.html écrit (${taille} Mo)\n`);
}

await construire();
