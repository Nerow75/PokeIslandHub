// src/domaine/plantations.ts

/*
 * Inventaire des plantations de la base du joueur : combien de plants de chaque
 * noigrume, baie ou culture Minecraft. Une plante absente n'est pas plantée.
 */

/** Identifiant de plante ("cobblemon:red_apricorn", "minecraft:wheat") -> nombre de plants. */
export type Plantations = Record<string, number>;

export const QUANTITE_PLANTS_MAX = 9999;

/** Fixe le nombre de plants, borné à [0, QUANTITE_PLANTS_MAX] ; 0 retire la plante. */
export function definirQuantite(plantations: Plantations, id: string, quantite: number): Plantations {
  const bornee = Number.isFinite(quantite)
    ? Math.min(QUANTITE_PLANTS_MAX, Math.max(0, Math.round(quantite)))
    : 0;
  const { [id]: _ancienne, ...autres } = plantations;
  return bornee === 0 ? autres : { ...autres, [id]: bornee };
}

/** Nombre total de plants et de variétés plantées, parmi les identifiants donnés. */
export function bilanPlantations(
  plantations: Readonly<Plantations>,
  ids: readonly string[],
): { plants: number; varietes: number } {
  let plants = 0;
  let varietes = 0;
  for (const id of ids) {
    const quantite = plantations[id] ?? 0;
    if (quantite > 0) {
      plants += quantite;
      varietes++;
    }
  }
  return { plants, varietes };
}
