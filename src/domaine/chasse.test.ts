// src/domaine/chasse.test.ts

import { describe, expect, it } from "vitest";
import type { Apparition } from "../types/apparitions.ts";
import { TAG_PARTOUT } from "./apparitions.ts";
import {
  classerBiomesDeChasse,
  especesPresentesPartout,
  formaterDuree,
  tempsRestant,
} from "./chasse.ts";

function apparition(rarete: Apparition["rarete"], biomes: string[]): Apparition {
  return {
    rarete,
    niveaux: "5-20",
    position: "grounded",
    contextes: ["natural"],
    biomes,
    biomesExclus: [],
    structures: [],
    blocsProches: [],
  };
}

const JUNGLE = "#cobblemon:is_jungle";
const FORET = "#cobblemon:is_forest";
const DESERT = "#cobblemon:is_desert";

const apparitions: Record<string, Apparition[]> = {
  pikachu: [apparition("uncommon", [FORET, JUNGLE])],
  caterpie: [apparition("common", [FORET]), apparition("rare", [JUNGLE])],
  sandshrew: [apparition("common", [DESERT])],
  eevee: [apparition("uncommon", [TAG_PARTOUT])],
};

describe("classerBiomesDeChasse", () => {
  const classement = classerBiomesDeChasse(["pikachu", "caterpie", "sandshrew"], apparitions);

  it("place en tête le biome qui réunit le plus de Pokémon", () => {
    expect(classement.map((b) => b.biome)).toEqual([FORET, JUNGLE, DESERT]);
    expect(classement[0]?.presences.map((p) => p.slug)).toEqual(["caterpie", "pikachu"]);
  });

  it("départage à nombre égal par la rareté", () => {
    /* Forêt : commun + peu commun ; Jungle : peu commun + rare. */
    expect(classement[0]?.score).toBeGreaterThan(classement[1]?.score ?? 0);
  });

  it("retient la meilleure rareté d'une espèce dans un biome", () => {
    const jungle = classement.find((b) => b.biome === JUNGLE);
    expect(jungle?.presences.find((p) => p.slug === "caterpie")?.rarete).toBe("rare");
  });

  it("écarte les biomes de mods tiers", () => {
    const avecMod = { ...apparitions, munna: [apparition("common", ["#aether:is_aether"])] };
    expect(classerBiomesDeChasse(["munna"], avecMod)).toEqual([]);
  });

  it("ne compte pas les apparitions valables partout comme un biome", () => {
    expect(classerBiomesDeChasse(["eevee"], apparitions)).toEqual([]);
    expect(especesPresentesPartout(["eevee", "pikachu"], apparitions)).toEqual(["eevee"]);
  });
});

describe("minuteur", () => {
  const debut = "2026-10-01T14:00:00.000Z";

  it("décompte une heure depuis le début", () => {
    expect(formaterDuree(tempsRestant(debut, new Date("2026-10-01T14:17:53.000Z")))).toBe("42:07");
  });

  it("s'arrête à zéro", () => {
    expect(tempsRestant(debut, new Date("2026-10-01T16:00:00.000Z"))).toBe(0);
  });
});
