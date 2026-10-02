// src/domaine/strategie.test.ts

import { describe, expect, it } from "vitest";
import type { SetRecommande } from "../types/strategie.ts";
import { conseilsIv, libelleFormat, texteShowdown, traduire } from "./strategie.ts";

const setSoleil: SetRecommande = {
  nom: "Sun Sweeper",
  format: "uu",
  generation: 9,
  capacites: [["Growth"], ["Giga Drain", "Solar Beam"], ["Sludge Bomb"], ["Weather Ball"]],
  talents: ["Chlorophyll"],
  objets: ["Life Orb"],
  natures: ["Timid", "Modest"],
  evs: { spa: 252, spd: 4, spe: 252 },
  ivs: { atk: 0 },
  teras: ["Fire"],
};

describe("texteShowdown", () => {
  it("produit un set importable dans Showdown, premier choix à chaque alternative", () => {
    expect(texteShowdown("Venusaur", setSoleil)).toBe(
      [
        "Venusaur @ Life Orb",
        "Ability: Chlorophyll",
        "Tera Type: Fire",
        "EVs: 252 SpA / 4 SpD / 252 Spe",
        "Timid Nature",
        "IVs: 0 Atk",
        "- Growth",
        "- Giga Drain",
        "- Sludge Bomb",
        "- Weather Ball",
      ].join("\n"),
    );
  });

  it("omet les lignes vides (pas d'objet, IV par défaut)", () => {
    const set = { ...setSoleil, objets: [], teras: [], ivs: { atk: 31 } };
    const texte = texteShowdown("Venusaur", set);
    expect(texte.startsWith("Venusaur\n")).toBe(true);
    expect(texte).not.toContain("IVs");
    expect(texte).not.toContain("Tera");
  });
});

describe("conseilsIv", () => {
  it("explique les IV différents de 31", () => {
    expect(conseilsIv({ atk: 0, spe: 0, hp: 31 })).toEqual([
      expect.objectContaining({ stat: "atk", valeur: 0 }),
      expect.objectContaining({ stat: "spe", valeur: 0 }),
    ]);
  });

  it("ne conseille rien quand tout reste à 31", () => {
    expect(conseilsIv({})).toEqual([]);
  });
});

describe("libellés", () => {
  it("nomme le format et la génération d'un set", () => {
    expect(libelleFormat("nationaldex", 9)).toBe("National Dex, gen 9");
    expect(libelleFormat("formatinconnu", 7)).toBe("formatinconnu, gen 7");
  });

  it("garde le nom anglais sans traduction connue", () => {
    expect(traduire({ Earthquake: "Séisme" }, "Earthquake")).toBe("Séisme");
    expect(traduire({}, "Hidden Power Fire")).toBe("Hidden Power Fire");
  });
});
