// src/domaine/farmEv.test.ts

import { describe, expect, it } from "vitest";
import type { Apparition } from "../types/apparitions.ts";
import { TAG_PARTOUT } from "./apparitions.ts";
import { sourcesPartout, spotsDeFarm } from "./farmEv.ts";

const JUNGLE = "#cobblemon:is_jungle";
const PLAINE = "#cobblemon:is_plains";

function apparition(biomes: string[], options: Partial<Apparition> = {}): Apparition {
  return {
    rarete: "common",
    niveaux: "5-20",
    position: "grounded",
    contextes: ["natural"],
    biomes,
    biomesExclus: [],
    structures: [],
    blocsProches: [],
    ...options,
  };
}

const apparitions: Record<string, Apparition[]> = {
  rapide: [apparition([JUNGLE]), apparition([PLAINE], { rarete: "rare" })],
  tresRapide: [apparition([PLAINE])],
  nocturne: [apparition([JUNGLE], { moment: "night" })],
  partout: [apparition([TAG_PARTOUT])],
  aether: [apparition(["#aether:is_aether"])],
};

describe("spotsDeFarm", () => {
  const sources = [
    { slug: "rapide", ev: 1 },
    { slug: "tresRapide", ev: 2 },
    { slug: "nocturne", ev: 1 },
    { slug: "partout", ev: 3 },
    { slug: "aether", ev: 3 },
    { slug: "sansEv", ev: 0 },
  ];

  it("classe les biomes par EV rapportés pondérés par la rareté", () => {
    const spots = spotsDeFarm(sources, apparitions, null);
    expect(spots.map((s) => [s.biome, s.score])).toEqual([
      [PLAINE, 2 * 4 + 1 * 2],
      [JUNGLE, 1 * 4 + 1 * 4],
    ]);
    expect(spots[0]?.presences.map((p) => p.slug)).toEqual(["tresRapide", "rapide"]);
  });

  it("écarte de jour les Pokémon qui n'apparaissent que la nuit", () => {
    const jungle = spotsDeFarm(sources, apparitions, "jour").find((s) => s.biome === JUNGLE);
    expect(jungle?.presences.map((p) => p.slug)).toEqual(["rapide"]);
  });

  it("met à part les Pokémon visibles partout", () => {
    expect(sourcesPartout(sources, apparitions, null)).toEqual([{ slug: "partout", ev: 3 }]);
  });
});
