// src/domaine/completion.test.ts

import { describe, expect, it } from "vitest";
import {
  calculerCompletion,
  compteSelonBase,
  formaterPourcentage,
  RANGS,
  rangSuivant,
  REGLAGES_COMPLETION_PAR_DEFAUT,
} from "./completion.ts";
import type { StatutPokemon } from "./statut.ts";

describe("compteSelonBase", () => {
  const statuts: StatutPokemon[] = ["capture", "vu", "vu", "non-vu", "capture"];

  it("compte uniquement les captures en base capture", () => {
    expect(compteSelonBase(statuts, "capture")).toBe(2);
  });

  it("compte les vus et les capturés en base vu", () => {
    expect(compteSelonBase(statuts, "vu")).toBe(4);
  });
});

describe("rangSuivant", () => {
  it("vise Dresseur sans rang, puis enchaîne les rangs dans l'ordre", () => {
    expect(rangSuivant(null)?.seuil).toBe(5);
    expect(rangSuivant("dresseur")?.nom).toBe("Éleveur");
    expect(rangSuivant("legendaire")?.nom).toBe("Mythique");
    expect(RANGS.map((rang) => rang.seuil)).toEqual([5, 20, 45, 65, 80, 95]);
  });

  it("ne vise plus aucun rang après Mythique", () => {
    expect(rangSuivant("mythique")).toBeNull();
  });
});

describe("calculerCompletion", () => {
  const sur1025 = { base: "capture" as const, totalManuel: 1025, rangActuel: "dresseur" as const };
  const TOTAL_SERVEUR = 1045;
  const objectif20 = {
    base: "capture" as const,
    totalManuel: null,
    rangActuel: "dresseur" as const,
  };

  it("retrouve les 17,80 % du jeu : 186 capturés sur 1045", () => {
    const etat = calculerCompletion(186, objectif20, TOTAL_SERVEUR);
    expect(formaterPourcentage(etat.pourcentage)).toBe("17,80 %");
    expect(etat.requisPourObjectif).toBe(209);
    expect(etat.restantPourObjectif).toBe(23);
  });

  it("retrouve 15,22 % pour 156 sur 1025", () => {
    const etat = calculerCompletion(156, sur1025, TOTAL_SERVEUR);
    expect(formaterPourcentage(etat.pourcentage)).toBe("15,22 %");
  });

  it("calcule le nombre requis pour 20 % sans erreur d'arrondi flottant", () => {
    const etat = calculerCompletion(156, sur1025, TOTAL_SERVEUR);
    expect(etat.requisPourObjectif).toBe(205);
    expect(etat.restantPourObjectif).toBe(49);
  });

  it("vise Champion (45 %) pour un Éleveur : 471 captures sur 1045", () => {
    const etat = calculerCompletion(
      220,
      { ...REGLAGES_COMPLETION_PAR_DEFAUT, rangActuel: "eleveur" },
      TOTAL_SERVEUR,
    );
    expect(etat.rangVise?.nom).toBe("Champion");
    expect(etat.requisPourObjectif).toBe(471);
    expect(etat.restantPourObjectif).toBe(251);
  });

  it("ne descend pas sous zéro une fois l'objectif atteint", () => {
    const etat = calculerCompletion(300, objectif20, TOTAL_SERVEUR);
    expect(etat.restantPourObjectif).toBe(0);
  });

  it("arrondit l'objectif à l'entrée supérieure", () => {
    const etat = calculerCompletion(
      0,
      { base: "capture", totalManuel: 999, rangActuel: "dresseur" },
      TOTAL_SERVEUR,
    );
    expect(etat.requisPourObjectif).toBe(200);
  });

  it("vise 100 % une fois Mythique obtenu", () => {
    const etat = calculerCompletion(1000, { ...objectif20, rangActuel: "mythique" }, TOTAL_SERVEUR);
    expect(etat.rangVise).toBeNull();
    expect(etat.requisPourObjectif).toBe(1045);
  });

  it("garde toujours deux décimales", () => {
    expect(formaterPourcentage(20)).toBe("20,00 %");
  });
});
