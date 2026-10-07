// src/domaine/famille.ts

import type { EvolutionAffichee } from "./evolutionsAFaire.ts";

/* Arbre d'évolution complet d'une famille (Évoli et ses huit évolutions, etc.). */

export interface BrancheEvolution {
  /** Toutes les façons d'obtenir l'espèce `noeud.slug` depuis le parent. */
  evolutions: EvolutionAffichee[];
  noeud: NoeudFamille;
}

export interface NoeudFamille {
  slug: string;
  branches: BrancheEvolution[];
}

/** Remonte jusqu'à la forme de base de la famille. */
export function racineFamille(
  slug: string,
  parentsDe: (slug: string) => readonly string[],
): string {
  const parcourus = new Set<string>([slug]);
  let courant = slug;
  for (;;) {
    const parent = parentsDe(courant)[0];
    if (!parent || parcourus.has(parent)) return courant;
    parcourus.add(parent);
    courant = parent;
  }
}

/**
 * Construit l'arbre depuis `racine`. Les évolutions vers une même espèce
 * (variantes d'objet, de moment...) sont regroupées sur une seule branche.
 */
export function construireArbre(
  racine: string,
  evolutionsDe: (slug: string) => readonly EvolutionAffichee[],
): NoeudFamille {
  const parcourus = new Set<string>();
  const construire = (slug: string): NoeudFamille => {
    parcourus.add(slug);
    const parCible = new Map<string, EvolutionAffichee[]>();
    for (const evolution of evolutionsDe(slug)) {
      const liste = parCible.get(evolution.vers) ?? [];
      liste.push(evolution);
      parCible.set(evolution.vers, liste);
    }
    const branches: BrancheEvolution[] = [];
    for (const [vers, evolutions] of parCible) {
      /* Garde-fou : une donnée cyclique ne doit pas boucler indéfiniment. */
      if (parcourus.has(vers)) continue;
      branches.push({ evolutions, noeud: construire(vers) });
    }
    return { slug, branches };
  };
  return construire(racine);
}

/** Nombre d'espèces dans l'arbre, racine comprise. */
export function tailleFamille(noeud: NoeudFamille): number {
  return 1 + noeud.branches.reduce((total, b) => total + tailleFamille(b.noeud), 0);
}

/**
 * Espèces que des captures permettent d'obtenir par évolution sans être capturées
 * elles-mêmes : slug obtenu -> slug capturé dont il descend. Le parcours en largeur
 * part de toutes les captures à la fois, l'ancêtre le plus proche l'emporte.
 */
export function evolutionsAccessibles(
  captures: readonly string[],
  suivantesDe: (slug: string) => readonly string[],
): Map<string, string> {
  const dejaCaptures = new Set(captures);
  const accessibles = new Map<string, string>();
  let front = captures.map((slug) => ({ slug, origine: slug }));
  while (front.length > 0) {
    const suivant: typeof front = [];
    for (const { slug, origine } of front) {
      for (const vers of suivantesDe(slug)) {
        if (dejaCaptures.has(vers) || accessibles.has(vers)) continue;
        accessibles.set(vers, origine);
        suivant.push({ slug: vers, origine });
      }
    }
    front = suivant;
  }
  return accessibles;
}
