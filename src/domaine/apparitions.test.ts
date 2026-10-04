// src/domaine/apparitions.test.ts

import { describe, expect, it } from "vitest";
import type { Apparition } from "../types/apparitions.ts";
import {
  apparaitAuMoment,
  apparaitDansBiome,
  apparaitIci,
  apparitionLaPlusFacile,
  biomesConnus,
  libelleRepere,
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

describe("repères et filtres d'apparition", () => {
  const nuit = { ...base, moment: "night" };
  const partout = { ...base, rarete: "uncommon" as const, biomes: [TAG_PARTOUT] };

  it("accepte au moment voulu les apparitions sans contrainte et le crépuscule", () => {
    expect(apparaitAuMoment(base, "jour")).toBe(true);
    expect(apparaitAuMoment(nuit, "jour")).toBe(false);
    expect(apparaitAuMoment({ ...base, moment: "dusk" }, "nuit")).toBe(true);
  });

  it("trouve une espèce dans un biome, y compris via une apparition partout", () => {
    expect(apparaitIci([nuit], "#cobblemon:is_jungle", "nuit")).toBe(true);
    expect(apparaitIci([nuit], "#cobblemon:is_jungle", "jour")).toBe(false);
    expect(apparaitIci([partout], "#cobblemon:is_desert", null)).toBe(true);
    expect(apparaitIci([], null, null)).toBe(false);
  });

  it("résume l'apparition la plus facile en une ligne", () => {
    const repere = apparitionLaPlusFacile([
      { ...base, rarete: "rare" },
      partout,
      { ...nuit, rarete: "uncommon" },
    ]);
    expect(repere).toEqual({ biome: "#cobblemon:is_jungle", moment: "night", rarete: "uncommon" });
    expect(repere && libelleRepere(repere)).toBe("Jungle, nuit, peu commun");
    expect(apparitionLaPlusFacile([{ ...base, biomes: ["#aether:is_aether"] }])).toBeNull();
    const double = { ...base, biomes: ["#cobblemon:is_freshwater", "#cobblemon:is_jungle"] };
    expect(apparitionLaPlusFacile([double], "#cobblemon:is_jungle")?.biome).toBe(
      "#cobblemon:is_jungle",
    );
  });

  it("liste les biomes connus sans partout ni mods tiers", () => {
    const biomes = biomesConnus({
      a: [base, partout],
      b: [{ ...base, biomes: ["#cobblemon:is_desert", "#aether:is_aether"] }],
    });
    expect(biomes).toEqual(["#cobblemon:is_desert", "#cobblemon:is_jungle"]);
  });
});
