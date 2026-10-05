// src/domaine/sauvegarde.ts

import { z } from "zod";
import { chasseVide, NOMBRE_POKEMON_CHASSE } from "./chasse.ts";
import { REGLAGES_COMPLETION_PAR_DEFAUT } from "./completion.ts";
import { choixEquipeVide, TAILLE_EQUIPE } from "./equipe.ts";
import {
  CATEGORIES_MINUTEUR,
  minuteursDresseursEtPokestops,
  minuteursParDefaut,
} from "./minuteurs.ts";

/*
 * Format de la sauvegarde utilisateur.
 * Toute évolution du format incrémente VERSION_SAUVEGARDE et ajoute une
 * migration dans MIGRATIONS : une ancienne sauvegarde ne doit jamais être perdue.
 */

export const VERSION_SAUVEGARDE = 8;

const schemaReglagesCompletion = z.object({
  base: z.enum(["capture", "vu"]),
  totalManuel: z.number().int().positive().nullable(),
  objectif: z.number().min(0).max(100),
});

const schemaChasse = z.object({
  /** Slugs des Pokémon à capturer, dans l'ordre de saisie. */
  especes: z.array(z.string()).max(NOMBRE_POKEMON_CHASSE),
  /** Slugs déjà capturés pendant cette chasse. */
  capturees: z.array(z.string()),
  /** Début du minuteur, ISO 8601 UTC, ou null si non lancé. */
  debut: z.iso.datetime().nullable(),
});

const schemaMinuteur = z.object({
  id: z.string().min(1),
  nom: z.string().min(1).max(60),
  categorie: z.enum(CATEGORIES_MINUTEUR),
  /* http(s) uniquement : le lien est ouvert tel quel. */
  url: z.url({ protocol: /^https?$/ }).nullable(),
  delaiMinutes: z.number().int().positive(),
  dernier: z.iso.datetime().nullable(),
});

const schemaEquipe = z.object({
  /** Slugs imposés dans l'équipe proposée. */
  epingles: z.array(z.string()).max(TAILLE_EQUIPE),
  /** Slugs à ne jamais proposer. */
  exclus: z.array(z.string()),
});

export const schemaSauvegarde = z.object({
  version: z.literal(VERSION_SAUVEGARDE),
  /** Slug d'espèce -> statut. Une espèce absente est "non vue". */
  statuts: z.record(z.string(), z.enum(["vu", "capture"])),
  reglagesCompletion: schemaReglagesCompletion,
  chasse: schemaChasse,
  /** Votes, dresseurs et PokéStops avec leur délai. */
  minuteurs: z.array(schemaMinuteur),
  equipe: schemaEquipe,
});

export type Sauvegarde = z.infer<typeof schemaSauvegarde>;

export type ResultatLecture =
  { succes: true; sauvegarde: Sauvegarde } | { succes: false; erreur: string };

/* Votes par défaut au format v4, figés : la migration v3 -> v4 ne doit pas suivre le format courant. */
const VOTES_V4_PAR_DEFAUT = [
  { id: "vote-2h", nom: "Vote toutes les 2 h", url: null, delaiMinutes: 120, dernierVote: null },
  { id: "vote-24h", nom: "Vote toutes les 24 h", url: null, delaiMinutes: 1440, dernierVote: null },
] as const;

/* Anciennes valeurs par défaut du total, remplacées par le calcul automatique. */
const ANCIENS_TOTAUX_PAR_DEFAUT = new Set([1025, 1045]);

/** Complète les minuteurs avec ceux du serveur encore absents, sans toucher aux existants. */
function ajouterMinuteursServeurAbsents(
  donnees: Record<string, unknown>,
  version: number,
): Record<string, unknown> {
  const minuteurs = Array.isArray(donnees["minuteurs"]) ? donnees["minuteurs"] : [];
  const ids = new Set(minuteurs.map((m: unknown) => (estObjet(m) ? m["id"] : undefined)));
  return {
    ...donnees,
    version,
    minuteurs: [...minuteurs, ...minuteursDresseursEtPokestops().filter((m) => !ids.has(m.id))],
  };
}

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
  /* v2 -> v3 : ajout de la chasse en cours, vide. */
  2: (donnees) => ({ ...donnees, version: 3, chasse: chasseVide() }),
  /* v3 -> v4 : ajout des votes (2 h et 24 h), liens à renseigner. */
  3: (donnees) => ({
    ...donnees,
    version: 4,
    votes: VOTES_V4_PAR_DEFAUT.map((vote) => ({ ...vote })),
  }),
  /* v4 -> v5 : ajout des choix d'équipe (onglet Stratégie), vides. */
  4: (donnees) => ({ ...donnees, version: 5, equipe: choixEquipeVide() }),
  /*
   * v5 -> v6 : les votes deviennent des minuteurs de catégorie "vote" (dernierVote -> dernier),
   * et les dresseurs et PokéStops du serveur sont ajoutés.
   */
  5: (donnees) => {
    const { votes, ...reste } = donnees;
    const anciensVotes = Array.isArray(votes) ? votes : [];
    return {
      ...reste,
      version: 6,
      minuteurs: [
        ...anciensVotes.map((vote: unknown) => {
          const { dernierVote, ...champs } = estObjet(vote) ? vote : {};
          return { ...champs, categorie: "vote", dernier: dernierVote ?? null };
        }),
        ...minuteursDresseursEtPokestops(),
      ],
    };
  },
  /* v6 -> v7 : ajout des minuteurs du serveur encore absents (PokéStops du monde de l'eau). */
  6: (donnees) => ajouterMinuteursServeurAbsents(donnees, 7),
  /* v7 -> v8 : idem pour les PokéStops des mondes feu, Frozen, Ghost, Rock, Plante et Messa. */
  7: (donnees) => ajouterMinuteursServeurAbsents(donnees, 8),
};

export function sauvegardeVide(): Sauvegarde {
  return {
    version: VERSION_SAUVEGARDE,
    statuts: {},
    reglagesCompletion: { ...REGLAGES_COMPLETION_PAR_DEFAUT },
    chasse: chasseVide(),
    minuteurs: minuteursParDefaut(),
    equipe: choixEquipeVide(),
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
