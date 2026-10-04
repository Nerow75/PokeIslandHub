// src/domaine/ev.ts

import type { EvRapportes, StatEv } from "../types/pokedex.ts";

/** Abréviations des statistiques, dans l'ordre du jeu. */
export const ABREVIATIONS_EV: readonly { stat: StatEv; court: string; libelle: string }[] = [
  { stat: "pv", court: "PV", libelle: "PV" },
  { stat: "attaque", court: "Atq", libelle: "Attaque" },
  { stat: "defense", court: "Déf", libelle: "Défense" },
  { stat: "attaqueSpeciale", court: "Atq Spé", libelle: "Attaque Spéciale" },
  { stat: "defenseSpeciale", court: "Déf Spé", libelle: "Défense Spéciale" },
  { stat: "vitesse", court: "Vit", libelle: "Vitesse" },
] as const;

/** EV rapportés en raccourci : "+2 Vit", "+1 PV +1 Déf" ; vide si aucun. */
export function resumeEv(ev: EvRapportes): string {
  return ABREVIATIONS_EV.filter(({ stat }) => ev[stat] > 0)
    .map(({ stat, court }) => `+${ev[stat]} ${court}`)
    .join(" ");
}
