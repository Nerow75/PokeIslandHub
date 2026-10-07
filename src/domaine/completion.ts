// src/domaine/completion.ts

import { estVu, type StatutPokemon } from "./statut.ts";

/** Ce que le serveur compte pour la complétion : à confirmer, donc paramétrable. */
export type BaseCompletion = "capture" | "vu";

/** Rangs du serveur, dans l'ordre, avec le pourcentage de complétion qui les débloque. */
export const RANGS = [
  { id: "dresseur", nom: "Dresseur", seuil: 5 },
  { id: "eleveur", nom: "Éleveur", seuil: 20 },
  { id: "champion", nom: "Champion", seuil: 45 },
  { id: "maitre", nom: "Maître", seuil: 65 },
  { id: "legendaire", nom: "Légendaire", seuil: 80 },
  { id: "mythique", nom: "Mythique", seuil: 95 },
] as const;

export type Rang = (typeof RANGS)[number];
export type IdRang = Rang["id"];

export const IDS_RANGS = RANGS.map((rang) => rang.id) as [IdRang, ...IdRang[]];

/** Rang qui suit celui du joueur (le premier s'il n'en a pas), ou null s'il a déjà le dernier. */
export function rangSuivant(rangActuel: IdRang | null): Rang | null {
  const index = rangActuel === null ? -1 : RANGS.findIndex((rang) => rang.id === rangActuel);
  return RANGS[index + 1] ?? null;
}

export interface ReglagesCompletion {
  base: BaseCompletion;
  /**
   * Total de référence saisi à la main, ou null pour utiliser le total du
   * Pokédex du serveur, calculé automatiquement à partir des entrées connues.
   */
  totalManuel: number | null;
  /** Rang actuel du joueur, ou null s'il n'en a pas encore : l'objectif est le rang suivant. */
  rangActuel: IdRang | null;
}

export const REGLAGES_COMPLETION_PAR_DEFAUT: ReglagesCompletion = {
  base: "capture",
  totalManuel: null,
  rangActuel: null,
};

export interface EtatCompletion {
  compte: number;
  total: number;
  pourcentage: number;
  /** Rang visé, ou null une fois le dernier rang obtenu : l'objectif devient alors 100 %. */
  rangVise: Rang | null;
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

export function calculerCompletion(
  compte: number,
  reglages: ReglagesCompletion,
  totalAutomatique: number,
): EtatCompletion {
  const rangVise = rangSuivant(reglages.rangActuel);
  const objectif = rangVise?.seuil ?? 100;
  const total = reglages.totalManuel ?? totalAutomatique;
  const pourcentage = total > 0 ? (compte / total) * 100 : 0;
  const requisPourObjectif = Math.ceil((objectif * total) / 100 - EPSILON);
  return {
    compte,
    total,
    pourcentage,
    rangVise,
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
