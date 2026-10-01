// src/donnees.ts

import { ENTREES_SERVEUR } from "./data/entreesServeur.ts";
import donneesBrutes from "./data/pokedex.json";
import type { Traductions } from "./domaine/conditionsEvolution.ts";
import type { EspecePokemon, PokedexGenere } from "./types/pokedex.ts";

/* Fichier généré par scripts/generate-pokedex.ts : ne pas l'éditer à la main. */
const pokedex: PokedexGenere = donneesBrutes;

/** Les 1025 espèces officielles, issues de PokeAPI. */
export const ESPECES: readonly EspecePokemon[] = pokedex.especes;
export const NOMS_OBJETS: Readonly<Record<string, string>> = pokedex.objets;
export const NOMS_CAPACITES: Readonly<Record<string, string>> = pokedex.capacites;
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

export const TRADUCTIONS: Traductions = {
  objets: NOMS_OBJETS,
  capacites: NOMS_CAPACITES,
  types: NOMS_TYPES,
  especes: (slug) => ESPECES_PAR_SLUG.get(slug)?.nomFr ?? slug,
};
