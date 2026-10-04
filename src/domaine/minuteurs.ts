// src/domaine/minuteurs.ts

/*
 * Minuteurs du serveur : votes, dresseurs à recombattre, PokéStops à retourner.
 * Chaque action impose un délai avant de pouvoir la refaire. Le joueur signale
 * qu'il l'a faite, le hub calcule quand la refaire.
 */

export type CategorieMinuteur = "vote" | "dresseur" | "pokestop";

export interface Minuteur {
  id: string;
  nom: string;
  categorie: CategorieMinuteur;
  /** Lien utile (site de vote...), http ou https, ou null. */
  url: string | null;
  delaiMinutes: number;
  /** Instant de la dernière fois, ISO 8601 UTC, ou null. */
  dernier: string | null;
}

export const CATEGORIES_MINUTEUR: readonly CategorieMinuteur[] = ["vote", "dresseur", "pokestop"];

/** Libellés propres à chaque catégorie : titre de section, action, nouvel élément. */
export const LIBELLES_CATEGORIE: Record<
  CategorieMinuteur,
  { titre: string; action: string; fait: string; nouveau: string; disponible: string }
> = {
  vote: {
    titre: "Votes",
    action: "J'ai voté",
    fait: "Dernier vote",
    nouveau: "Nouveau vote",
    disponible: "tu peux revoter",
  },
  dresseur: {
    titre: "Dresseurs",
    action: "Battu",
    fait: "Dernier combat",
    nouveau: "Nouveau dresseur",
    disponible: "tu peux le recombattre",
  },
  pokestop: {
    titre: "PokéStops",
    action: "Tournés",
    fait: "Dernier passage",
    nouveau: "Nouveaux PokéStops",
    disponible: "tu peux les retourner",
  },
};

/** Délai proposé pour un nouvel élément de chaque catégorie, en minutes. */
export const DELAI_PAR_DEFAUT: Record<CategorieMinuteur, number> = {
  vote: 24 * 60,
  dresseur: 4 * 60,
  pokestop: 60,
};

/** Minuteurs connus du serveur ; liens de vote à renseigner par le joueur. */
export function minuteursParDefaut(): Minuteur[] {
  return [
    {
      id: "vote-2h",
      nom: "Vote toutes les 2 h",
      categorie: "vote",
      url: null,
      delaiMinutes: 120,
      dernier: null,
    },
    {
      id: "vote-24h",
      nom: "Vote toutes les 24 h",
      categorie: "vote",
      url: null,
      delaiMinutes: 24 * 60,
      dernier: null,
    },
    ...minuteursDresseursEtPokestops(),
  ];
}

/** Dresseurs et PokéStops du serveur, ajoutés aux sauvegardes qui n'en avaient pas. */
export function minuteursDresseursEtPokestops(): Minuteur[] {
  return [
    {
      id: "dresseur-leo",
      nom: "Léo (spawn)",
      categorie: "dresseur",
      url: null,
      delaiMinutes: 4 * 60,
      dernier: null,
    },
    {
      id: "dresseur-arene-eau",
      nom: "Arène Eau (monde de l'eau)",
      categorie: "dresseur",
      url: null,
      delaiMinutes: 4 * 60,
      dernier: null,
    },
    {
      id: "pokestops-spawn",
      nom: "PokéStops du spawn",
      categorie: "pokestop",
      url: null,
      delaiMinutes: 60,
      dernier: null,
    },
    {
      id: "pokestops-monde-eau",
      nom: "PokéStops du monde de l'eau",
      categorie: "pokestop",
      url: null,
      delaiMinutes: 60,
      dernier: null,
    },
  ];
}

/** Nouvel élément d'une catégorie, avec un identifiant unique. */
export function nouveauMinuteur(categorie: CategorieMinuteur, maintenant: Date): Minuteur {
  return {
    id: `${categorie}-${maintenant.getTime().toString(36)}`,
    nom: LIBELLES_CATEGORIE[categorie].nouveau,
    categorie,
    url: null,
    delaiMinutes: DELAI_PAR_DEFAUT[categorie],
    dernier: null,
  };
}

/** Instant à partir duquel l'action est de nouveau possible, ou null si jamais faite. */
export function prochainPassage(minuteur: Minuteur): Date | null {
  if (!minuteur.dernier) return null;
  return new Date(new Date(minuteur.dernier).getTime() + minuteur.delaiMinutes * 60_000);
}

/** Millisecondes avant de pouvoir refaire l'action (0 si disponible). */
export function attenteAvantPassage(minuteur: Minuteur, maintenant: Date): number {
  const prochain = prochainPassage(minuteur);
  return prochain ? Math.max(0, prochain.getTime() - maintenant.getTime()) : 0;
}

export function estDisponible(minuteur: Minuteur, maintenant: Date): boolean {
  return attenteAvantPassage(minuteur, maintenant) === 0;
}

/** "1:42:07" au-delà d'une heure, "42:07" en dessous. */
export function formaterAttente(millisecondes: number): string {
  const total = Math.ceil(millisecondes / 1000);
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secondes = total % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(secondes).padStart(2, "0")}`;
  return heures > 0 ? `${heures}:${mmss}` : mmss;
}

/** Accepte uniquement un lien http(s) : un lien "javascript:" ne doit jamais être ouvert. */
export function normaliserUrl(saisie: string): string | null {
  const texte = saisie.trim();
  if (!texte) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(texte) ? texte : `https://${texte}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
