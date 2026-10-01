// src/donnees.test.ts

import { describe, expect, it } from "vitest";
import {
  ENTREES_POKEDEX,
  ESPECE_PAR_NOM_NORMALISE,
  ESPECES,
  ESPECES_PAR_SLUG,
  estEntreeServeur,
} from "./donnees.ts";

describe("entrées du Pokédex", () => {
  it("ajoute les 19 entrées du serveur aux 1025 espèces officielles", () => {
    expect(ESPECES).toHaveLength(1025);
    expect(ENTREES_POKEDEX.filter(estEntreeServeur).map((e) => e.id)).toEqual([
      9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009, 9010, 9011, 9012, 9013, 9014, 9015,
      9016, 9017, 9018, 9100,
    ]);
  });

  it("garde des slugs uniques, clés des sauvegardes", () => {
    expect(ESPECES_PAR_SLUG.size).toBe(ENTREES_POKEDEX.length);
  });

  it("n'expose pas les entrées serveur sans nom anglais au PokéFinder", () => {
    const especes = [...ESPECE_PAR_NOM_NORMALISE.values()];
    expect(especes.some(estEntreeServeur)).toBe(false);
  });
});
