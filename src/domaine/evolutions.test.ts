// src/domaine/evolutions.test.ts

import { describe, expect, it } from "vitest";
import { ESPECES, ESPECES_PAR_SLUG, TRADUCTIONS } from "../donnees.ts";
import { decrireCondition, niveauMinimal } from "./conditionsEvolution.ts";
import { listerEvolutions } from "./evolutionsAFaire.ts";
import type { StatutPokemon } from "./statut.ts";

/* Tests sur le Pokédex généré réel : les conditions décrites sont celles de PokeAPI. */

function conditionsVers(depuis: string, vers: string) {
  const evolution = ESPECES_PAR_SLUG.get(depuis)?.evolutions.find((e) => e.vers === vers);
  if (!evolution) throw new Error(`Évolution ${depuis} -> ${vers} absente des données`);
  return evolution.conditions;
}

function decrire(depuis: string, vers: string): string[] {
  return conditionsVers(depuis, vers).map((c) => decrireCondition(c, TRADUCTIONS));
}

describe("decrireCondition", () => {
  it("décrit une évolution par niveau", () => {
    expect(decrire("charmander", "charmeleon")).toEqual(["Niveau 16"]);
  });

  it("décrit une évolution par objet en français", () => {
    expect(decrire("pikachu", "raichu")).toEqual(["Objet : Pierre Foudre"]);
  });

  it("décrit une évolution par bonheur selon le moment", () => {
    expect(decrire("eevee", "espeon")).toEqual(["Bonheur ≥ 160, le jour"]);
  });

  it("décrit une évolution en connaissant un type de capacité", () => {
    expect(decrire("eevee", "sylveon")).toContain("Affection ≥ 2, en connaissant une capacité Fée");
  });

  it("décrit un échange en tenant un objet", () => {
    expect(decrire("onix", "steelix")).toEqual(["Échange, en tenant Peau Métal"]);
  });
});

describe("niveauMinimal", () => {
  it("retourne le niveau requis ou null", () => {
    expect(niveauMinimal(conditionsVers("charmander", "charmeleon"))).toBe(16);
    expect(niveauMinimal(conditionsVers("pikachu", "raichu"))).toBeNull();
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
  const evolutions = listerEvolutions(ESPECES, ESPECES_PAR_SLUG, statutDe, "mes-captures");
  const paires = evolutions.map((e) => `${e.depuis.slug}>${e.vers.slug}`);

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
    expect(paires).toEqual(["charmander>charmeleon", "ivysaur>venusaur", "pikachu>raichu"]);
  });

  it("indique le statut de l'espèce cible", () => {
    expect(evolutions[0]?.statutCible).toBe("vu");
  });
});
