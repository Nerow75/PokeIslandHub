// scripts/cobblemon/plantes.ts

import { z } from "zod";
import type { PlanteCobblemon } from "../../src/types/cobblemon.ts";

/*
 * Plantes cultivables de Cobblemon : noigrumes (clés de traduction "<couleur>_apricorn")
 * et baies (un fichier par baie plantable dans data/cobblemon/berries).
 * Noms français tirés du fichier de traduction officiel du mod.
 */

export const schemaTraductionsCobblemon = z.record(z.string(), z.string());

const CLE_NOIGRUME = /^item\.cobblemon\.([a-z]+_apricorn)$/;

function trierParNom(plantes: PlanteCobblemon[]): PlanteCobblemon[] {
  return plantes.sort((a, b) => a.nomFr.localeCompare(b.nomFr, "fr"));
}

/**
 * Noigrumes et baies triés par nom français. `nomsBaies` : identifiants sans espace
 * de noms ("oran_berry"). Une baie sans traduction est signalée dans `sansNom`.
 */
export function listerPlantesCobblemon(
  traductions: Readonly<Record<string, string>>,
  nomsBaies: readonly string[],
): { noigrumes: PlanteCobblemon[]; baies: PlanteCobblemon[]; sansNom: string[] } {
  const noigrumes: PlanteCobblemon[] = [];
  for (const [cle, nomFr] of Object.entries(traductions)) {
    const nom = CLE_NOIGRUME.exec(cle)?.[1];
    if (nom) noigrumes.push({ id: `cobblemon:${nom}`, nomFr });
  }
  const baies: PlanteCobblemon[] = [];
  const sansNom: string[] = [];
  for (const nom of nomsBaies) {
    const nomFr = traductions[`item.cobblemon.${nom}`];
    if (nomFr) baies.push({ id: `cobblemon:${nom}`, nomFr });
    else sansNom.push(nom);
  }
  return { noigrumes: trierParNom(noigrumes), baies: trierParNom(baies), sansNom };
}
