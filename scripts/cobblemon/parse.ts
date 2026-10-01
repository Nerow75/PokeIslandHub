// scripts/cobblemon/parse.ts

import { z } from "zod";
import type { Apparition } from "../../src/types/apparitions.ts";

/* Schéma d'un fichier spawn_pool_world, limité aux champs utilisés. */

const schemaCondition = z
  .object({
    biomes: z.array(z.string()).optional(),
    structures: z.array(z.string()).optional(),
    neededNearbyBlocks: z.array(z.string()).optional(),
    timeRange: z.string().optional(),
    isRaining: z.boolean().optional(),
    isThundering: z.boolean().optional(),
    canSeeSky: z.boolean().optional(),
    moonPhase: z.union([z.string(), z.number()]).optional(),
    minY: z.number().optional(),
    maxY: z.number().optional(),
    minLureLevel: z.number().optional(),
  })
  .loose();

const schemaApparitionCobblemon = z
  .object({
    pokemon: z.string(),
    type: z.string().optional(),
    bucket: z.enum(["common", "uncommon", "rare", "ultra-rare"]),
    level: z.string().optional(),
    spawnablePositionType: z.string().optional(),
    presets: z.array(z.string()).optional(),
    condition: schemaCondition.optional(),
    anticondition: schemaCondition.optional(),
  })
  .loose();

export const schemaFichierApparitions = z
  .object({
    enabled: z.boolean().optional(),
    spawns: z.array(schemaApparitionCobblemon),
  })
  .loose();
export type FichierApparitions = z.infer<typeof schemaFichierApparitions>;

import { cleEspece } from "../../src/domaine/identifiants.ts";

export { cleEspece };

/**
 * Sépare "meowth galarian" en espèce et aspect. Les propriétés "clé=valeur"
 * (motifs, variantes cosmétiques) sont ignorées.
 */
export function decomposerPokemon(champ: string): { espece: string; aspect?: string } {
  const [espece = "", ...reste] = champ.trim().split(/\s+/);
  const aspect = reste.find((morceau) => !morceau.includes("="));
  return aspect ? { espece, aspect } : { espece };
}

export function convertirApparition(brute: FichierApparitions["spawns"][number]): Apparition {
  const { aspect } = decomposerPokemon(brute.pokemon);
  const condition = brute.condition ?? {};
  const apparition: Apparition = {
    rarete: brute.bucket,
    niveaux: brute.level ?? "",
    position: brute.spawnablePositionType ?? "grounded",
    contextes: [...(brute.presets ?? [])].sort(),
    biomes: [...(condition.biomes ?? [])].sort(),
    biomesExclus: [...(brute.anticondition?.biomes ?? [])].sort(),
    structures: [...(condition.structures ?? [])].sort(),
    blocsProches: [...(condition.neededNearbyBlocks ?? [])].sort(),
  };
  if (aspect) apparition.aspect = aspect;
  if (condition.timeRange) apparition.moment = condition.timeRange;
  if (condition.isRaining !== undefined) apparition.pluie = condition.isRaining;
  if (condition.isThundering) apparition.orage = true;
  if (condition.canSeeSky !== undefined) apparition.cielVisible = condition.canSeeSky;
  if (condition.moonPhase !== undefined) apparition.phaseLune = String(condition.moonPhase);
  if (condition.minY !== undefined) apparition.yMin = condition.minY;
  if (condition.maxY !== undefined) apparition.yMax = condition.maxY;
  if (condition.minLureLevel !== undefined) apparition.leurreMin = condition.minLureLevel;
  return apparition;
}

const ORDRE_RARETE: Record<Apparition["rarete"], number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  "ultra-rare": 3,
};

/** Supprime les doublons (variantes cosmétiques identiques) et trie du plus au moins courant. */
export function dedoublonnerApparitions(apparitions: Apparition[]): Apparition[] {
  const parEmpreinte = new Map<string, Apparition>();
  for (const apparition of apparitions) {
    parEmpreinte.set(JSON.stringify(apparition), apparition);
  }
  return [...parEmpreinte.values()].sort((a, b) => ORDRE_RARETE[a.rarete] - ORDRE_RARETE[b.rarete]);
}

/**
 * Regroupe les apparitions par slug PokeAPI. Les espèces Cobblemon sans
 * correspondance sont retournées à part pour être signalées.
 */
export function regrouperParEspece(
  fichiers: FichierApparitions[],
  slugParCle: ReadonlyMap<string, string>,
): { parEspece: Record<string, Apparition[]>; inconnues: string[] } {
  const brutes = new Map<string, Apparition[]>();
  const inconnues = new Set<string>();
  for (const fichier of fichiers) {
    if (fichier.enabled === false) continue;
    for (const spawn of fichier.spawns) {
      if (spawn.type !== undefined && spawn.type !== "pokemon") continue;
      const { espece } = decomposerPokemon(spawn.pokemon);
      const slug = slugParCle.get(cleEspece(espece));
      if (!slug) {
        inconnues.add(espece);
        continue;
      }
      const liste = brutes.get(slug) ?? [];
      liste.push(convertirApparition(spawn));
      brutes.set(slug, liste);
    }
  }
  const parEspece: Record<string, Apparition[]> = {};
  for (const [slug, liste] of [...brutes].sort(([a], [b]) => a.localeCompare(b))) {
    parEspece[slug] = dedoublonnerApparitions(liste);
  }
  return { parEspece, inconnues: [...inconnues].sort() };
}
