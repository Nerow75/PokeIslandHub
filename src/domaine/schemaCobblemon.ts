// src/domaine/schemaCobblemon.ts

import { z } from "zod";
import type { CobblemonGenere } from "../types/cobblemon.ts";

const schemaCondition = z
  .object({ variant: z.string() })
  .catchall(z.union([z.string(), z.number(), z.boolean()]));

const schemaEvolution = z.object({
  vers: z.string(),
  aspectObtenu: z.string().optional(),
  aspectDepart: z.string().optional(),
  mode: z.string(),
  contexte: z.string().optional(),
  conditions: z.array(schemaCondition),
});

/** Validation du fichier généré : le JSON importé n'est pas typé finement par TypeScript. */
export const schemaCobblemonGenere: z.ZodType<CobblemonGenere> = z.object({
  versionCobblemon: z.string(),
  genereLe: z.string(),
  parEspece: z.record(
    z.string(),
    z.object({
      implementee: z.boolean(),
      etiquettes: z.array(z.string()),
      evolutions: z.array(schemaEvolution),
    }),
  ),
  objets: z.record(z.string(), z.string()),
  capacites: z.record(z.string(), z.string()),
});
