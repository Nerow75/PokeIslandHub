// src/domaine/plantations.test.ts

import { describe, expect, it } from "vitest";
import { bilanPlantations, definirQuantite, QUANTITE_PLANTS_MAX } from "./plantations.ts";

describe("definirQuantite", () => {
  it("ajoute, modifie puis retire une plante à zéro", () => {
    const avec = definirQuantite({}, "cobblemon:red_apricorn", 8);
    expect(avec).toEqual({ "cobblemon:red_apricorn": 8 });
    expect(definirQuantite(avec, "cobblemon:red_apricorn", 3)).toEqual({
      "cobblemon:red_apricorn": 3,
    });
    expect(definirQuantite(avec, "cobblemon:red_apricorn", 0)).toEqual({});
  });

  it("borne et arrondit une saisie hors limites", () => {
    expect(definirQuantite({}, "minecraft:wheat", -4)).toEqual({});
    expect(definirQuantite({}, "minecraft:wheat", 2.6)).toEqual({ "minecraft:wheat": 3 });
    expect(definirQuantite({}, "minecraft:wheat", 1e9)).toEqual({
      "minecraft:wheat": QUANTITE_PLANTS_MAX,
    });
    expect(definirQuantite({ "minecraft:wheat": 5 }, "minecraft:wheat", Number.NaN)).toEqual({});
  });
});

describe("bilanPlantations", () => {
  it("compte plants et variétés parmi les identifiants donnés", () => {
    const plantations = { a: 4, b: 2, autre: 10 };
    expect(bilanPlantations(plantations, ["a", "b", "c"])).toEqual({ plants: 6, varietes: 2 });
  });
});
