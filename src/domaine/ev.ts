// src/domaine/ev.ts

import type { EvRapportes, StatEv } from "../types/pokedex.ts";

/** Abréviations des statistiques, dans l'ordre du jeu. */
export const ABREVIATIONS_EV: readonly { stat: StatEv; court: string }[] = [
  { stat: "pv", court: "PV" },
  { stat: "attaque", court: "Atq" },
  { stat: "defense", court: "Déf" },
  { stat: "attaqueSpeciale", court: "Atq Spé" },
  { stat: "defenseSpeciale", court: "Déf Spé" },
  { stat: "vitesse", court: "Vit" },
] as const;

/** EV rapportés en raccourci : "+2 Vit", "+1 PV +1 Déf" ; vide si aucun. */
export function resumeEv(ev: EvRapportes): string {
  return ABREVIATIONS_EV.filter(({ stat }) => ev[stat] > 0)
    .map(({ stat, court }) => `+${ev[stat]} ${court}`)
    .join(" ");
}
