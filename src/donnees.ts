// src/donnees.ts

import donneesBrutes from "./data/pokedex.json";
import type { Traductions } from "./domaine/conditionsEvolution.ts";
import type { EspecePokemon, PokedexGenere } from "./types/pokedex.ts";

/* Fichier généré par scripts/generate-pokedex.ts : ne pas l'éditer à la main. */
const pokedex: PokedexGenere = donneesBrutes;

export const ESPECES: readonly EspecePokemon[] = pokedex.especes;
export const NOMS_OBJETS: Readonly<Record<string, string>> = pokedex.objets;
export const NOMS_CAPACITES: Readonly<Record<string, string>> = pokedex.capacites;
export const NOMS_TYPES: Readonly<Record<string, string>> = pokedex.types;

export const ESPECES_PAR_SLUG: ReadonlyMap<string, EspecePokemon> = new Map(
  ESPECES.map((espece) => [espece.slug, espece]),
);

export const GENERATIONS: readonly number[] = [...new Set(ESPECES.map((e) => e.generation))].sort(
  (a, b) => a - b,
);

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
  ESPECES.map((espece) => [
    espece.slug,
    normaliserRecherche(`${espece.nomFr} ${espece.nomEn} ${espece.id}`),
  ]),
);

export function urlSprite(id: number): string {
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
