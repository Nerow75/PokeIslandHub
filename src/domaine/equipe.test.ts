// src/domaine/equipe.test.ts

import { describe, expect, it } from "vitest";
import {
  basculerEpingle,
  basculerExclusion,
  bilanDefensif,
  bilanOffensif,
  choixEquipeVide,
  classerParForce,
  evaluerEquipe,
  multiplicateurInflige,
  multiplicateurSubi,
  proposerEquipes,
  rangTier,
  suggererCaptures,
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
  return {
    slug,
    tier,
    types,
    typesAttaque: types,
    pourcentageUsage: 0,
    famille: slug,
    ...options,
  };
}

const slugs = (membres: readonly CandidatEquipe[]): string[] => membres.map((m) => m.slug);

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
    expect(slugs(classes)).toEqual(["c", "b", "a"]);
  });
});

describe("multiplicateurs", () => {
  it("multiplie les efficacités subies de chaque type", () => {
    expect(multiplicateurSubi(["dragon", "ground"], "ice", efficacites)).toBe(4);
    expect(multiplicateurSubi(["water", "ground"], "electric", efficacites)).toBe(0);
  });

  it("retient la meilleure attaque contre un type pur", () => {
    expect(multiplicateurInflige(["fire", "ground"], "steel", efficacites)).toBe(2);
    expect(multiplicateurInflige(["fire"], "water", efficacites)).toBe(0.5);
    expect(multiplicateurInflige([], "water", efficacites)).toBe(1);
  });
});

describe("evaluerEquipe", () => {
  it("relève les faiblesses partagées et les types mal couverts", () => {
    const evaluation = evaluerEquipe(
      [
        candidat("garchomp", "OU", ["dragon", "ground"]),
        candidat("salamence", "OU", ["dragon", "flying"]),
      ],
      efficacites,
    );
    expect(evaluation.faiblessesPartagees).toEqual(["ice"]);
    expect(evaluation.typesNonCouverts).toContain("water");
    expect(evaluation.typesNonCouverts).not.toContain("steel");
  });
});

describe("proposerEquipes", () => {
  it("prend les plus forts, un par famille, sans les non évolués", () => {
    const [meilleure] = proposerEquipes(
      [
        candidat("gabite", "NFE", ["dragon", "ground"], { famille: "gible" }),
        candidat("garchomp", "OU", ["dragon", "ground"], { famille: "gible" }),
        candidat("garchomp-bis", "OU", ["dragon", "ground"], {
          famille: "gible",
        }),
        candidat("kyogre", "Uber", ["water"]),
        candidat("rattata", "LC", ["normal"]),
      ],
      choixEquipeVide(),
      efficacites,
    );
    expect(slugs(meilleure?.membres ?? []).sort()).toEqual(["garchomp", "kyogre"]);
  });

  it("préfère, à tier égal, un membre qui ne cumule pas une faiblesse déjà présente", () => {
    const [meilleure] = proposerEquipes(
      [
        candidat("garchomp", "OU", ["dragon", "ground"]),
        candidat("salamence", "UU", ["dragon", "flying"]),
        candidat("scizor", "UU", ["steel"]),
      ],
      { epingles: [], exclus: [] },
      efficacites,
    );
    const membres = slugs(meilleure?.membres ?? []);
    expect(membres).toContain("scizor");
    expect(meilleure?.evaluation.faiblessesPartagees).not.toContain("electric");
  });

  it("préfère, à tier égal, le membre qui touche un type que l'équipe ne frappe pas", () => {
    const candidats = [
      candidat("lapras", "OU", ["water"], { typesAttaque: ["ice"] }),
      candidat("vaporeon", "UU", ["water"], { typesAttaque: ["water"] }),
      candidat("jolteon", "UU", ["water"], { typesAttaque: ["ground"] }),
    ];
    const [meilleure] = proposerEquipes(
      candidats,
      { epingles: ["lapras"], exclus: ["vaporeon"] },
      efficacites,
    );
    expect(slugs(meilleure?.membres ?? [])).toEqual(["lapras", "jolteon"]);
    const [libre] = proposerEquipes(
      [candidats[0], candidats[1], candidats[2]].flatMap((c) => (c ? [c] : [])),
      { epingles: ["lapras"], exclus: [] },
      efficacites,
    );
    expect(libre?.membres.map((m) => m.slug)).toContain("jolteon");
  });

  it("garde les épinglés, même non évolués, et ignore les exclus", () => {
    const [meilleure] = proposerEquipes(
      [
        candidat("kyogre", "Uber", ["water"]),
        candidat("pikachu", "NFE", ["electric"]),
        candidat("garchomp", "OU", ["dragon", "ground"]),
      ],
      { epingles: ["pikachu", "inconnu"], exclus: ["kyogre"] },
      efficacites,
    );
    expect(slugs(meilleure?.membres ?? [])).toEqual(["pikachu", "garchomp"]);
  });

  it("propose jusqu'à trois équipes distinctes de six, de la meilleure à la moins bonne", () => {
    const candidats = Array.from({ length: 9 }, (_, i) =>
      candidat(`p${i}`, i < 3 ? "OU" : "UU", ["water"]),
    );
    const equipes = proposerEquipes(candidats, choixEquipeVide(), efficacites);
    expect(equipes.length).toBeGreaterThan(1);
    expect(equipes.length).toBeLessThanOrEqual(3);
    for (const equipe of equipes) expect(equipe.membres).toHaveLength(6);
    const scores = equipes.map((e) => e.evaluation.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    expect(new Set(equipes.map((e) => slugs(e.membres).sort().join())).size).toBe(equipes.length);
  });

  it("ne propose rien sans candidat", () => {
    expect(proposerEquipes([], choixEquipeVide(), efficacites)).toEqual([]);
  });
});

describe("suggererCaptures", () => {
  const equipe = {
    membres: [
      candidat("garchomp", "OU", ["dragon", "ground"]),
      candidat("salamence", "UU", ["dragon", "flying"]),
    ],
    evaluation: evaluerEquipe(
      [
        candidat("garchomp", "OU", ["dragon", "ground"]),
        candidat("salamence", "UU", ["dragon", "flying"]),
      ],
      efficacites,
    ),
  };

  it("propose une capture qui comble une faiblesse partagée, à la place d'un membre non épinglé", () => {
    const [suggestion] = suggererCaptures(
      equipe,
      1,
      [candidat("scizor", "UU", ["steel"]), candidat("altaria", "UU", ["dragon", "flying"])],
      efficacites,
    );
    expect(suggestion?.candidat.slug).toBe("scizor");
    expect(suggestion?.remplace).toBe("salamence");
    expect(suggestion?.faiblessesComblees).toEqual(["ice"]);
  });

  it("propose une capture plus forte qui n'ajoute aucun trou", () => {
    const [suggestion] = suggererCaptures(
      equipe,
      0,
      [candidat("dragonite", "Uber", ["dragon", "flying"], { typesAttaque: ["ice", "ground"] })],
      efficacites,
    );
    expect(suggestion?.candidat.slug).toBe("dragonite");
    expect(suggestion?.gain).toBeGreaterThan(0);
  });

  it("n'en propose aucune qui affaiblit l'équipe", () => {
    const suggestions = suggererCaptures(
      equipe,
      0,
      [candidat("altaria", "UU", ["dragon", "flying"])],
      efficacites,
    );
    expect(suggestions).toEqual([]);
  });
});

describe("bilans", () => {
  it("compte faiblesses et résistances par type attaquant", () => {
    const bilan = bilanDefensif(
      [{ types: ["dragon", "ground"] }, { types: ["water"] }],
      efficacites,
    );
    expect(bilan.find((b) => b.typeAttaquant === "ice")).toEqual({
      typeAttaquant: "ice",
      multiplicateurs: [4, 0.5],
      faibles: 1,
      resistants: 1,
    });
  });

  it("donne la meilleure attaque de l'équipe contre chaque type", () => {
    const bilan = bilanOffensif(
      [{ typesAttaque: ["fire"] }, { typesAttaque: ["ground"] }],
      efficacites,
    );
    expect(bilan.find((b) => b.typeDefenseur === "steel")).toEqual({
      typeDefenseur: "steel",
      multiplicateurs: [2, 2],
      meilleur: 2,
    });
  });
});

describe("choix du joueur", () => {
  it("épingler retire des exclus, exclure retire des épinglés", () => {
    const epingle = basculerEpingle({ epingles: [], exclus: ["mew"] }, "mew");
    expect(epingle).toEqual({ epingles: ["mew"], exclus: [] });
    expect(basculerExclusion(epingle, "mew")).toEqual({
      epingles: [],
      exclus: ["mew"],
    });
  });

  it("refuse un septième épinglé", () => {
    const plein = { epingles: ["a", "b", "c", "d", "e", "f"], exclus: [] };
    expect(basculerEpingle(plein, "g")).toBe(plein);
  });
});
