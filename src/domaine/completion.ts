// src/domaine/completion.ts

import { estVu, type StatutPokemon } from "./statut.ts";

/** Ce que le serveur compte pour la complétion : à confirmer, donc paramétrable. */
export type BaseCompletion = "capture" | "vu";

export interface ReglagesCompletion {
  base: BaseCompletion;
  /** Nombre total d'entrées de référence (dénominateur). */
  total: number;
  /** Pourcentage visé pour le prochain rang. */
  objectif: number;
}

export const REGLAGES_COMPLETION_PAR_DEFAUT: ReglagesCompletion = {
  base: "capture",
  total: 1025,
  objectif: 20,
};

export interface EtatCompletion {
  compte: number;
  total: number;
  pourcentage: number;
  objectif: number;
  /** Nombre d'entrées nécessaires pour atteindre l'objectif. */
  requisPourObjectif: number;
  restantPourObjectif: number;
}

/** Tolérance sur les calculs flottants (ex. 20 % de 1025 doit donner 205, pas 205.0000001). */
const EPSILON = 1e-9;

export function compteSelonBase(statuts: Iterable<StatutPokemon>, base: BaseCompletion): number {
  let compte = 0;
  for (const statut of statuts) {
    if (base === "capture" ? statut === "capture" : estVu(statut)) {
      compte++;
    }
  }
  return compte;
}

export function calculerCompletion(compte: number, reglages: ReglagesCompletion): EtatCompletion {
  const { total, objectif } = reglages;
  const pourcentage = total > 0 ? (compte / total) * 100 : 0;
  const requisPourObjectif = Math.ceil((objectif * total) / 100 - EPSILON);
  return {
    compte,
    total,
    pourcentage,
    objectif,
    requisPourObjectif,
    restantPourObjectif: Math.max(0, requisPourObjectif - compte),
  };
}

const FORMAT_POURCENTAGE = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Pourcentage avec exactement deux décimales, ex. "15,22 %", espace insécable. */
export function formaterPourcentage(pourcentage: number): string {
  return `${FORMAT_POURCENTAGE.format(pourcentage)} %`;
}
