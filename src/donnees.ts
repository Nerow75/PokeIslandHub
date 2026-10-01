// src/donnees.ts

import donneesBrutes from "./data/pokedex.json";
import type { EspecePokemon, PokedexGenere } from "./types/pokedex.ts";

/* Fichier généré par scripts/generate-pokedex.ts : ne pas l'éditer à la main. */
const pokedex: PokedexGenere = donneesBrutes;

export const ESPECES: readonly EspecePokemon[] = pokedex.especes;
export const NOMS_OBJETS: Readonly<Record<string, string>> = pokedex.objets;

export const ESPECES_PAR_SLUG: ReadonlyMap<string, EspecePokemon> = new Map(
  ESPECES.map((espece) => [espece.slug, espece]),
);

export const GENERATIONS: readonly number[] = [...new Set(ESPECES.map((e) => e.generation))].sort(
  (a, b) => a - b,
);

/** Minuscules, sans accents ni ponctuation : "Mr. Mime" et "mr mime" se valent. */
export function normaliserRecherche(texte: string): string {
  return texte
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
