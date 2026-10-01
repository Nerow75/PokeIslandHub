// src/domaine/evolutions.test.ts

import { describe, expect, it } from "vitest";
import { ESPECES, ESPECES_PAR_SLUG, evolutionsAffichees, evolutionsVers } from "../donnees.ts";
import { listerEvolutions } from "./evolutionsAFaire.ts";
import type { StatutPokemon } from "./statut.ts";

/* Tests sur les données Cobblemon réelles générées (src/data/cobblemon.json). */

function decrire(depuis: string, vers: string): string[] {
  return evolutionsAffichees(depuis)
    .filter((e) => e.vers === vers)
    .map((e) => e.description);
}

describe("évolutions Cobblemon en français", () => {
  it("décrit une évolution par niveau", () => {
    expect(decrire("charmander", "charmeleon")).toEqual(["Niveau 16"]);
  });

  it("décrit les évolutions d'Évoli par objet, bonheur et moment", () => {
    expect(decrire("eevee", "jolteon")).toEqual(["Utiliser : Pierre Foudre"]);
    expect(decrire("eevee", "espeon")).toEqual(["Bonheur ≥ 160, le jour"]);
    expect(decrire("eevee", "sylveon")).toEqual(["Bonheur ≥ 160, en connaissant une capacité Fée"]);
    expect(evolutionsAffichees("eevee")).toHaveLength(8);
  });

  it("décrit un échange en tenant un objet", () => {
    expect(decrire("onix", "steelix")).toEqual(["Échange, en tenant Peau Métal"]);
  });

  it("traduit un type requis dans l'équipe", () => {
    expect(decrire("pancham", "pangoro")).toEqual([
      "Niveau 32, avec un Pokémon Ténèbres dans l'équipe",
    ]);
  });

  it("conserve l'aspect des formes régionales", () => {
    const perrserker = evolutionsAffichees("meowth").find((e) => e.vers === "perrserker");
    expect(perrserker?.aspectDepart).toBe("galarian");
  });

  it("fusionne les variantes purement cosmétiques", () => {
    expect(decrire("gimmighoul", "gholdengo")).toEqual(["avec 999 pièces"]);
    const charmilly = decrire("milcery", "alcremie");
    expect(new Set(charmilly).size).toBe(charmilly.length);
  });

  it("retrouve l'espèce de départ d'une évolution", () => {
    expect(evolutionsVers("vaporeon").map((p) => p.depuis)).toEqual(["eevee"]);
  });
});

describe("listerEvolutions", () => {
  const statuts: Record<string, StatutPokemon> = {
    charmander: "capture",
    charmeleon: "vu",
    bulbasaur: "capture",
    ivysaur: "capture",
    pikachu: "capture",
  };
  const statutDe = (slug: string): StatutPokemon => statuts[slug] ?? "non-vu";
  const evolutions = listerEvolutions(
    ESPECES,
    ESPECES_PAR_SLUG,
    statutDe,
    "mes-captures",
    evolutionsAffichees,
  );
  const paires = [...new Set(evolutions.map((e) => `${e.depuis.slug}>${e.vers.slug}`))];

  it("propose les évolutions des captures vers une espèce non capturée", () => {
    expect(paires).toContain("charmander>charmeleon");
    expect(paires).toContain("ivysaur>venusaur");
    expect(paires).toContain("pikachu>raichu");
  });

  it("ignore les évolutions vers une espèce déjà capturée", () => {
    expect(paires).not.toContain("bulbasaur>ivysaur");
  });

  it("ignore les espèces non capturées", () => {
    expect(paires).not.toContain("charmeleon>charizard");
  });

  it("trie par niveau, les évolutions sans niveau en dernier", () => {
    expect(paires.slice(0, 2)).toEqual(["charmander>charmeleon", "ivysaur>venusaur"]);
    expect(paires.at(-1)).toBe("pikachu>raichu");
  });

  it("indique le statut de l'espèce cible", () => {
    expect(evolutions[0]?.statutCible).toBe("vu");
  });
});
