// src/domaine/votes.ts

/*
 * Votes pour le serveur : chaque site impose un délai entre deux votes.
 * Le joueur signale son vote, le hub calcule quand revoter.
 */

export interface Vote {
  id: string;
  nom: string;
  /** Lien du site de vote (http ou https), ou null tant qu'il n'est pas renseigné. */
  url: string | null;
  delaiMinutes: number;
  /** Instant du dernier vote, ISO 8601 UTC, ou null. */
  dernierVote: string | null;
}

export function votesParDefaut(): Vote[] {
  return [
    { id: "vote-2h", nom: "Vote toutes les 2 h", url: null, delaiMinutes: 120, dernierVote: null },
    {
      id: "vote-24h",
      nom: "Vote toutes les 24 h",
      url: null,
      delaiMinutes: 24 * 60,
      dernierVote: null,
    },
  ];
}

/** Instant à partir duquel il est possible de revoter, ou null si jamais voté. */
export function prochainVote(vote: Vote): Date | null {
  if (!vote.dernierVote) return null;
  return new Date(new Date(vote.dernierVote).getTime() + vote.delaiMinutes * 60_000);
}

/** Millisecondes avant de pouvoir revoter (0 si disponible). */
export function attenteAvantVote(vote: Vote, maintenant: Date): number {
  const prochain = prochainVote(vote);
  return prochain ? Math.max(0, prochain.getTime() - maintenant.getTime()) : 0;
}

export function estVoteDisponible(vote: Vote, maintenant: Date): boolean {
  return attenteAvantVote(vote, maintenant) === 0;
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
export function normaliserUrlVote(saisie: string): string | null {
  const texte = saisie.trim();
  if (!texte) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(texte) ? texte : `https://${texte}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
