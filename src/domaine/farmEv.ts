// src/domaine/farmEv.ts

import type { Apparition, Rarete } from "../types/apparitions.ts";
import {
  apparaitAuMoment,
  estBiomeDeBase,
  POIDS_RARETE,
  TAG_PARTOUT,
  type MomentJournee,
} from "./apparitions.ts";

/*
 * Spots de farm d'EV : biomes où l'on croise le plus de Pokémon qui rapportent
 * des EV dans une statistique, pondérés par les EV rapportés et la rareté.
 */

export interface SourceEv {
  slug: string;
  /** EV rapportés dans la statistique visée. */
  ev: number;
}

export interface PresenceFarm {
  slug: string;
  ev: number;
  rarete: Rarete;
}

export interface SpotDeFarm {
  biome: string;
  presences: PresenceFarm[];
  score: number;
}

/**
 * Classe les biomes pour farmer une statistique : chaque Pokémon présent rapporte
 * ses EV multipliés par le poids de sa meilleure rareté dans le biome. Les apparitions
 * "partout" et les biomes de mods tiers ne forment pas un spot.
 */
export function spotsDeFarm(
  sources: readonly SourceEv[],
  apparitionsParEspece: Readonly<Record<string, readonly Apparition[]>>,
  moment: MomentJournee | null,
): SpotDeFarm[] {
  const parBiome = new Map<string, Map<string, PresenceFarm>>();
  for (const { slug, ev } of sources) {
    if (ev <= 0) continue;
    for (const apparition of apparitionsParEspece[slug] ?? []) {
      if (!apparaitAuMoment(apparition, moment)) continue;
      for (const biome of apparition.biomes) {
        if (biome === TAG_PARTOUT || !estBiomeDeBase(biome)) continue;
        const presences = parBiome.get(biome) ?? new Map<string, PresenceFarm>();
        const actuelle = presences.get(slug);
        if (!actuelle || POIDS_RARETE[apparition.rarete] > POIDS_RARETE[actuelle.rarete]) {
          presences.set(slug, { slug, ev, rarete: apparition.rarete });
        }
        parBiome.set(biome, presences);
      }
    }
  }
  return [...parBiome]
    .map(([biome, presences]) => {
      const liste = [...presences.values()].sort(
        (a, b) => b.ev * POIDS_RARETE[b.rarete] - a.ev * POIDS_RARETE[a.rarete],
      );
      return {
        biome,
        presences: liste,
        score: liste.reduce((total, p) => total + p.ev * POIDS_RARETE[p.rarete], 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.biome.localeCompare(b.biome));
}

/** Sources visibles partout en Surface au moment donné, à croiser quel que soit le biome. */
export function sourcesPartout(
  sources: readonly SourceEv[],
  apparitionsParEspece: Readonly<Record<string, readonly Apparition[]>>,
  moment: MomentJournee | null,
): SourceEv[] {
  return sources.filter(
    ({ slug, ev }) =>
      ev > 0 &&
      (apparitionsParEspece[slug] ?? []).some(
        (a) => a.biomes.includes(TAG_PARTOUT) && apparaitAuMoment(a, moment),
      ),
  );
}
