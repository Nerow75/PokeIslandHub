// src/domaine/sauvegarde.test.ts

import { describe, expect, it } from "vitest";
import {
  lireSauvegarde,
  lireSauvegardeDepuisTexte,
  sauvegardeVide,
  serialiserSauvegarde,
} from "./sauvegarde.ts";
import { statutSuivant } from "./statut.ts";

describe("lireSauvegarde", () => {
  it("relit une sauvegarde exportée à l'identique", () => {
    const sauvegarde = {
      ...sauvegardeVide(),
      statuts: { pikachu: "capture" as const, eevee: "vu" as const },
    };
    const resultat = lireSauvegardeDepuisTexte(serialiserSauvegarde(sauvegarde));
    expect(resultat).toEqual({ succes: true, sauvegarde });
  });

  it("rejette un texte qui n'est pas du JSON", () => {
    const resultat = lireSauvegardeDepuisTexte("pas du json");
    expect(resultat).toEqual({ succes: false, erreur: "Le fichier n'est pas un JSON valide." });
  });

  it("rejette un JSON sans numéro de version", () => {
    const resultat = lireSauvegarde({ statuts: {} });
    expect(resultat.succes).toBe(false);
  });

  it("rejette une sauvegarde plus récente que l'application", () => {
    const resultat = lireSauvegarde({ ...sauvegardeVide(), version: 99 });
    expect(resultat.succes).toBe(false);
    if (!resultat.succes) {
      expect(resultat.erreur).toContain("plus récente");
    }
  });

  it("rejette un statut inconnu en indiquant où se trouve le problème", () => {
    const resultat = lireSauvegarde({ ...sauvegardeVide(), statuts: { pikachu: "shiny" } });
    expect(resultat.succes).toBe(false);
    if (!resultat.succes) {
      expect(resultat.erreur).toContain("statuts.pikachu");
    }
  });

  it("refuse le statut non-vu stocké explicitement", () => {
    const resultat = lireSauvegarde({ ...sauvegardeVide(), statuts: { pikachu: "non-vu" } });
    expect(resultat.succes).toBe(false);
  });
});

describe("migration v1 -> v2", () => {
  const v1 = (total: number) => ({
    version: 1,
    statuts: { pikachu: "capture" },
    reglagesCompletion: { base: "capture", total, objectif: 20 },
  });

  it("passe un ancien total par défaut en calcul automatique, sans perdre les statuts", () => {
    expect(lireSauvegarde(v1(1025))).toEqual({
      succes: true,
      sauvegarde: {
        version: 2,
        statuts: { pikachu: "capture" },
        reglagesCompletion: { base: "capture", totalManuel: null, objectif: 20 },
      },
    });
  });

  it("conserve un total personnalisé comme total manuel", () => {
    const resultat = lireSauvegarde(v1(1100));
    expect(resultat.succes && resultat.sauvegarde.reglagesCompletion.totalManuel).toBe(1100);
  });
});

describe("statutSuivant", () => {
  it("parcourt non vu -> vu -> capturé -> non vu", () => {
    expect(statutSuivant("non-vu")).toBe("vu");
    expect(statutSuivant("vu")).toBe("capture");
    expect(statutSuivant("capture")).toBe("non-vu");
  });
});
