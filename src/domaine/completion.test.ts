// src/domaine/completion.test.ts

import { describe, expect, it } from "vitest";
import {
  calculerCompletion,
  compteSelonBase,
  formaterPourcentage,
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

describe("calculerCompletion", () => {
  it("retrouve 15,22 % pour 156 sur 1025", () => {
    const etat = calculerCompletion(156, REGLAGES_COMPLETION_PAR_DEFAUT);
    expect(formaterPourcentage(etat.pourcentage)).toBe("15,22 %");
  });

  it("calcule le nombre requis pour 20 % sans erreur d'arrondi flottant", () => {
    const etat = calculerCompletion(156, REGLAGES_COMPLETION_PAR_DEFAUT);
    expect(etat.requisPourObjectif).toBe(205);
    expect(etat.restantPourObjectif).toBe(49);
  });

  it("ne descend pas sous zéro une fois l'objectif atteint", () => {
    const etat = calculerCompletion(300, REGLAGES_COMPLETION_PAR_DEFAUT);
    expect(etat.restantPourObjectif).toBe(0);
  });

  it("arrondit l'objectif à l'entrée supérieure", () => {
    const etat = calculerCompletion(0, { base: "capture", total: 999, objectif: 20 });
    expect(etat.requisPourObjectif).toBe(200);
  });

  it("garde toujours deux décimales", () => {
    expect(formaterPourcentage(20)).toBe("20,00 %");
  });
});
