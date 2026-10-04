// src/domaine/filtres.ts

import type { StatEv } from "../types/pokedex.ts";
import type { MomentJournee } from "./apparitions.ts";
import type { StatutPokemon } from "./statut.ts";

export type FiltreStatut = "tous" | "non-vu" | "vu" | "capture" | "non-capture";

export interface Filtres {
  recherche: string;
  /** null : toutes les générations. */
  generation: number | null;
  statut: FiltreStatut;
  /** Statistique dans laquelle l'espèce doit rapporter des EV ; null : toutes. */
  statEv: StatEv | null;
  /** Tag de biome où l'espèce doit pouvoir apparaître (apparitions "partout" comprises). */
  biome: string | null;
  /** Moment de la journée où l'espèce doit pouvoir apparaître. */
  moment: MomentJournee | null;
}

export const FILTRES_PAR_DEFAUT: Filtres = {
  recherche: "",
  generation: null,
  statut: "tous",
  statEv: null,
  biome: null,
  moment: null,
};

export function correspondAuFiltreStatut(statut: StatutPokemon, filtre: FiltreStatut): boolean {
  switch (filtre) {
    case "tous":
      return true;
    case "non-capture":
      return statut !== "capture";
    default:
      return statut === filtre;
  }
}

/** Vrai si un filtre d'apparition (biome ou moment) est actif. */
export function filtreApparitionActif(filtres: Filtres): boolean {
  return filtres.biome !== null || filtres.moment !== null;
}
