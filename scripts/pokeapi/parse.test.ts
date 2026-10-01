// scripts/pokeapi/parse.test.ts

import { describe, expect, it } from "vitest";
import chaineEvoli from "../__fixtures__/chaine-evoli.json" with { type: "json" };
import especeEvoli from "../__fixtures__/espece-evoli.json" with { type: "json" };
import pokemonEvoli from "../__fixtures__/pokemon-evoli.json" with { type: "json" };
import {
  construireEspece,
  evolutionsParEspece,
  idDepuisUrl,
  objetsDeLaChaine,
  schemaChaineEvolutionApi,
  schemaEspeceApi,
  schemaPokemonApi,
  slugVarieteParDefaut,
} from "./parse.ts";

/* Fixtures : réponses PokeAPI réelles pour Évoli, réduites aux champs utilisés. */
const espece = schemaEspeceApi.parse(especeEvoli);
const pokemon = schemaPokemonApi.parse(pokemonEvoli);
const chaine = schemaChaineEvolutionApi.parse(chaineEvoli);

describe("idDepuisUrl", () => {
  it("extrait l'identifiant final d'une URL PokeAPI", () => {
    expect(idDepuisUrl("https://pokeapi.co/api/v2/generation/4/")).toBe(4);
  });

  it("rejette une URL sans identifiant", () => {
    expect(() => idDepuisUrl("https://pokeapi.co/api/v2/generation/")).toThrow();
  });
});

describe("construireEspece", () => {
  const evolutions = evolutionsParEspece(chaine).get("eevee") ?? [];
  const evoli = construireEspece(espece, pokemon, evolutions);

  it("reprend l'identité et les noms FR / EN", () => {
    expect(evoli).toMatchObject({
      id: 133,
      slug: "eevee",
      nomFr: "Évoli",
      nomEn: "Eevee",
      generation: 1,
      types: ["normal"],
      evolueDe: null,
      estLegendaire: false,
    });
  });

  it("extrait les EV rapportés", () => {
    expect(evoli.evRapportes).toEqual({
      pv: 0,
      attaque: 0,
      defense: 0,
      attaqueSpeciale: 0,
      defenseSpeciale: 1,
      vitesse: 0,
    });
  });

  it("utilise la variété par défaut pour les stats", () => {
    expect(slugVarieteParDefaut(espece)).toBe("eevee");
  });
});

describe("evolutionsParEspece", () => {
  const evolutions = evolutionsParEspece(chaine);
  const depuisEvoli = evolutions.get("eevee") ?? [];

  it("liste les huit évolutions d'Évoli", () => {
    expect(depuisEvoli.map((e) => e.vers)).toEqual([
      "vaporeon",
      "jolteon",
      "flareon",
      "espeon",
      "umbreon",
      "leafeon",
      "glaceon",
      "sylveon",
    ]);
  });

  it("traduit une évolution par objet", () => {
    expect(depuisEvoli.find((e) => e.vers === "vaporeon")?.conditions).toEqual([
      { declencheur: "use-item", objet: "water-stone" },
    ]);
  });

  it("traduit une évolution par bonheur selon le moment de la journée", () => {
    expect(depuisEvoli.find((e) => e.vers === "espeon")?.conditions).toEqual([
      { declencheur: "level-up", bonheurMin: 160, momentDeLaJournee: "day" },
    ]);
  });

  it("ne duplique pas une condition répétée entre versions de jeu", () => {
    const conditions = depuisEvoli.find((e) => e.vers === "leafeon")?.conditions ?? [];
    const empreintes = conditions.map((c) => JSON.stringify(c));
    expect(new Set(empreintes).size).toBe(empreintes.length);
    expect(conditions).toContainEqual({ declencheur: "use-item", objet: "leaf-stone" });
  });

  it("donne une liste vide aux formes finales", () => {
    expect(evolutions.get("vaporeon")).toEqual([]);
  });
});

describe("objetsDeLaChaine", () => {
  it("collecte les pierres d'évolution", () => {
    const objets = objetsDeLaChaine(chaine);
    expect(objets).toContain("water-stone");
    expect(objets).toContain("leaf-stone");
  });
});
