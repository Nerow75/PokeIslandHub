// src/donnees.ts

import { ENTREES_SERVEUR, NOMBRE_ENTREES_NON_IDENTIFIEES } from "./data/entreesServeur.ts";
import donneesCobblemon from "./data/cobblemon.json";
import donneesBrutes from "./data/pokedex.json";
import { estAspectAffichable } from "./domaine/apparitions.ts";
import type { EvolutionAffichee } from "./domaine/evolutionsAFaire.ts";
import {
  decrireEvolutionCobblemon,
  niveauEvolutionCobblemon,
  type TraductionsCobblemon,
} from "./domaine/evolutionsCobblemon.ts";
import { cleEspece } from "./domaine/identifiants.ts";
import { schemaCobblemonGenere } from "./domaine/schemaCobblemon.ts";
import type { EspeceCobblemon } from "./types/cobblemon.ts";
import type { EspecePokemon, PokedexGenere } from "./types/pokedex.ts";

/* Fichier généré par scripts/generate-pokedex.ts : ne pas l'éditer à la main. */
const pokedex: PokedexGenere = donneesBrutes;

/** Les 1025 espèces officielles, issues de PokeAPI. */
export const ESPECES: readonly EspecePokemon[] = pokedex.especes;
export const NOMS_TYPES: Readonly<Record<string, string>> = pokedex.types;

/** Pseudo-génération regroupant les entrées propres au serveur. */
export const GENERATION_SERVEUR = 0;

/**
 * Entrées propres au serveur, présentées comme des espèces sans données de jeu
 * (pas de types, d'EV ni d'évolutions connus).
 */
const ESPECES_SERVEUR: readonly EspecePokemon[] = ENTREES_SERVEUR.map((entree) => ({
  id: entree.numero,
  slug: `serveur-${entree.numero}`,
  nomFr: entree.nomFr ?? `Inconnu #${entree.numero}`,
  nomEn: entree.nomEn ?? "",
  generation: GENERATION_SERVEUR,
  types: [],
  evRapportes: {
    pv: 0,
    attaque: 0,
    defense: 0,
    attaqueSpeciale: 0,
    defenseSpeciale: 0,
    vitesse: 0,
  },
  evolueDe: null,
  evolutions: [],
  estLegendaire: false,
  estFabuleux: false,
}));

/** Toutes les entrées du Pokédex du serveur : espèces officielles puis entrées propres. */
export const ENTREES_POKEDEX: readonly EspecePokemon[] = [...ESPECES, ...ESPECES_SERVEUR];

/** Total du Pokédex du serveur, utilisé par défaut pour la complétion. */
export const TOTAL_POKEDEX_SERVEUR = ENTREES_POKEDEX.length + NOMBRE_ENTREES_NON_IDENTIFIEES;

export function estEntreeServeur(espece: EspecePokemon): boolean {
  return espece.generation === GENERATION_SERVEUR;
}

export const ESPECES_PAR_SLUG: ReadonlyMap<string, EspecePokemon> = new Map(
  ENTREES_POKEDEX.map((espece) => [espece.slug, espece]),
);

/** Générations officielles, dans l'ordre. */
export const GENERATIONS: readonly number[] = [...new Set(ESPECES.map((e) => e.generation))].sort(
  (a, b) => a - b,
);

export function libelleGeneration(generation: number): string {
  return generation === GENERATION_SERVEUR ? "Serveur" : String(generation);
}

/**
 * Minuscules, sans accents ni ponctuation : "Mr. Mime" et "mr mime" se valent.
 * Les symboles de sexe sont conservés sous forme de lettre pour distinguer les deux Nidoran.
 */
export function normaliserRecherche(texte: string): string {
  return texte
    .replaceAll("♀", " f")
    .replaceAll("♂", " m")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Texte de recherche précalculé par espèce : noms FR, EN et numéro. */
export const INDEX_RECHERCHE: ReadonlyMap<string, string> = new Map(
  ENTREES_POKEDEX.map((espece) => [
    espece.slug,
    normaliserRecherche(`${espece.nomFr} ${espece.nomEn} ${espece.id}`),
  ]),
);

/** Sprite PokeAPI, ou null pour une entrée propre au serveur. */
export function urlSprite(espece: EspecePokemon): string | null {
  if (estEntreeServeur(espece)) {
    return null;
  }
  const id = espece.id;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

/** Nom français ou anglais normalisé -> espèce, pour la saisie libre de noms. */
export const ESPECE_PAR_NOM_NORMALISE: ReadonlyMap<string, EspecePokemon> = (() => {
  const index = new Map<string, EspecePokemon>();
  for (const espece of ESPECES) {
    for (const nom of [espece.nomFr, espece.nomEn]) {
      const cle = normaliserRecherche(nom);
      if (!index.has(cle)) {
        index.set(cle, espece);
      }
    }
  }
  return index;
})();

/* Données Cobblemon (évolutions du mod, étiquettes), générées par scripts/generate-cobblemon.ts. */
const resultatCobblemon = schemaCobblemonGenere.safeParse(donneesCobblemon);
if (!resultatCobblemon.success) {
  throw new Error("src/data/cobblemon.json invalide : relancer npm run generate:cobblemon.");
}
export const COBBLEMON = resultatCobblemon.data;

export function especeCobblemon(slug: string): EspeceCobblemon | undefined {
  return COBBLEMON.parEspece[slug];
}

const SLUG_PAR_CLE: ReadonlyMap<string, string> = new Map(
  ESPECES.map((espece) => [cleEspece(espece.slug), espece.slug]),
);

/** Slug PokeAPI d'un identifiant Cobblemon ("mrmime" -> "mr-mime"). */
export function slugDepuisCobblemon(identifiant: string): string | undefined {
  return SLUG_PAR_CLE.get(cleEspece(identifiant));
}

export const TRADUCTIONS_COBBLEMON: TraductionsCobblemon = {
  objets: COBBLEMON.objets,
  capacites: COBBLEMON.capacites,
  types: NOMS_TYPES,
  especes: (identifiant) => {
    const slug = slugDepuisCobblemon(identifiant);
    return (slug && ESPECES_PAR_SLUG.get(slug)?.nomFr) || identifiant;
  },
};

/**
 * Évolutions directes d'une espèce selon Cobblemon, décrites en français.
 * Les variantes qui ne diffèrent que par un détail cosmétique sont fusionnées.
 */
export function evolutionsAffichees(slug: string): EvolutionAffichee[] {
  const parEmpreinte = new Map<string, EvolutionAffichee>();
  for (const evolution of especeCobblemon(slug)?.evolutions ?? []) {
    const affichee: EvolutionAffichee = {
      vers: evolution.vers,
      niveau: niveauEvolutionCobblemon(evolution),
      description: decrireEvolutionCobblemon(evolution, TRADUCTIONS_COBBLEMON),
    };
    if (evolution.aspectDepart && estAspectAffichable(evolution.aspectDepart)) {
      affichee.aspectDepart = evolution.aspectDepart;
    }
    if (evolution.aspectObtenu && estAspectAffichable(evolution.aspectObtenu)) {
      affichee.aspectObtenu = evolution.aspectObtenu;
    }
    parEmpreinte.set(JSON.stringify(affichee), affichee);
  }
  return [...parEmpreinte.values()];
}

let parentsParEspece: Map<string, { depuis: string; evolution: EvolutionAffichee }[]> | null = null;

/** Espèces dont celle-ci évolue selon Cobblemon, avec l'évolution correspondante. */
export function evolutionsVers(slug: string): { depuis: string; evolution: EvolutionAffichee }[] {
  if (!parentsParEspece) {
    parentsParEspece = new Map();
    for (const espece of ESPECES) {
      for (const evolution of evolutionsAffichees(espece.slug)) {
        const liste = parentsParEspece.get(evolution.vers) ?? [];
        liste.push({ depuis: espece.slug, evolution });
        parentsParEspece.set(evolution.vers, liste);
      }
    }
  }
  return parentsParEspece.get(slug) ?? [];
}
