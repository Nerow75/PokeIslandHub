// scripts/generate-strategie.ts

/*
 * Génère src/data/strategie.json : tier Smogon de chaque espèce, sets recommandés
 * (capacités, talent, objet, nature, EV, IV) et statistiques d'usage Showdown.
 *
 * Sources :
 * - API Coup Critique (https://www.coupcritique.fr/api) : tiers, usages, noms français ;
 * - sets Smogon publiés par pkmn (https://pkmn.github.io/smogon/data/sets/).
 *
 * Usage : npm run generate:strategie
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import type { PokedexGenere } from "../src/types/pokedex.ts";
import type {
  NatureStrategie,
  StatCombat,
  StrategieEspece,
  StrategieGeneree,
} from "../src/types/strategie.ts";
import { RACINE_PROJET } from "./cobblemon/archive.ts";
import { cleEspece } from "./cobblemon/parse.ts";
import {
  choisirSets,
  choisirTiers,
  convertirUsage,
  objetsDeFormeSpeciale,
  schemaDetailCoupCritique,
  schemaFichierSetsSmogon,
  schemaListePokemonCoupCritique,
  schemaListeTraduite,
  schemaNaturesCoupCritique,
  schemaTypesCoupCritique,
  tableEfficacites,
  tableTraductions,
  TIER_NON_CLASSE,
} from "./strategie/parse.ts";

const FICHIER_POKEDEX = join(RACINE_PROJET, "src", "data", "pokedex.json");
const FICHIER_SORTIE = join(RACINE_PROJET, "src", "data", "strategie.json");
const DOSSIER_CACHE = join(RACINE_PROJET, ".cache", "strategie");
const URL_COUP_CRITIQUE = "https://www.coupcritique.fr/api";
const URL_SETS_SMOGON = "https://pkmn.github.io/smogon/data/sets";
const GENERATIONS = [9, 8, 7, 6, 5, 4, 3, 2, 1] as const;
/* Pause entre deux requêtes non mises en cache, pour ménager le site de Coup Critique. */
const PAUSE_REQUETE_MS = 200;
const TENTATIVES_MAX = 3;

async function telecharger(url: string): Promise<unknown> {
  let derniereErreur: unknown;
  for (let tentative = 1; tentative <= TENTATIVES_MAX; tentative++) {
    try {
      const reponse = await fetch(url);
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status} sur ${url}`);
      return await reponse.json();
    } catch (erreur) {
      derniereErreur = erreur;
      await new Promise((resoudre) => setTimeout(resoudre, 2000 * tentative));
    }
  }
  throw derniereErreur;
}

/** Requête JSON mise en cache dans .cache/strategie/. */
async function lireJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const cache = join(DOSSIER_CACHE, `${url.replace(/^https:\/\//, "").replace(/[^a-z0-9.]+/gi, "_")}.json`);
  let brut: unknown;
  try {
    brut = JSON.parse(await readFile(cache, "utf8"));
  } catch {
    await new Promise((resoudre) => setTimeout(resoudre, PAUSE_REQUETE_MS));
    brut = await telecharger(url);
    await mkdir(DOSSIER_CACHE, { recursive: true });
    await writeFile(cache, JSON.stringify(brut));
  }
  const resultat = schema.safeParse(brut);
  if (!resultat.success) {
    throw new Error(`Réponse inattendue de ${url}\n${resultat.error.message}`);
  }
  return resultat.data;
}

const STATS_DE_NATURE = ["atk", "def", "spa", "spd", "spe"] as const satisfies readonly StatCombat[];

async function lireNatures(): Promise<Record<string, NatureStrategie>> {
  const { natures } = await lireJson(`${URL_COUP_CRITIQUE}/natures`, schemaNaturesCoupCritique);
  const table: Record<string, NatureStrategie> = {};
  for (const nature of natures) {
    table[nature.name] = {
      nomFr: nature.nom ?? nature.name,
      hausse: STATS_DE_NATURE.find((stat) => nature[stat] === 1) ?? null,
      baisse: STATS_DE_NATURE.find((stat) => nature[stat] === -1) ?? null,
    };
  }
  return table;
}

async function lireTraductions(
  cle: "moves" | "items" | "abilities",
): Promise<Record<string, string>> {
  const listes = [];
  for (const generation of GENERATIONS) {
    const donnees = await lireJson(
      `${URL_COUP_CRITIQUE}/${cle}?gen=${generation}`,
      schemaListeTraduite(cle),
    );
    listes.push(donnees[cle] ?? []);
  }
  return tableTraductions(listes);
}

async function generer(): Promise<void> {
  const pokedex = JSON.parse(await readFile(FICHIER_POKEDEX, "utf8")) as PokedexGenere;
  const slugParCle = new Map(pokedex.especes.map((e) => [cleEspece(e.slug), e.slug]));

  const listesParGeneration = [];
  for (const generation of GENERATIONS) {
    const { pokemons } = await lireJson(
      `${URL_COUP_CRITIQUE}/pokemons?gen=${generation}`,
      schemaListePokemonCoupCritique,
    );
    listesParGeneration.push({ generation, pokemons });
  }
  const tiers = choisirTiers(listesParGeneration, slugParCle);

  const fichiersSets = [];
  for (const generation of GENERATIONS) {
    const sets = await lireJson(`${URL_SETS_SMOGON}/gen${generation}.json`, schemaFichierSetsSmogon);
    fichiersSets.push({ generation, sets });
  }
  const objets = await lireTraductions("items");
  const objetsInterdits = objetsDeFormeSpeciale(
    listesParGeneration.map((l) => l.pokemons),
    Object.keys(objets),
  );
  const sets = choisirSets(
    fichiersSets,
    slugParCle,
    (slug) => tiers.get(slug)?.tier ?? null,
    objetsInterdits,
  );

  const parEspece: Record<string, StrategieEspece> = {};
  let nombreUsages = 0;
  for (const espece of pokedex.especes) {
    const tier = tiers.get(espece.slug);
    let usage = null;
    /* Les statistiques d'usage n'existent qu'en génération 9, pour les Pokémon classés. */
    if (tier && tier.generation === 9 && tier.tier !== TIER_NON_CLASSE) {
      const detail = await lireJson(
        `${URL_COUP_CRITIQUE}/pokemons/${tier.idCoupCritique}`,
        schemaDetailCoupCritique,
      );
      usage = convertirUsage(detail, tier.tier);
      if (usage) nombreUsages++;
    }
    const setsEspece = sets.get(espece.slug) ?? [];
    if (!tier && setsEspece.length === 0) continue;
    parEspece[espece.slug] = {
      tier: tier?.tier ?? null,
      generationTier: tier?.generation ?? null,
      usage,
      sets: setsEspece,
    };
  }

  const { types } = await lireJson(`${URL_COUP_CRITIQUE}/types`, schemaTypesCoupCritique);
  const sortie: StrategieGeneree = {
    genereLe: new Date().toISOString(),
    parEspece,
    efficacites: tableEfficacites(types),
    traductions: {
      capacites: await lireTraductions("moves"),
      objets,
      talents: await lireTraductions("abilities"),
      types: tableTraductions([types]),
    },
    natures: await lireNatures(),
  };
  await writeFile(FICHIER_SORTIE, `${JSON.stringify(sortie)}\n`);

  const sansDonnees = pokedex.especes.filter((e) => !parEspece[e.slug]).map((e) => e.slug);
  const avecSets = Object.values(parEspece).filter((s) => s.sets.length > 0).length;
  process.stdout.write(
    `${Object.keys(parEspece).length} espèces (${tiers.size} avec tier, ${avecSets} avec sets, ${nombreUsages} avec usage) écrites dans src/data/strategie.json\n`,
  );
  if (sansDonnees.length > 0) {
    process.stdout.write(`Sans aucune donnée : ${sansDonnees.join(", ")}\n`);
  }
}

await generer();
