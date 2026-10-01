// scripts/generate-cobblemon.ts

/*
 * Génère src/data/cobblemon.json depuis les fichiers species de Cobblemon :
 * espèces implémentées, étiquettes (legendary, starter...) et évolutions propres au mod.
 *
 * Usage : npm run generate:cobblemon
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { CobblemonGenere, EspeceCobblemon } from "../src/types/cobblemon.ts";
import type { PokedexGenere } from "../src/types/pokedex.ts";
import { fichiersJsonCobblemon, RACINE_PROJET, VERSION_COBBLEMON } from "./cobblemon/archive.ts";
import {
  convertirEspecesCobblemon,
  schemaEspeceCobblemonFichier,
  type EspeceCobblemonFichier,
} from "./cobblemon/especes.ts";
import { cleEspece } from "./cobblemon/parse.ts";

const FICHIER_POKEDEX = join(RACINE_PROJET, "src", "data", "pokedex.json");
const FICHIER_SORTIE = join(RACINE_PROJET, "src", "data", "cobblemon.json");
const DOSSIER_CACHE_POKEAPI = join(RACINE_PROJET, ".cache", "pokeapi");
const URL_POKEAPI = "https://pokeapi.co/api/v2";

const schemaRessourceTraduite = z.object({
  name: z.string(),
  names: z.array(z.object({ name: z.string(), language: z.object({ name: z.string() }) })),
});
const schemaListe = z.object({ results: z.array(z.object({ name: z.string() })) });

/** Requête PokeAPI mise en cache (même dossier que generate-pokedex), null si absente (404). */
async function pokeapi(chemin: string): Promise<unknown> {
  const cache = join(
    DOSSIER_CACHE_POKEAPI,
    `${chemin.replaceAll("/", "_").replaceAll("?", "_")}.json`,
  );
  try {
    return JSON.parse(await readFile(cache, "utf8"));
  } catch {
    /* Absent du cache : téléchargement. */
  }
  const reponse = await fetch(`${URL_POKEAPI}/${chemin}/`);
  if (reponse.status === 404) return null;
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status} sur ${chemin}`);
  const corps: unknown = await reponse.json();
  await mkdir(DOSSIER_CACHE_POKEAPI, { recursive: true });
  await writeFile(cache, JSON.stringify(corps));
  return corps;
}

async function nomFrancais(chemin: string): Promise<string | null> {
  const donnees = await pokeapi(chemin);
  if (donnees === null) return null;
  const ressource = schemaRessourceTraduite.parse(donnees);
  return ressource.names.find((n) => n.language.name === "fr")?.name ?? null;
}

/** Noms français des objets cités par les évolutions ("cobblemon:metal_coat" -> "Peau Métal"). */
async function traduireObjets(
  especes: Record<string, EspeceCobblemon>,
): Promise<Record<string, string>> {
  const identifiants = new Set<string>();
  for (const espece of Object.values(especes)) {
    for (const evolution of espece.evolutions) {
      if (evolution.mode === "item_interact" && evolution.contexte)
        identifiants.add(evolution.contexte);
      for (const condition of evolution.conditions) {
        if (typeof condition["itemCondition"] === "string")
          identifiants.add(condition["itemCondition"]);
      }
    }
  }
  const objets: Record<string, string> = {};
  for (const identifiant of [...identifiants].sort()) {
    if (!identifiant.startsWith("cobblemon:")) continue;
    const slug = identifiant.slice("cobblemon:".length).replaceAll("_", "-");
    const nom = await nomFrancais(`item/${slug}`);
    if (nom) objets[identifiant] = nom;
  }
  return objets;
}

/** Noms français des capacités citées ("ancientpower" -> "Pouvoir Antique"). */
async function traduireCapacites(
  especes: Record<string, EspeceCobblemon>,
): Promise<Record<string, string>> {
  const identifiants = new Set<string>();
  for (const espece of Object.values(especes)) {
    for (const evolution of espece.evolutions) {
      for (const condition of evolution.conditions) {
        if (typeof condition["move"] === "string") identifiants.add(condition["move"]);
      }
    }
  }
  const liste = schemaListe.parse(await pokeapi("move?limit=2000"));
  const slugParCle = new Map(liste.results.map((m) => [cleEspece(m.name), m.name]));
  const capacites: Record<string, string> = {};
  for (const identifiant of [...identifiants].sort()) {
    const slug = slugParCle.get(cleEspece(identifiant));
    const nom = slug ? await nomFrancais(`move/${slug}`) : null;
    if (nom) capacites[identifiant] = nom;
  }
  return capacites;
}

async function generer(): Promise<void> {
  const fichiers: EspeceCobblemonFichier[] = [];
  for (const chemin of await fichiersJsonCobblemon("species")) {
    const resultat = schemaEspeceCobblemonFichier.safeParse(
      JSON.parse(await readFile(chemin, "utf8")),
    );
    if (!resultat.success) {
      throw new Error(`Fichier d'espèce inattendu : ${chemin}\n${resultat.error.message}`);
    }
    fichiers.push(resultat.data);
  }

  const pokedex = JSON.parse(await readFile(FICHIER_POKEDEX, "utf8")) as PokedexGenere;
  const slugParCle = new Map(pokedex.especes.map((e) => [cleEspece(e.slug), e.slug]));
  const { parEspece, inconnues } = convertirEspecesCobblemon(fichiers, slugParCle);

  if (inconnues.length > 0) {
    process.stdout.write(
      `Attention : espèces Cobblemon sans correspondance : ${inconnues.join(", ")}\n`,
    );
  }

  const sortie: CobblemonGenere = {
    versionCobblemon: VERSION_COBBLEMON,
    genereLe: new Date().toISOString(),
    parEspece,
    objets: await traduireObjets(parEspece),
    capacites: await traduireCapacites(parEspece),
  };
  await writeFile(FICHIER_SORTIE, `${JSON.stringify(sortie)}\n`);
  const implementees = Object.values(parEspece).filter((e) => e.implementee).length;
  process.stdout.write(
    `${fichiers.length} espèces lues (${implementees} implémentées) écrites dans src/data/cobblemon.json\n`,
  );
}

await generer();
