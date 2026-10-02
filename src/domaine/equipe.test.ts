// src/domaine/equipe.test.ts

import { describe, expect, it } from "vitest";
import {
  basculerEpingle,
  basculerExclusion,
  bilanDefensif,
  choixEquipeVide,
  classerParForce,
  multiplicateurSubi,
  proposerEquipe,
  rangTier,
  type CandidatEquipe,
  type TableEfficacites,
} from "./equipe.ts";

/* Extrait de la table des types : assez pour distinguer des équipes équilibrées ou non. */
const efficacites: TableEfficacites = {
  ice: { dragon: 2, ground: 2, flying: 2, water: 0.5, steel: 0.5, fire: 0.5 },
  electric: { water: 2, flying: 2, ground: 0, dragon: 0.5, electric: 0.5 },
  fire: { steel: 2, water: 0.5, dragon: 0.5, fire: 0.5 },
  ground: { steel: 2, fire: 2, electric: 2, flying: 0 },
  water: { fire: 2, ground: 2, water: 0.5, dragon: 0.5 },
};

function candidat(
  slug: string,
  tier: string | null,
  types: string[],
  options: Partial<CandidatEquipe> = {},
): CandidatEquipe {
  return { slug, tier, types, pourcentageUsage: 0, famille: slug, ...options };
}

describe("rangTier", () => {
  it("place Uber avant OU, les BL entre deux tiers et l'inconnu en dernier", () => {
    expect(rangTier("Uber")).toBeLessThan(rangTier("OU"));
    expect(rangTier("UUBL")).toBeGreaterThan(rangTier("OU"));
    expect(rangTier("UUBL")).toBeLessThan(rangTier("UU"));
    expect(rangTier(null)).toBeGreaterThan(rangTier("LC"));
  });
});

describe("classerParForce", () => {
  it("trie par tier puis par usage", () => {
    const classes = classerParForce([
      candidat("a", "UU", []),
      candidat("b", "OU", [], { pourcentageUsage: 3 }),
      candidat("c", "OU", [], { pourcentageUsage: 20 }),
    ]);
    expect(classes.map((c) => c.slug)).toEqual(["c", "b", "a"]);
  });
});

describe("multiplicateurSubi", () => {
  it("multiplie les efficacités de chaque type", () => {
    expect(multiplicateurSubi(["dragon", "ground"], "ice", efficacites)).toBe(4);
    expect(multiplicateurSubi(["water", "ground"], "electric", efficacites)).toBe(0);
  });
});

describe("proposerEquipe", () => {
  it("prend les plus forts, un par famille, sans les non évolués", () => {
    const equipe = proposerEquipe(
      [
        candidat("gabite", "NFE", ["dragon", "ground"], { famille: "gible" }),
        candidat("garchomp", "OU", ["dragon", "ground"], { famille: "gible" }),
        candidat("garchomp-bis", "OU", ["dragon", "ground"], { famille: "gible" }),
        candidat("kyogre", "Uber", ["water"]),
        candidat("rattata", "LC", ["normal"]),
      ],
      choixEquipeVide(),
      efficacites,
    );
    expect(equipe.map((c) => c.slug)).toEqual(["kyogre", "garchomp"]);
  });

  it("préfère, à tier égal, un membre qui ne cumule pas une faiblesse déjà présente", () => {
    const equipe = proposerEquipe(
      [
        candidat("garchomp", "OU", ["dragon", "ground"]),
        candidat("salamence", "UU", ["dragon", "flying"]),
        candidat("scizor", "UU", ["steel"]),
      ],
      choixEquipeVide(),
      efficacites,
    );
    expect(equipe.map((c) => c.slug).slice(0, 2)).toEqual(["garchomp", "scizor"]);
  });

  it("garde les épinglés, même non évolués, et ignore les exclus", () => {
    const equipe = proposerEquipe(
      [
        candidat("kyogre", "Uber", ["water"]),
        candidat("pikachu", "NFE", ["electric"]),
        candidat("garchomp", "OU", ["dragon", "ground"]),
      ],
      { epingles: ["pikachu", "inconnu"], exclus: ["kyogre"] },
      efficacites,
    );
    expect(equipe.map((c) => c.slug)).toEqual(["pikachu", "garchomp"]);
  });

  it("s'arrête à six membres", () => {
    const candidats = Array.from({ length: 9 }, (_, i) => candidat(`p${i}`, "OU", ["water"]));
    expect(proposerEquipe(candidats, choixEquipeVide(), efficacites)).toHaveLength(6);
  });
});

describe("bilanDefensif", () => {
  it("compte faiblesses et résistances par type attaquant", () => {
    const bilan = bilanDefensif([{ types: ["dragon", "ground"] }, { types: ["water"] }], efficacites);
    expect(bilan.find((b) => b.typeAttaquant === "ice")).toEqual({
      typeAttaquant: "ice",
      multiplicateurs: [4, 0.5],
      faibles: 1,
      resistants: 1,
    });
  });
});

describe("choix du joueur", () => {
  it("épingler retire des exclus, exclure retire des épinglés", () => {
    const epingle = basculerEpingle({ epingles: [], exclus: ["mew"] }, "mew");
    expect(epingle).toEqual({ epingles: ["mew"], exclus: [] });
    expect(basculerExclusion(epingle, "mew")).toEqual({ epingles: [], exclus: ["mew"] });
  });

  it("refuse un septième épinglé", () => {
    const plein = { epingles: ["a", "b", "c", "d", "e", "f"], exclus: [] };
    expect(basculerEpingle(plein, "g")).toBe(plein);
  });
});
