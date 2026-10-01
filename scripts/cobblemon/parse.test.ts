// scripts/cobblemon/parse.test.ts

import { describe, expect, it } from "vitest";
import fichierEvoli from "../__fixtures__/apparitions-evoli.json" with { type: "json" };
import fichierMiaouss from "../__fixtures__/apparitions-miaouss.json" with { type: "json" };
import {
  cleEspece,
  decomposerPokemon,
  regrouperParEspece,
  schemaFichierApparitions,
} from "./parse.ts";

/* Fixtures : fichiers spawn_pool_world réels de Cobblemon 1.8.1. */
const evoli = schemaFichierApparitions.parse(fichierEvoli);
const miaouss = schemaFichierApparitions.parse(fichierMiaouss);
const slugParCle = new Map([
  [cleEspece("eevee"), "eevee"],
  [cleEspece("meowth"), "meowth"],
]);

describe("cleEspece", () => {
  it("rapproche les identifiants Cobblemon et PokeAPI", () => {
    expect(cleEspece("mrmime")).toBe(cleEspece("mr-mime"));
    expect(cleEspece("nidoranf")).toBe(cleEspece("nidoran-f"));
  });
});

describe("decomposerPokemon", () => {
  it("sépare l'espèce et l'aspect régional", () => {
    expect(decomposerPokemon("meowth galarian")).toEqual({ espece: "meowth", aspect: "galarian" });
  });

  it("ignore les propriétés cosmétiques clé=valeur", () => {
    expect(decomposerPokemon("ekans snake_pattern=classic")).toEqual({ espece: "ekans" });
  });
});

describe("regrouperParEspece", () => {
  const { parEspece, inconnues } = regrouperParEspece([evoli, miaouss], slugParCle);

  it("regroupe les apparitions sous le slug PokeAPI", () => {
    expect(Object.keys(parEspece)).toEqual(["eevee", "meowth"]);
    expect(inconnues).toEqual([]);
  });

  it("reprend rareté, niveaux et biomes", () => {
    expect(parEspece["eevee"]).toContainEqual(
      expect.objectContaining({
        rarete: "rare",
        niveaux: "5-33",
        biomes: ["#aether:is_aether", "#cobblemon:is_temperate"],
      }),
    );
  });

  it("trie du plus courant au plus rare", () => {
    const raretes = (parEspece["eevee"] ?? []).map((a) => a.rarete);
    expect(raretes[0]).toBe("uncommon");
    expect(raretes.at(-1)).toBe("ultra-rare");
  });

  it("conserve les biomes exclus", () => {
    const ultraRare = parEspece["eevee"]?.find((a) => a.rarete === "ultra-rare");
    expect(ultraRare?.biomesExclus).toEqual(["#cobblemon:is_ocean"]);
  });

  it("garde l'aspect des formes régionales", () => {
    const aspects = new Set((parEspece["meowth"] ?? []).map((a) => a.aspect));
    expect(aspects).toContain("galarian");
    expect(aspects).toContain("alolan");
  });

  it("signale les espèces sans correspondance", () => {
    expect(regrouperParEspece([evoli], new Map()).inconnues).toEqual(["eevee"]);
  });
});
