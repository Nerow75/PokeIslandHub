// src/domaine/chasse.ts

import type { Apparition, Rarete } from "../types/apparitions.ts";
import { estBiomeDeBase, POIDS_RARETE, TAG_PARTOUT } from "./apparitions.ts";

/*
 * Chasse du serveur : capturer en une heure les six Pokémon imposés.
 * Ce module classe les biomes où en trouver le plus à la fois.
 */

export const NOMBRE_POKEMON_CHASSE = 6;
export const DUREE_CHASSE_MS = 60 * 60 * 1000;

export interface Chasse {
  especes: string[];
  capturees: string[];
  debut: string | null;
}

export function chasseVide(): Chasse {
  return { especes: [], capturees: [], debut: null };
}

export interface PresenceDansBiome {
  slug: string;
  /** Meilleure rareté de l'espèce dans ce biome. */
  rarete: Rarete;
}

export interface BiomeDeChasse {
  biome: string;
  presences: PresenceDansBiome[];
  score: number;
}

/** Meilleure rareté de chaque biome cité par les apparitions d'une espèce. */
function raretesParBiome(apparitions: readonly Apparition[]): Map<string, Rarete> {
  const parBiome = new Map<string, Rarete>();
  for (const apparition of apparitions) {
    for (const biome of apparition.biomes) {
      const actuelle = parBiome.get(biome);
      if (!actuelle || POIDS_RARETE[apparition.rarete] > POIDS_RARETE[actuelle]) {
        parBiome.set(biome, apparition.rarete);
      }
    }
  }
  return parBiome;
}

/**
 * Classe les biomes selon le nombre de Pokémon de la chasse qu'on peut y croiser,
 * pondéré par leur rareté. Les apparitions "partout" ne comptent pas comme un biome :
 * elles sont valables quel que soit l'endroit. Les biomes de mods tiers (Aether...),
 * probablement absents du serveur, sont écartés.
 */
export function classerBiomesDeChasse(
  slugs: readonly string[],
  apparitionsParEspece: Readonly<Record<string, readonly Apparition[]>>,
): BiomeDeChasse[] {
  const parBiome = new Map<string, PresenceDansBiome[]>();
  for (const slug of slugs) {
    for (const [biome, rarete] of raretesParBiome(apparitionsParEspece[slug] ?? [])) {
      if (biome === TAG_PARTOUT || !estBiomeDeBase(biome)) continue;
      const presences = parBiome.get(biome) ?? [];
      presences.push({ slug, rarete });
      parBiome.set(biome, presences);
    }
  }
  return [...parBiome]
    .map(([biome, presences]) => ({
      biome,
      presences: presences.sort((a, b) => POIDS_RARETE[b.rarete] - POIDS_RARETE[a.rarete]),
      score: presences.reduce((total, p) => total + POIDS_RARETE[p.rarete], 0),
    }))
    .sort(
      (a, b) =>
        b.presences.length - a.presences.length ||
        b.score - a.score ||
        a.biome.localeCompare(b.biome),
    );
}

/** Espèces de la chasse visibles partout en Surface, quel que soit le biome. */
export function especesPresentesPartout(
  slugs: readonly string[],
  apparitionsParEspece: Readonly<Record<string, readonly Apparition[]>>,
): string[] {
  return slugs.filter((slug) =>
    (apparitionsParEspece[slug] ?? []).some((a) => a.biomes.includes(TAG_PARTOUT)),
  );
}

/** Temps restant en millisecondes, jamais négatif. */
export function tempsRestant(debut: string, maintenant: Date): number {
  const fin = new Date(debut).getTime() + DUREE_CHASSE_MS;
  return Math.max(0, fin - maintenant.getTime());
}

/** "42:07" pour 42 minutes et 7 secondes. */
export function formaterDuree(millisecondes: number): string {
  const secondes = Math.ceil(millisecondes / 1000);
  const minutes = Math.floor(secondes / 60);
  return `${String(minutes).padStart(2, "0")}:${String(secondes % 60).padStart(2, "0")}`;
}

/** Début de chasse tel qu'il reste exactement `restantMs` à partir de `maintenant`. */
export function debutPourTempsRestant(restantMs: number, maintenant: Date): string {
  const borne = Math.min(Math.max(restantMs, 0), DUREE_CHASSE_MS);
  return new Date(maintenant.getTime() + borne - DUREE_CHASSE_MS).toISOString();
}

/**
 * Lit une durée saisie à la main : "42:07", "42" (minutes) ou "0:30".
 * Retourne des millisecondes, ou null si la saisie est invalide ou dépasse une heure.
 */
export function lireDuree(saisie: string): number | null {
  const correspondance = /^\s*(\d{1,2})(?::(\d{1,2}))?\s*$/.exec(saisie);
  if (!correspondance) return null;
  const minutes = Number(correspondance[1]);
  const secondes = Number(correspondance[2] ?? 0);
  if (secondes > 59) return null;
  const total = (minutes * 60 + secondes) * 1000;
  return total <= DUREE_CHASSE_MS ? total : null;
}
