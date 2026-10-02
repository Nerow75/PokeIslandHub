// src/domaine/schemaStrategie.ts

import { z } from "zod";
import type { StrategieGeneree } from "../types/strategie.ts";

const schemaStat = z.enum(["hp", "atk", "def", "spa", "spd", "spe"]);
const schemaRepartition = z.partialRecord(schemaStat, z.number());
const schemaPart = z.object({ nom: z.string(), pourcentage: z.number() });

const schemaSet = z.object({
  nom: z.string(),
  format: z.string(),
  generation: z.number(),
  capacites: z.array(z.array(z.string())),
  talents: z.array(z.string()),
  objets: z.array(z.string()),
  natures: z.array(z.string()),
  evs: schemaRepartition,
  ivs: schemaRepartition,
  teras: z.array(z.string()),
});

const schemaUsage = z.object({
  tier: z.string(),
  rang: z.number(),
  pourcentage: z.number(),
  capacites: z.array(schemaPart),
  objets: z.array(schemaPart),
  talents: z.array(schemaPart),
  teras: z.array(schemaPart),
  spreads: z.array(
    z.object({
      nature: z.string(),
      evs: schemaRepartition,
      pourcentage: z.number(),
    }),
  ),
});

/** Validation du fichier généré : le JSON importé n'est pas typé finement par TypeScript. */
export const schemaStrategieGeneree: z.ZodType<StrategieGeneree> = z.object({
  genereLe: z.string(),
  parEspece: z.record(
    z.string(),
    z.object({
      tier: z.string().nullable(),
      generationTier: z.number().nullable(),
      usage: schemaUsage.nullable(),
      sets: z.array(schemaSet),
    }),
  ),
  efficacites: z.record(z.string(), z.record(z.string(), z.number())),
  typesCapacites: z.record(z.string(), z.string()),
  traductions: z.object({
    capacites: z.record(z.string(), z.string()),
    objets: z.record(z.string(), z.string()),
    talents: z.record(z.string(), z.string()),
    types: z.record(z.string(), z.string()),
  }),
  natures: z.record(
    z.string(),
    z.object({
      nomFr: z.string(),
      hausse: schemaStat.nullable(),
      baisse: schemaStat.nullable(),
    }),
  ),
});
