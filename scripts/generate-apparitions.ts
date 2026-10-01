// scripts/generate-apparitions.ts

/*
 * Génère src/data/apparitions.json depuis les fichiers spawn_pool_world de Cobblemon
 * (dépôt officiel GitLab). L'archive du dossier est téléchargée en une requête,
 * mise en cache dans .cache/cobblemon/, puis extraite avec `tar`.
 *
 * Les apparitions de groupe ("herds") ne sont pas reprises.
 *
 * Usage : npm run generate:apparitions
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PokedexGenere } from "../src/types/pokedex.ts";
import type { ApparitionsGenerees } from "../src/types/apparitions.ts";
import {
  cleEspece,
  regrouperParEspece,
  schemaFichierApparitions,
  type FichierApparitions,
} from "./cobblemon/parse.ts";

/* Version du serveur inconnue : dernière version publiée de Cobblemon. */
const VERSION_COBBLEMON = "1.8.1";
const CHEMIN_DOSSIER = "common/src/main/resources/data/cobblemon/spawn_pool_world";
const URL_ARCHIVE = `https://gitlab.com/api/v4/projects/cable-mc%2Fcobblemon/repository/archive.tar.gz?sha=${VERSION_COBBLEMON}&path=${CHEMIN_DOSSIER}`;

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER_CACHE = join(RACINE, ".cache", "cobblemon", VERSION_COBBLEMON);
const NOM_ARCHIVE = "spawn_pool_world.tar.gz";
const FICHIER_POKEDEX = join(RACINE, "src", "data", "pokedex.json");
const FICHIER_SORTIE = join(RACINE, "src", "data", "apparitions.json");

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

async function telechargerArchive(): Promise<void> {
  await mkdir(DOSSIER_CACHE, { recursive: true });
  const cheminArchive = join(DOSSIER_CACHE, NOM_ARCHIVE);
  if (!existsSync(cheminArchive)) {
    await writeFile(cheminArchive, await telechargerAvecReessais(URL_ARCHIVE));
  }
  /* Extraction depuis le dossier de cache : évite les chemins absolus Windows, mal gérés par certains tar. */
  execFileSync("tar", ["-xzf", NOM_ARCHIVE], { cwd: DOSSIER_CACHE });
}

async function listerJson(dossier: string): Promise<string[]> {
  const entrees = await readdir(dossier, { withFileTypes: true, recursive: true });
  return entrees
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => join(e.parentPath, e.name))
    .filter((chemin) => chemin.replaceAll("\\", "/").includes("spawn_pool_world/"))
    .filter((chemin) => !chemin.replaceAll("\\", "/").includes("/herds/"))
    .sort();
}

async function generer(): Promise<void> {
  await telechargerArchive();

  const fichiers: FichierApparitions[] = [];
  for (const chemin of await listerJson(DOSSIER_CACHE)) {
    const resultat = schemaFichierApparitions.safeParse(JSON.parse(await readFile(chemin, "utf8")));
    if (!resultat.success) {
      throw new Error(`Fichier d'apparition inattendu : ${chemin}\n${resultat.error.message}`);
    }
    fichiers.push(resultat.data);
  }

  const pokedex = JSON.parse(await readFile(FICHIER_POKEDEX, "utf8")) as PokedexGenere;
  const slugParCle = new Map(pokedex.especes.map((e) => [cleEspece(e.slug), e.slug]));
  const { parEspece, inconnues } = regrouperParEspece(fichiers, slugParCle);

  if (inconnues.length > 0) {
    process.stdout.write(`Attention : espèces Cobblemon sans correspondance : ${inconnues.join(", ")}\n`);
  }

  const sortie: ApparitionsGenerees = {
    versionCobblemon: VERSION_COBBLEMON,
    genereLe: new Date().toISOString(),
    parEspece,
  };
  await writeFile(FICHIER_SORTIE, `${JSON.stringify(sortie)}\n`);
  process.stdout.write(
    `${fichiers.length} fichiers lus, ${Object.keys(parEspece).length} espèces avec apparitions écrites dans src/data/apparitions.json\n`,
  );
}

await generer();
