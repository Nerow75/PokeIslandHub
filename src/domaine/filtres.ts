// src/domaine/filtres.ts

export type FiltreStatut = "tous" | "non-vu" | "vu" | "capture" | "non-capture";

export interface Filtres {
  recherche: string;
  /** null : toutes les générations. */
  generation: number | null;
  statut: FiltreStatut;
}

export const FILTRES_PAR_DEFAUT: Filtres = { recherche: "", generation: null, statut: "tous" };
