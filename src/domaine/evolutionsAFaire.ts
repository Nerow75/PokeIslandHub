// src/domaine/evolutionsAFaire.ts

import type { ConditionEvolution, EspecePokemon } from "../types/pokedex.ts";
import { niveauMinimal } from "./conditionsEvolution.ts";
import type { StatutPokemon } from "./statut.ts";

/**
 * "mes-captures" : évolutions de mes Pokémon capturés vers une espèce pas encore capturée.
 * "tout" : référence de toutes les évolutions du Pokédex.
 */
export type PorteeEvolutions = "mes-captures" | "tout";

export interface EvolutionAFaire {
  depuis: EspecePokemon;
  vers: EspecePokemon;
  conditions: ConditionEvolution[];
  statutCible: StatutPokemon;
  /** Plus petit niveau requis, ou null si l'évolution ne dépend pas du niveau. */
  niveau: number | null;
}

export function listerEvolutions(
  especes: readonly EspecePokemon[],
  especesParSlug: ReadonlyMap<string, EspecePokemon>,
  statutDe: (slug: string) => StatutPokemon,
  portee: PorteeEvolutions,
): EvolutionAFaire[] {
  const resultat: EvolutionAFaire[] = [];
  for (const depuis of especes) {
    if (portee === "mes-captures" && statutDe(depuis.slug) !== "capture") {
      continue;
    }
    for (const evolution of depuis.evolutions) {
      const vers = especesParSlug.get(evolution.vers);
      if (!vers) {
        continue;
      }
      const statutCible = statutDe(vers.slug);
      if (portee === "mes-captures" && statutCible === "capture") {
        continue;
      }
      resultat.push({
        depuis,
        vers,
        conditions: evolution.conditions,
        statutCible,
        niveau: niveauMinimal(evolution.conditions),
      });
    }
  }
  /* Par niveau croissant, les évolutions sans niveau à la fin, puis par numéro. */
  return resultat.sort(
    (a, b) =>
      (a.niveau ?? Number.POSITIVE_INFINITY) - (b.niveau ?? Number.POSITIVE_INFINITY) ||
      a.depuis.id - b.depuis.id ||
      a.vers.id - b.vers.id,
  );
}
