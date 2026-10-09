// scripts/cobblemon/archive.ts

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Téléchargement de dossiers du dépôt officiel Cobblemon (GitLab), en une archive
 * par dossier, mise en cache dans .cache/cobblemon/<version>/ puis extraite avec `tar`.
 */

/* Version du serveur inconnue : dernière version publiée de Cobblemon. */
export const VERSION_COBBLEMON = "1.8.1";

export const RACINE_PROJET = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOSSIER_CACHE = join(RACINE_PROJET, ".cache", "cobblemon", VERSION_COBBLEMON);
const DOSSIER_DONNEES_DEPOT = "common/src/main/resources/data/cobblemon";
const TENTATIVES_MAX = 4;

/* GitLab répond parfois 406 ou 429 sous limitation de débit : quelques réessais espacés suffisent. */
async function telechargerAvecReessais(url: string): Promise<Buffer> {
  let derniereErreur: unknown;
  for (let tentative = 1; tentative <= TENTATIVES_MAX; tentative++) {
    try {
      const reponse = await fetch(url);
      if (!reponse.ok) {
        throw new Error(`HTTP ${reponse.status} sur ${url}`);
      }
      return Buffer.from(await reponse.arrayBuffer());
    } catch (erreur) {
      derniereErreur = erreur;
      await new Promise((resoudre) => setTimeout(resoudre, 5000 * tentative));
    }
  }
  throw derniereErreur;
}

/**
 * Télécharge (si absent du cache) et extrait un dossier de données Cobblemon,
 * ex. "species" ou "spawn_pool_world". Retourne les chemins de ses fichiers JSON.
 */
export async function fichiersJsonCobblemon(dossier: string): Promise<string[]> {
  await mkdir(DOSSIER_CACHE, { recursive: true });
  const nomArchive = `${dossier}.tar.gz`;
  const cheminArchive = join(DOSSIER_CACHE, nomArchive);
  if (!existsSync(cheminArchive)) {
    const url = `https://gitlab.com/api/v4/projects/cable-mc%2Fcobblemon/repository/archive.tar.gz?sha=${VERSION_COBBLEMON}&path=${DOSSIER_DONNEES_DEPOT}/${dossier}`;
    await writeFile(cheminArchive, await telechargerAvecReessais(url));
  }
  /* Extraction depuis le dossier de cache : évite les chemins absolus Windows, mal gérés par certains tar. */
  execFileSync("tar", ["-xzf", nomArchive], { cwd: DOSSIER_CACHE });

  const entrees = await readdir(DOSSIER_CACHE, { withFileTypes: true, recursive: true });
  return entrees
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => join(e.parentPath, e.name))
    .filter((chemin) => chemin.replaceAll("\\", "/").includes(`/data/cobblemon/${dossier}/`))
    .sort();
}

const DOSSIER_RESSOURCES_DEPOT = "common/src/main/resources";

/**
 * Télécharge (si absent du cache) un fichier du dépôt Cobblemon, chemin relatif à
 * common/src/main/resources (ex. "assets/cobblemon/lang/fr_fr.json"), et renvoie son texte.
 */
export async function fichierCobblemon(chemin: string): Promise<string> {
  await mkdir(DOSSIER_CACHE, { recursive: true });
  const cheminCache = join(DOSSIER_CACHE, chemin.replaceAll("/", "_"));
  if (!existsSync(cheminCache)) {
    const cheminDepot = encodeURIComponent(`${DOSSIER_RESSOURCES_DEPOT}/${chemin}`);
    const url = `https://gitlab.com/api/v4/projects/cable-mc%2Fcobblemon/repository/files/${cheminDepot}/raw?ref=${VERSION_COBBLEMON}`;
    await writeFile(cheminCache, await telechargerAvecReessais(url));
  }
  return readFile(cheminCache, "utf8");
}
