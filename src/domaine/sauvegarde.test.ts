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
import { minuteursParDefaut } from "./minuteurs.ts";

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
  const POKESTOPS_MONDES_V8 = [
    "pokestops-monde-feu",
    "pokestops-monde-frozen",
    "pokestops-monde-ghost",
    "pokestops-monde-rock",
    "pokestops-monde-plante",
    "pokestops-monde-messa",
  ];
  const ARENES_MONDES_V9 = [
    "dresseur-arene-feu",
    "dresseur-arene-frozen",
    "dresseur-arene-ghost",
    "dresseur-arene-rock",
    "dresseur-arene-plante",
    "dresseur-arene-messa",
  ];
  const minuteurParDefaut = (id: string) => {
    const minuteur = minuteursParDefaut().find((m) => m.id === id);
    if (!minuteur) throw new Error(`Minuteur par défaut absent : ${id}`);
    return minuteur;
  };
  const v1 = (total: number) => ({
    version: 1,
    statuts: { pikachu: "capture" },
    reglagesCompletion: { base: "capture", total, objectif: 20 },
  });

  it("amène une sauvegarde v1 jusqu'à la version courante sans perdre les statuts", () => {
    expect(lireSauvegarde(v1(1025))).toEqual({
      succes: true,
      sauvegarde: {
        version: 10,
        statuts: { pikachu: "capture" },
        reglagesCompletion: { base: "capture", totalManuel: null, rangActuel: "dresseur" },
        chasse: { especes: [], capturees: [], debut: null },
        minuteurs: minuteursParDefaut(),
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
    expect(resultat.succes && resultat.sauvegarde.minuteurs).toEqual(minuteursParDefaut());
    expect(resultat.succes && resultat.sauvegarde.chasse.especes).toEqual(["pikachu"]);
  });

  const voteV4 = {
    id: "vote-2h",
    nom: "Serveurs Minecraft",
    url: "https://exemple.fr/vote",
    delaiMinutes: 120,
    dernierVote: "2026-10-04T10:00:00.000Z",
  };
  const v4 = {
    version: 4,
    statuts: { mew: "capture" },
    reglagesCompletion: { base: "capture", totalManuel: null, objectif: 45 },
    chasse: { especes: [], capturees: [], debut: null },
    votes: [voteV4],
  };

  it("ajoute des choix d'équipe vides à une sauvegarde v4 sans toucher au reste", () => {
    const resultat = lireSauvegarde(v4);
    expect(resultat.succes && resultat.sauvegarde.equipe).toEqual({ epingles: [], exclus: [] });
    expect(resultat.succes && resultat.sauvegarde.statuts).toEqual({ mew: "capture" });
  });

  it("convertit les votes v5 en minuteurs et ajoute dresseurs et PokéStops", () => {
    const resultat = lireSauvegarde({ ...v4, version: 5, equipe: { epingles: [], exclus: [] } });
    expect(resultat.succes).toBe(true);
    if (!resultat.succes) return;
    const [vote, ...autres] = resultat.sauvegarde.minuteurs;
    expect(vote).toEqual({
      id: "vote-2h",
      nom: "Serveurs Minecraft",
      categorie: "vote",
      url: "https://exemple.fr/vote",
      delaiMinutes: 120,
      dernier: "2026-10-04T10:00:00.000Z",
    });
    expect(autres.map((m) => m.categorie)).toEqual([
      ...Array<string>(8).fill("dresseur"),
      ...Array<string>(8).fill("pokestop"),
    ]);
  });

  it("ajoute à une sauvegarde v6 les PokéStops du monde de l'eau sans toucher aux autres", () => {
    const leo = { ...minuteurParDefaut("dresseur-leo"), dernier: "2026-10-04T14:00:00.000Z" };
    const resultat = lireSauvegarde({ ...sauvegardeVide(), version: 6, minuteurs: [leo] });
    expect(resultat.succes).toBe(true);
    if (!resultat.succes) return;
    expect(resultat.sauvegarde.minuteurs.map((m) => m.id)).toEqual([
      "dresseur-leo",
      "dresseur-arene-eau",
      ...ARENES_MONDES_V9,
      "pokestops-spawn",
      "pokestops-monde-eau",
      ...POKESTOPS_MONDES_V8,
    ]);
    expect(resultat.sauvegarde.minuteurs[0]?.dernier).toBe("2026-10-04T14:00:00.000Z");
  });

  it("ajoute à une sauvegarde v7 les PokéStops des autres mondes sans toucher aux existants", () => {
    const eau = { ...minuteurParDefaut("pokestops-monde-eau"), dernier: "2026-10-05T09:00:00.000Z" };
    const resultat = lireSauvegarde({ ...sauvegardeVide(), version: 7, minuteurs: [eau] });
    expect(resultat.succes).toBe(true);
    if (!resultat.succes) return;
    expect(resultat.sauvegarde.minuteurs.map((m) => m.id)).toEqual([
      "pokestops-monde-eau",
      "dresseur-leo",
      "dresseur-arene-eau",
      ...ARENES_MONDES_V9,
      "pokestops-spawn",
      ...POKESTOPS_MONDES_V8,
    ]);
    expect(resultat.sauvegarde.minuteurs[0]?.dernier).toBe("2026-10-05T09:00:00.000Z");
  });

  it("ajoute à une sauvegarde v8 les arènes des autres mondes sans toucher aux existants", () => {
    const areneEau = {
      ...minuteurParDefaut("dresseur-arene-eau"),
      dernier: "2026-10-05T16:00:00.000Z",
    };
    const resultat = lireSauvegarde({ ...sauvegardeVide(), version: 8, minuteurs: [areneEau] });
    expect(resultat.succes).toBe(true);
    if (!resultat.succes) return;
    expect(resultat.sauvegarde.minuteurs.map((m) => m.id)).toEqual([
      "dresseur-arene-eau",
      "dresseur-leo",
      ...ARENES_MONDES_V9,
      "pokestops-spawn",
      "pokestops-monde-eau",
      ...POKESTOPS_MONDES_V8,
    ]);
    expect(resultat.sauvegarde.minuteurs[0]?.dernier).toBe("2026-10-05T16:00:00.000Z");
  });

  it("convertit l'objectif v9 en rang actuel : le dernier rang sous l'objectif", () => {
    const v9 = (objectif: number) => ({
      ...sauvegardeVide(),
      version: 9,
      reglagesCompletion: { base: "vu", totalManuel: 1100, objectif },
    });
    const reglagesApres = (objectif: number) => {
      const resultat = lireSauvegarde(v9(objectif));
      return resultat.succes ? resultat.sauvegarde.reglagesCompletion : null;
    };
    expect(reglagesApres(45)).toEqual({ base: "vu", totalManuel: 1100, rangActuel: "eleveur" });
    expect(reglagesApres(5)?.rangActuel).toBeNull();
    expect(reglagesApres(100)?.rangActuel).toBe("mythique");
  });

  it("refuse un rang inconnu", () => {
    const reglagesCompletion = { base: "capture", totalManuel: null, rangActuel: "empereur" };
    expect(lireSauvegarde({ ...sauvegardeVide(), reglagesCompletion }).succes).toBe(false);
  });

  it("refuse plus de six Pokémon épinglés", () => {
    const equipe = { epingles: ["a", "b", "c", "d", "e", "f", "g"], exclus: [] };
    expect(lireSauvegarde({ ...sauvegardeVide(), equipe }).succes).toBe(false);
  });

  it("refuse un lien de vote non http(s)", () => {
    const minuteurs = [{ ...minuteursParDefaut()[0], url: "javascript:alert(1)" }];
    expect(lireSauvegarde({ ...sauvegardeVide(), minuteurs }).succes).toBe(false);
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
