// src/domaine/famille.test.ts

import { describe, expect, it } from "vitest";
import { evolutionsAffichees, evolutionsVers } from "../donnees.ts";
import { etiquettesAffichables } from "./etiquettes.ts";
import {
  construireArbre,
  evolutionsAccessibles,
  racineFamille,
  tailleFamille,
} from "./famille.ts";

/* Sur les données Cobblemon réelles. */
const parentsDe = (slug: string) => evolutionsVers(slug).map((p) => p.depuis);

describe("famille d'évolution", () => {
  it("remonte à la forme de base", () => {
    expect(racineFamille("charizard", parentsDe)).toBe("charmander");
    expect(racineFamille("sylveon", parentsDe)).toBe("eevee");
    expect(racineFamille("eevee", parentsDe)).toBe("eevee");
  });

  it("construit l'arbre complet d'Évoli", () => {
    const arbre = construireArbre("eevee", evolutionsAffichees);
    expect(arbre.branches).toHaveLength(8);
    expect(tailleFamille(arbre)).toBe(9);
  });

  it("enchaîne les stades d'évolution", () => {
    const arbre = construireArbre("charmander", evolutionsAffichees);
    expect(arbre.branches[0]?.noeud.slug).toBe("charmeleon");
    expect(arbre.branches[0]?.noeud.branches[0]?.noeud.slug).toBe("charizard");
  });

  it("regroupe les variantes vers une même espèce", () => {
    const arbre = construireArbre("milcery", evolutionsAffichees);
    expect(arbre.branches).toHaveLength(1);
    expect(arbre.branches[0]?.evolutions.length).toBeGreaterThan(1);
  });

  it("supporte une espèce sans évolution", () => {
    expect(construireArbre("tauros", evolutionsAffichees).branches).toEqual([]);
  });
});

describe("étiquettes", () => {
  it("traduit les étiquettes utiles et ignore les autres", () => {
    expect(etiquettesAffichables(["gen1", "legendary", "kantonian_form"])).toEqual([
      { id: "legendary", libelle: "Légendaire" },
    ]);
  });
});

describe("évolutions accessibles depuis les captures", () => {
  const suivantesDe = (slug: string) => evolutionsAffichees(slug).map((e) => e.vers);

  it("enchaîne tous les stades et retient la capture d'origine", () => {
    const accessibles = evolutionsAccessibles(["charmander"], suivantesDe);
    expect(accessibles.get("charmeleon")).toBe("charmander");
    expect(accessibles.get("charizard")).toBe("charmander");
  });

  it("ignore les espèces déjà capturées et privilégie l'ancêtre le plus proche", () => {
    const accessibles = evolutionsAccessibles(["charmander", "charmeleon"], suivantesDe);
    expect(accessibles.has("charmeleon")).toBe(false);
    expect(accessibles.get("charizard")).toBe("charmeleon");
  });

  it("ouvre toutes les branches d'Évoli", () => {
    expect(evolutionsAccessibles(["eevee"], suivantesDe).size).toBe(8);
  });
});
