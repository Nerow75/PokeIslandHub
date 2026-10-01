// src/domaine/apparitions.test.ts

import { describe, expect, it } from "vitest";
import type { Apparition } from "../types/apparitions.ts";
import {
  apparaitDansBiome,
  conditionsApparition,
  libelleBiome,
  libelleIdentifiant,
  meilleureRarete,
  TAG_PARTOUT,
} from "./apparitions.ts";

const base: Apparition = {
  rarete: "common",
  niveaux: "5-20",
  position: "grounded",
  contextes: ["natural"],
  biomes: ["#cobblemon:is_jungle"],
  biomesExclus: [],
  structures: [],
  blocsProches: [],
};

describe("libellés", () => {
  it("traduit les biomes connus", () => {
    expect(libelleBiome("#cobblemon:is_jungle")).toBe("Jungle");
  });

  it("rend lisible un identifiant inconnu au lieu de le masquer", () => {
    expect(libelleIdentifiant("#cobblemon:nether/is_soul_sand")).toBe("nether soul sand");
    expect(libelleBiome("#mod:is_crystal_cave")).toBe("crystal cave (mod)");
  });
});

describe("conditionsApparition", () => {
  it("décrit moment, météo et couverture", () => {
    expect(
      conditionsApparition({ ...base, moment: "night", pluie: true, cielVisible: false }),
    ).toEqual(["la nuit", "sous la pluie", "à couvert ou sous terre"]);
  });

  it("ne mentionne pas les contextes ordinaires", () => {
    expect(conditionsApparition(base)).toEqual([]);
  });

  it("décrit les structures et la phase de lune", () => {
    expect(
      conditionsApparition({ ...base, structures: ["#minecraft:village"], phaseLune: "0" }),
    ).toEqual(["pleine lune", "dans : village"]);
  });
});

describe("apparaitDansBiome", () => {
  it("retient le biome demandé", () => {
    expect(apparaitDansBiome(base, "#cobblemon:is_jungle", false)).toBe(true);
    expect(apparaitDansBiome(base, "#cobblemon:is_desert", false)).toBe(false);
  });

  it("n'inclut les apparitions de toute la Surface que sur demande", () => {
    const partout = { ...base, biomes: [TAG_PARTOUT] };
    expect(apparaitDansBiome(partout, "#cobblemon:is_desert", false)).toBe(false);
    expect(apparaitDansBiome(partout, "#cobblemon:is_desert", true)).toBe(true);
  });

  it("respecte les biomes exclus", () => {
    const partoutSaufOcean = {
      ...base,
      biomes: [TAG_PARTOUT],
      biomesExclus: ["#cobblemon:is_ocean"],
    };
    expect(apparaitDansBiome(partoutSaufOcean, "#cobblemon:is_ocean", true)).toBe(false);
  });
});

describe("meilleureRarete", () => {
  it("retient la rareté la plus courante", () => {
    expect(
      meilleureRarete([
        { ...base, rarete: "rare" },
        { ...base, rarete: "uncommon" },
      ]),
    ).toBe("uncommon");
    expect(meilleureRarete([])).toBeNull();
  });
});
