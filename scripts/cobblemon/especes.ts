// scripts/cobblemon/especes.ts

import { z } from "zod";
import type {
  ConditionCobblemon,
  EspeceCobblemon,
  EvolutionCobblemon,
} from "../../src/types/cobblemon.ts";
import { cleEspece, decomposerPokemon } from "./parse.ts";

/* Schéma d'un fichier species/<generation>/<espece>.json, limité aux champs utilisés. */

const schemaCondition = z.looseObject({ variant: z.string() });

const schemaEvolution = z.looseObject({
  result: z.string(),
  variant: z.string(),
  requiredContext: z.string().optional(),
  requirements: z.array(schemaCondition).optional(),
});

export const schemaEspeceCobblemonFichier = z.looseObject({
  name: z.string(),
  implemented: z.boolean().optional(),
  labels: z.array(z.string()).optional(),
  evolutions: z.array(schemaEvolution).optional(),
  forms: z
    .array(
      z.looseObject({
        aspects: z.array(z.string()).optional(),
        evolutions: z.array(schemaEvolution).optional(),
      }),
    )
    .optional(),
});
export type EspeceCobblemonFichier = z.infer<typeof schemaEspeceCobblemonFichier>;

/** Ne garde que les paramètres simples d'une condition (texte, nombre, booléen). */
function convertirCondition(brute: z.infer<typeof schemaCondition>): ConditionCobblemon {
  const condition: ConditionCobblemon = { variant: brute.variant };
  for (const [cle, valeur] of Object.entries(brute)) {
    if (typeof valeur === "string" || typeof valeur === "number" || typeof valeur === "boolean") {
      condition[cle] = valeur;
    }
  }
  return condition;
}

function convertirEvolution(
  brute: z.infer<typeof schemaEvolution>,
  slugParCle: ReadonlyMap<string, string>,
  aspectDepart: string | undefined,
): EvolutionCobblemon | null {
  const { espece, aspect } = decomposerPokemon(brute.result);
  const vers = slugParCle.get(cleEspece(espece));
  if (!vers) return null;
  const evolution: EvolutionCobblemon = {
    vers,
    mode: brute.variant,
    conditions: (brute.requirements ?? []).map(convertirCondition),
  };
  if (aspect) evolution.aspectObtenu = aspect;
  if (aspectDepart) evolution.aspectDepart = aspectDepart;
  if (brute.requiredContext) evolution.contexte = brute.requiredContext;
  return evolution;
}

/**
 * Convertit les fichiers d'espèces Cobblemon, indexés par slug PokeAPI. Les évolutions
 * propres à une forme (Miaouss de Galar -> Berserkatt) sont reprises avec leur aspect.
 */
export function convertirEspecesCobblemon(
  fichiers: readonly EspeceCobblemonFichier[],
  slugParCle: ReadonlyMap<string, string>,
): { parEspece: Record<string, EspeceCobblemon>; inconnues: string[] } {
  const parEspece: Record<string, EspeceCobblemon> = {};
  const inconnues: string[] = [];
  for (const fichier of fichiers) {
    const slug = slugParCle.get(cleEspece(fichier.name));
    if (!slug) {
      inconnues.push(fichier.name);
      continue;
    }
    const evolutions: EvolutionCobblemon[] = [];
    for (const brute of fichier.evolutions ?? []) {
      const evolution = convertirEvolution(brute, slugParCle, undefined);
      if (evolution) evolutions.push(evolution);
    }
    for (const forme of fichier.forms ?? []) {
      const aspectDepart = forme.aspects?.[0];
      for (const brute of forme.evolutions ?? []) {
        const evolution = convertirEvolution(brute, slugParCle, aspectDepart);
        if (evolution) evolutions.push(evolution);
      }
    }
    parEspece[slug] = {
      implementee: fichier.implemented ?? false,
      etiquettes: [...(fichier.labels ?? [])].sort(),
      evolutions,
    };
  }
  return { parEspece, inconnues: inconnues.sort() };
}
