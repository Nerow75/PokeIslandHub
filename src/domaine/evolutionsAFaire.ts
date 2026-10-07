// src/domaine/evolutionsAFaire.ts

import type { EspecePokemon } from "../types/pokedex.ts";
import type { StatutPokemon } from "./statut.ts";

/**
 * "mes-captures" : évolutions de mes Pokémon capturés vers une espèce pas encore capturée.
 * "tout" : référence de toutes les évolutions du Pokédex.
 */
export type PorteeEvolutions = "mes-captures" | "tout";

/** Une évolution prête à afficher, quelle que soit la source des données. */
export interface EvolutionAffichee {
  vers: string;
  niveau: number | null;
  description: string;
  /** Aspect requis de la forme de départ (ex. "galarian"). */
  aspectDepart?: string;
  /** Aspect de la forme obtenue (ex. "alolan"). */
  aspectObtenu?: string;
}

/**
 * Clé unique d'une évolution parmi celles d'une espèce : deux variantes peuvent
 * partager description et aspect de départ en ne différant que par la forme obtenue.
 */
export function cleEvolution(evolution: EvolutionAffichee): string {
  return [evolution.vers, evolution.aspectDepart, evolution.aspectObtenu, evolution.description]
    .map((partie) => partie ?? "")
    .join("|");
}

export interface EvolutionAFaire {
  depuis: EspecePokemon;
  vers: EspecePokemon;
  evolution: EvolutionAffichee;
  statutCible: StatutPokemon;
}

/** Toutes les façons de faire évoluer une espèce vers une autre, sur une seule ligne. */
export interface GroupeEvolutions {
  depuis: EspecePokemon;
  vers: EspecePokemon;
  statutCible: StatutPokemon;
  /** Plus petit niveau requis parmi les variantes, ou null si aucune ne dépend du niveau. */
  niveau: number | null;
  /** Variante standard (sans aspect) en tête, puis les autres dans l'ordre d'origine. */
  variantes: EvolutionAffichee[];
}

function estVarianteStandard(evolution: EvolutionAffichee): boolean {
  return evolution.aspectDepart === undefined && evolution.aspectObtenu === undefined;
}

/**
 * Regroupe les évolutions d'une même espèce vers une même espèce (formes régionales,
 * tendances...). Le groupe garde la place de sa première évolution dans la liste.
 */
export function regrouperEvolutions(evolutions: readonly EvolutionAFaire[]): GroupeEvolutions[] {
  const groupes = new Map<string, GroupeEvolutions>();
  for (const { depuis, vers, evolution, statutCible } of evolutions) {
    const cle = `${depuis.slug}>${vers.slug}`;
    const groupe = groupes.get(cle);
    if (!groupe) {
      groupes.set(cle, {
        depuis,
        vers,
        statutCible,
        niveau: evolution.niveau,
        variantes: [evolution],
      });
      continue;
    }
    groupe.variantes.push(evolution);
    if (evolution.niveau !== null && (groupe.niveau === null || evolution.niveau < groupe.niveau)) {
      groupe.niveau = evolution.niveau;
    }
  }
  for (const groupe of groupes.values()) {
    /* Tri stable : seule la variante standard remonte. */
    groupe.variantes.sort(
      (a, b) => Number(estVarianteStandard(b)) - Number(estVarianteStandard(a)),
    );
  }
  return [...groupes.values()];
}

export function listerEvolutions(
  especes: readonly EspecePokemon[],
  especesParSlug: ReadonlyMap<string, EspecePokemon>,
  statutDe: (slug: string) => StatutPokemon,
  portee: PorteeEvolutions,
  evolutionsDe: (slug: string) => readonly EvolutionAffichee[],
): EvolutionAFaire[] {
  const resultat: EvolutionAFaire[] = [];
  for (const depuis of especes) {
    if (portee === "mes-captures" && statutDe(depuis.slug) !== "capture") {
      continue;
    }
    for (const evolution of evolutionsDe(depuis.slug)) {
      const vers = especesParSlug.get(evolution.vers);
      if (!vers) {
        continue;
      }
      const statutCible = statutDe(vers.slug);
      if (portee === "mes-captures" && statutCible === "capture") {
        continue;
      }
      resultat.push({ depuis, vers, evolution, statutCible });
    }
  }
  /* Par niveau croissant, les évolutions sans niveau à la fin, puis par numéro. */
  return resultat.sort(
    (a, b) =>
      (a.evolution.niveau ?? Number.POSITIVE_INFINITY) -
        (b.evolution.niveau ?? Number.POSITIVE_INFINITY) ||
      a.depuis.id - b.depuis.id ||
      a.vers.id - b.vers.id,
  );
}
