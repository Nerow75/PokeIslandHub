// scripts/generate-pokedex.ts

/*
 * Génère src/data/pokedex.json depuis PokeAPI.
 * Les réponses brutes sont mises en cache dans .cache/pokeapi/ : une relance
 * ne retélécharge que ce qui manque. Supprimer ce dossier force un rafraîchissement.
 *
 * Usage : npm run generate:pokedex
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import type { EspecePokemon, Evolution, PokedexGenere } from "../src/types/pokedex.ts";
import {
  construireEspece,
  evolutionsParEspece,
  nomDansLangue,
  objetsDeLaChaine,
  schemaChaineEvolutionApi,
  schemaEspeceApi,
  referencesATraduire,
  schemaRessourceTraduiteApi,
  schemaPokemonApi,
  slugVarieteParDefaut,
  type ChaineEvolutionApi,
} from "./pokeapi/parse.ts";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER_CACHE = join(RACINE, ".cache", "pokeapi");
const FICHIER_SORTIE = join(RACINE, "src", "data", "pokedex.json");
const URL_API = "https://pokeapi.co/api/v2";
const NOMBRE_ESPECES = 1025;
const REQUETES_SIMULTANEES = 8;
const TENTATIVES_MAX = 3;

function cheminCache(url: string): string {
  const relatif = url
    .replace(URL_API, "")
    .replace(/^\/|\/$/g, "")
    .replaceAll("/", "_");
  return join(DOSSIER_CACHE, `${relatif}.json`);
}

async function telecharger(url: string): Promise<unknown> {
  const chemin = cheminCache(url);
  try {
    return JSON.parse(await readFile(chemin, "utf8"));
  } catch {
    /* Absent du cache : téléchargement. */
  }
  let derniereErreur: unknown;
  for (let tentative = 1; tentative <= TENTATIVES_MAX; tentative++) {
    try {
      const reponse = await fetch(url);
      if (!reponse.ok) {
        throw new Error(`HTTP ${reponse.status} sur ${url}`);
      }
      const corps: unknown = await reponse.json();
      await writeFile(chemin, JSON.stringify(corps));
      return corps;
    } catch (erreur) {
      derniereErreur = erreur;
      await new Promise((resoudre) => setTimeout(resoudre, 1000 * tentative));
    }
  }
  throw derniereErreur;
}

async function recuperer<S extends z.ZodType>(url: string, schema: S): Promise<z.infer<S>> {
  const resultat = schema.safeParse(await telecharger(url));
  if (!resultat.success) {
    throw new Error(`Réponse inattendue pour ${url} :\n${resultat.error.message}`);
  }
  return resultat.data;
}

/** Applique `traiter` à chaque élément avec un nombre borné de requêtes simultanées. */
async function enParallele<E, R>(
  elements: E[],
  traiter: (element: E) => Promise<R>,
  libelle: string,
): Promise<R[]> {
  const resultats: R[] = new Array<R>(elements.length);
  let prochain = 0;
  let termines = 0;
  const ouvrier = async (): Promise<void> => {
    while (prochain < elements.length) {
      const index = prochain++;
      resultats[index] = await traiter(elements[index] as E);
      termines++;
      if (termines % 100 === 0 || termines === elements.length) {
        process.stdout.write(`\r${libelle} : ${termines}/${elements.length}`);
      }
    }
  };
  await Promise.all(Array.from({ length: REQUETES_SIMULTANEES }, ouvrier));
  process.stdout.write("\n");
  return resultats;
}

/** Récupère le nom français de chaque ressource (objet, capacité, type), à défaut l'anglais. */
async function traduire(
  slugs: Set<string>,
  ressource: string,
  libelle: string,
): Promise<Record<string, string>> {
  const reponses = await enParallele(
    [...slugs].sort(),
    (slug) => recuperer(`${URL_API}/${ressource}/${slug}/`, schemaRessourceTraduiteApi),
    libelle,
  );
  const noms: Record<string, string> = {};
  for (const reponse of reponses) {
    noms[reponse.name] =
      nomDansLangue(reponse.names, "fr") ?? nomDansLangue(reponse.names, "en") ?? reponse.name;
  }
  return noms;
}

async function generer(): Promise<void> {
  await mkdir(DOSSIER_CACHE, { recursive: true });

  const ids = Array.from({ length: NOMBRE_ESPECES }, (_, i) => i + 1);
  const especesApi = await enParallele(
    ids,
    (id) => recuperer(`${URL_API}/pokemon-species/${id}/`, schemaEspeceApi),
    "Espèces",
  );

  const pokemonsApi = await enParallele(
    especesApi,
    (espece) => recuperer(`${URL_API}/pokemon/${slugVarieteParDefaut(espece)}/`, schemaPokemonApi),
    "Pokémon",
  );

  const urlsChaines = [
    ...new Set(especesApi.flatMap((e) => (e.evolution_chain ? [e.evolution_chain.url] : []))),
  ];
  const chaines: ChaineEvolutionApi[] = await enParallele(
    urlsChaines,
    (url) => recuperer(url, schemaChaineEvolutionApi),
    "Chaînes d'évolution",
  );

  const evolutions = new Map<string, Evolution[]>();
  const slugsObjets = new Set<string>();
  for (const chaine of chaines) {
    for (const [slug, liste] of evolutionsParEspece(chaine)) {
      evolutions.set(slug, liste);
    }
    for (const objet of objetsDeLaChaine(chaine)) {
      slugsObjets.add(objet);
    }
  }

  const especes: EspecePokemon[] = especesApi.map((espece, index) =>
    construireEspece(espece, pokemonsApi[index]!, evolutions.get(espece.name) ?? []),
  );
  const { capacites, types } = referencesATraduire(especes);

  const objets = await traduire(slugsObjets, "item", "Objets");
  const nomsCapacites = await traduire(capacites, "move", "Capacités");
  const nomsTypes = await traduire(types, "type", "Types");

  const sansNomFr = especesApi.filter((e) => !nomDansLangue(e.names, "fr"));
  if (sansNomFr.length > 0) {
    process.stdout.write(
      `Attention : ${sansNomFr.length} espèce(s) sans nom français, nom anglais utilisé : ${sansNomFr
        .map((e) => e.name)
        .join(", ")}\n`,
    );
  }

  const pokedex: PokedexGenere = {
    genereLe: new Date().toISOString(),
    especes,
    objets,
    capacites: nomsCapacites,
    types: nomsTypes,
  };
  await mkdir(dirname(FICHIER_SORTIE), { recursive: true });
  await writeFile(FICHIER_SORTIE, `${JSON.stringify(pokedex)}\n`);
  process.stdout.write(`${especes.length} espèces écrites dans src/data/pokedex.json\n`);
}

await generer();
