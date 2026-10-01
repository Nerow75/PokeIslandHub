// src/domaine/sauvegarde.ts

import { z } from "zod";
import { REGLAGES_COMPLETION_PAR_DEFAUT } from "./completion.ts";

/*
 * Format de la sauvegarde utilisateur.
 * Toute évolution du format incrémente VERSION_SAUVEGARDE et ajoute une
 * migration dans MIGRATIONS : une ancienne sauvegarde ne doit jamais être perdue.
 */

export const VERSION_SAUVEGARDE = 2;

const schemaReglagesCompletion = z.object({
  base: z.enum(["capture", "vu"]),
  totalManuel: z.number().int().positive().nullable(),
  objectif: z.number().min(0).max(100),
});

export const schemaSauvegarde = z.object({
  version: z.literal(VERSION_SAUVEGARDE),
  /** Slug d'espèce -> statut. Une espèce absente est "non vue". */
  statuts: z.record(z.string(), z.enum(["vu", "capture"])),
  reglagesCompletion: schemaReglagesCompletion,
});

export type Sauvegarde = z.infer<typeof schemaSauvegarde>;

export type ResultatLecture =
  { succes: true; sauvegarde: Sauvegarde } | { succes: false; erreur: string };

/* Anciennes valeurs par défaut du total, remplacées par le calcul automatique. */
const ANCIENS_TOTAUX_PAR_DEFAUT = new Set([1025, 1045]);

/**
 * Migrations successives : MIGRATIONS[n] convertit une sauvegarde de version n
 * en version n + 1.
 */
const MIGRATIONS: Record<number, (donnees: Record<string, unknown>) => Record<string, unknown>> = {
  /* v1 -> v2 : "total" fixe devient "totalManuel", null quand c'était une valeur par défaut. */
  1: (donnees) => {
    const reglages = estObjet(donnees["reglagesCompletion"]) ? donnees["reglagesCompletion"] : {};
    const { total, ...autresReglages } = reglages;
    const totalManuel =
      typeof total === "number" && !ANCIENS_TOTAUX_PAR_DEFAUT.has(total) ? total : null;
    return {
      ...donnees,
      version: 2,
      reglagesCompletion: { ...autresReglages, totalManuel },
    };
  },
};

export function sauvegardeVide(): Sauvegarde {
  return {
    version: VERSION_SAUVEGARDE,
    statuts: {},
    reglagesCompletion: { ...REGLAGES_COMPLETION_PAR_DEFAUT },
  };
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

/** Valide des données brutes et les amène à la version courante. */
export function lireSauvegarde(donnees: unknown): ResultatLecture {
  if (!estObjet(donnees)) {
    return { succes: false, erreur: "Le fichier ne contient pas une sauvegarde PokeIslandHub." };
  }
  const version = donnees["version"];
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { succes: false, erreur: "Numéro de version de sauvegarde absent ou invalide." };
  }
  if (version > VERSION_SAUVEGARDE) {
    return {
      succes: false,
      erreur: `Sauvegarde en version ${version}, plus récente que l'application (version ${VERSION_SAUVEGARDE}).`,
    };
  }

  let courante = donnees;
  for (let v = version; v < VERSION_SAUVEGARDE; v++) {
    const migrer = MIGRATIONS[v];
    if (!migrer) {
      return { succes: false, erreur: `Aucune migration disponible depuis la version ${v}.` };
    }
    courante = migrer(courante);
  }

  const resultat = schemaSauvegarde.safeParse(courante);
  if (!resultat.success) {
    const probleme = resultat.error.issues[0];
    const chemin = probleme?.path.join(".") || "racine";
    return {
      succes: false,
      erreur: `Sauvegarde invalide (${chemin}) : ${probleme?.message ?? "format inattendu"}.`,
    };
  }
  return { succes: true, sauvegarde: resultat.data };
}

/** Lit une sauvegarde depuis le texte d'un fichier JSON importé. */
export function lireSauvegardeDepuisTexte(texte: string): ResultatLecture {
  let donnees: unknown;
  try {
    donnees = JSON.parse(texte);
  } catch {
    return { succes: false, erreur: "Le fichier n'est pas un JSON valide." };
  }
  return lireSauvegarde(donnees);
}

export function serialiserSauvegarde(sauvegarde: Sauvegarde): string {
  return JSON.stringify(sauvegarde, null, 2);
}
