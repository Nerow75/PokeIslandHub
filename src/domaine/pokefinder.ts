// src/domaine/pokefinder.ts

import type { EspecePokemon } from "../types/pokedex.ts";

/*
 * Champ "Espèce" du PokéFinder : noms anglais séparés par ", "
 * (format confirmé, voir tasks/glossary.md).
 */
export const SEPARATEUR_POKEFINDER = ", ";

/** Nombre maximal d'espèces acceptées par le champ "Espèce" en jeu (constaté). */
export const MAX_ESPECES_PAR_CHAMP = 26;

export interface ResolutionNoms {
  especes: EspecePokemon[];
  /** Saisies qui ne correspondent à aucune espèce. */
  inconnus: string[];
}

/**
 * Retrouve les espèces à partir d'une saisie libre (noms FR ou EN, séparés par
 * virgules, points-virgules ou retours à la ligne). Les doublons sont ignorés.
 */
export function resoudreNoms(
  saisie: string,
  especeParNomNormalise: ReadonlyMap<string, EspecePokemon>,
  normaliser: (texte: string) => string,
): ResolutionNoms {
  const especes: EspecePokemon[] = [];
  const inconnus: string[] = [];
  const dejaVus = new Set<string>();
  for (const morceau of saisie.split(/[,;\n]+/)) {
    const nom = morceau.trim();
    if (!nom) {
      continue;
    }
    const espece = especeParNomNormalise.get(normaliser(nom));
    if (!espece) {
      inconnus.push(nom);
    } else if (!dejaVus.has(espece.slug)) {
      dejaVus.add(espece.slug);
      especes.push(espece);
    }
  }
  return { especes, inconnus };
}

export function chaineEspeces(especes: readonly EspecePokemon[]): string {
  return especes.map((espece) => espece.nomEn).join(SEPARATEUR_POKEFINDER);
}

/**
 * Noms anglais contenant autre chose que des lettres (Mr. Mime, Nidoran♀, Farfetch’d...) :
 * leur écriture côté Cobblemon n'est pas confirmée.
 */
export function estNomAVerifier(espece: EspecePokemon): boolean {
  return !/^[A-Za-z]+$/.test(espece.nomEn);
}

export function decouperEnLots<T>(elements: readonly T[], taille: number): T[][] {
  if (taille <= 0) {
    return [elements.slice()];
  }
  const lots: T[][] = [];
  for (let debut = 0; debut < elements.length; debut += taille) {
    lots.push(elements.slice(debut, debut + taille));
  }
  return lots;
}
