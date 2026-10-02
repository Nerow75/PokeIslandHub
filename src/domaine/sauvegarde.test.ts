// src/domaine/sauvegarde.test.ts

import { describe, expect, it } from "vitest";
import {
  lireSauvegarde,
  lireSauvegardeDepuisTexte,
  sauvegardeVide,
  serialiserSauvegarde,
} from "./sauvegarde.ts";
import { choixEquipeVide } from "./equipe.ts";
import { statutSuivant } from "./statut.ts";
import { votesParDefaut } from "./votes.ts";

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

describe("migrations", () => {
  const v1 = (total: number) => ({
    version: 1,
    statuts: { pikachu: "capture" },
    reglagesCompletion: { base: "capture", total, objectif: 20 },
  });

  it("amène une sauvegarde v1 jusqu'à la version courante sans perdre les statuts", () => {
    expect(lireSauvegarde(v1(1025))).toEqual({
      succes: true,
      sauvegarde: {
        version: 5,
        statuts: { pikachu: "capture" },
        reglagesCompletion: { base: "capture", totalManuel: null, objectif: 20 },
        chasse: { especes: [], capturees: [], debut: null },
        votes: votesParDefaut(),
        equipe: choixEquipeVide(),
      },
    });
  });

  it("ajoute une chasse vide à une sauvegarde v2", () => {
    const v2 = {
      version: 2,
      statuts: { eevee: "vu" },
      reglagesCompletion: { base: "capture", totalManuel: null, objectif: 20 },
    };
    const resultat = lireSauvegarde(v2);
    expect(resultat.succes && resultat.sauvegarde.chasse).toEqual({
      especes: [],
      capturees: [],
      debut: null,
    });
  });

  it("ajoute les votes par défaut à une sauvegarde v3", () => {
    const v3 = {
      version: 3,
      statuts: {},
      reglagesCompletion: { base: "capture", totalManuel: null, objectif: 45 },
      chasse: { especes: ["pikachu"], capturees: [], debut: null },
    };
    const resultat = lireSauvegarde(v3);
    expect(resultat.succes && resultat.sauvegarde.votes).toEqual(votesParDefaut());
    expect(resultat.succes && resultat.sauvegarde.chasse.especes).toEqual(["pikachu"]);
  });

  it("ajoute des choix d'équipe vides à une sauvegarde v4 sans toucher au reste", () => {
    const { equipe: _equipe, ...v4 } = { ...sauvegardeVide(), version: 4, statuts: { mew: "capture" } };
    const resultat = lireSauvegarde(v4);
    expect(resultat.succes && resultat.sauvegarde.equipe).toEqual({ epingles: [], exclus: [] });
    expect(resultat.succes && resultat.sauvegarde.statuts).toEqual({ mew: "capture" });
  });

  it("refuse plus de six Pokémon épinglés", () => {
    const equipe = { epingles: ["a", "b", "c", "d", "e", "f", "g"], exclus: [] };
    expect(lireSauvegarde({ ...sauvegardeVide(), equipe }).succes).toBe(false);
  });

  it("refuse un lien de vote non http(s)", () => {
    const votes = [{ ...votesParDefaut()[0], url: "javascript:alert(1)" }];
    expect(lireSauvegarde({ ...sauvegardeVide(), votes }).succes).toBe(false);
  });

  it("refuse une chasse de plus de six Pokémon", () => {
    const chasse = { especes: ["a", "b", "c", "d", "e", "f", "g"], capturees: [], debut: null };
    expect(lireSauvegarde({ ...sauvegardeVide(), chasse }).succes).toBe(false);
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
