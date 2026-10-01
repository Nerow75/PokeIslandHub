// src/domaine/statut.ts

/**
 * Statut d'une espèce dans le Pokédex du joueur.
 * Un statut unique par espèce garantit que "capturé" implique "vu" :
 * l'état "capturé non vu" n'est pas représentable.
 */
export type StatutPokemon = "non-vu" | "vu" | "capture";

/** Statuts effectivement stockés : "non-vu" correspond à l'absence d'entrée. */
export type StatutEnregistre = Exclude<StatutPokemon, "non-vu">;

export const LIBELLES_STATUT: Record<StatutPokemon, string> = {
  "non-vu": "Non vu",
  vu: "Vu",
  capture: "Capturé",
};

const ORDRE_CYCLE: readonly StatutPokemon[] = ["non-vu", "vu", "capture"] as const;

/** Statut suivant dans le cycle non vu -> vu -> capturé -> non vu. */
export function statutSuivant(statut: StatutPokemon): StatutPokemon {
  const index = ORDRE_CYCLE.indexOf(statut);
  return ORDRE_CYCLE[(index + 1) % ORDRE_CYCLE.length] ?? "non-vu";
}

export function estVu(statut: StatutPokemon): boolean {
  return statut === "vu" || statut === "capture";
}
