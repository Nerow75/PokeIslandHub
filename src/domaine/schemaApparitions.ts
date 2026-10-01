// src/domaine/schemaApparitions.ts

import { z } from "zod";
import type { ApparitionsGenerees } from "../types/apparitions.ts";

const schemaApparition = z.object({
  rarete: z.enum(["common", "uncommon", "rare", "ultra-rare"]),
  niveaux: z.string(),
  position: z.string(),
  contextes: z.array(z.string()),
  biomes: z.array(z.string()),
  biomesExclus: z.array(z.string()),
  structures: z.array(z.string()),
  blocsProches: z.array(z.string()),
  aspect: z.string().optional(),
  moment: z.string().optional(),
  pluie: z.boolean().optional(),
  orage: z.boolean().optional(),
  cielVisible: z.boolean().optional(),
  phaseLune: z.string().optional(),
  yMin: z.number().optional(),
  yMax: z.number().optional(),
  leurreMin: z.number().optional(),
});

/** Validation du fichier généré : le JSON importé n'est pas typé finement par TypeScript. */
export const schemaApparitionsGenerees: z.ZodType<ApparitionsGenerees> = z.object({
  versionCobblemon: z.string(),
  genereLe: z.string(),
  parEspece: z.record(z.string(), z.array(schemaApparition)),
});
