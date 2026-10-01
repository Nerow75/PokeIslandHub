// src/domaine/conditionsEvolution.ts

import type { ConditionEvolution } from "../types/pokedex.ts";

/** Tables de traduction nécessaires à la description d'une condition. */
export interface Traductions {
  objets: Readonly<Record<string, string>>;
  capacites: Readonly<Record<string, string>>;
  types: Readonly<Record<string, string>>;
  /** Slug d'espèce -> nom français. */
  especes: (slug: string) => string;
}

/* Libellés des déclencheurs PokeAPI qui ne se résument pas à un niveau ou un objet. */
const LIBELLES_DECLENCHEUR: Record<string, string> = {
  "level-up": "Montée de niveau",
  "use-item": "Objet",
  trade: "Échange",
  "use-move": "Utiliser une capacité",
  shed: "Place libre dans l'équipe et Poké Ball dans le sac",
  spin: "Tourner sur soi-même en tenant une Sucrerie",
  "three-critical-hits": "Trois coups critiques en un combat",
  "take-damage": "Subir des dégâts puis passer sous une arche",
  "recoil-damage": "Subir des dégâts de contrecoup",
  "agile-style-move": "Capacité en style Rapide",
  "strong-style-move": "Capacité en style Puissant",
  "tower-of-darkness": "Rouleau des Ténèbres",
  "tower-of-waters": "Rouleau de l'Eau",
  "three-defeated-bisharp": "Vaincre trois Scalproie menant un groupe",
  "meltan-candies": "Bonbons Meltan",
  "gimmighoul-coins": "Pièces de Mordudor",
  "in-battle-level-up": "Montée de niveau en combat",
};

const MOMENTS: Record<string, string> = {
  day: "le jour",
  night: "la nuit",
  dusk: "au crépuscule",
  "full-moon": "à la pleine lune",
};

const STATS_RELATIVES: Record<number, string> = {
  1: "Attaque > Défense",
  0: "Attaque = Défense",
  [-1]: "Attaque < Défense",
};

function libelleSlug(slug: string): string {
  return slug.replaceAll("-", " ");
}

function aDesCriteresPropres(condition: ConditionEvolution): boolean {
  return (
    condition.bonheurMin !== undefined ||
    condition.affectionMin !== undefined ||
    condition.beauteMin !== undefined ||
    condition.capaciteConnue !== undefined ||
    condition.typeCapaciteConnue !== undefined ||
    condition.lieu !== undefined ||
    condition.especeEquipe !== undefined ||
    condition.typeEquipe !== undefined ||
    condition.statsPhysiquesRelatives !== undefined ||
    condition.objetTenu !== undefined
  );
}

/**
 * Décrit une condition d'évolution en français, ex. "Niveau 16" ou
 * "Objet : Pierre Eau" ou "Bonheur ≥ 160, le jour".
 */
export function decrireCondition(condition: ConditionEvolution, traductions: Traductions): string {
  const parties: string[] = [];
  const { declencheur } = condition;

  if (declencheur === "level-up" && condition.niveauMin !== undefined) {
    parties.push(`Niveau ${condition.niveauMin}`);
  } else if (declencheur === "use-item" && condition.objet) {
    parties.push(`Objet : ${traductions.objets[condition.objet] ?? libelleSlug(condition.objet)}`);
  } else if (declencheur !== "level-up" || !aDesCriteresPropres(condition)) {
    /* Une montée de niveau sans niveau minimal se décrit par ses autres critères. */
    parties.push(LIBELLES_DECLENCHEUR[declencheur] ?? libelleSlug(declencheur));
  }

  if (declencheur !== "level-up" && condition.niveauMin !== undefined) {
    parties.push(`niveau ${condition.niveauMin} min.`);
  }
  if (declencheur !== "use-item" && condition.objet) {
    parties.push(`avec ${traductions.objets[condition.objet] ?? libelleSlug(condition.objet)}`);
  }
  if (condition.objetTenu) {
    parties.push(
      `en tenant ${traductions.objets[condition.objetTenu] ?? libelleSlug(condition.objetTenu)}`,
    );
  }
  if (condition.bonheurMin !== undefined) parties.push(`Bonheur ≥ ${condition.bonheurMin}`);
  if (condition.affectionMin !== undefined) parties.push(`Affection ≥ ${condition.affectionMin}`);
  if (condition.beauteMin !== undefined) parties.push(`Beauté ≥ ${condition.beauteMin}`);
  if (condition.capaciteConnue) {
    const capacite =
      traductions.capacites[condition.capaciteConnue] ?? libelleSlug(condition.capaciteConnue);
    parties.push(`en connaissant ${capacite}`);
  }
  if (condition.typeCapaciteConnue) {
    const type =
      traductions.types[condition.typeCapaciteConnue] ?? libelleSlug(condition.typeCapaciteConnue);
    parties.push(`en connaissant une capacité ${type}`);
  }
  if (condition.especeEquipe) {
    parties.push(`avec ${traductions.especes(condition.especeEquipe)} dans l'équipe`);
  }
  if (condition.typeEquipe) {
    const type = traductions.types[condition.typeEquipe] ?? libelleSlug(condition.typeEquipe);
    parties.push(`avec un Pokémon ${type} dans l'équipe`);
  }
  if (condition.especeEchange) {
    parties.push(`contre ${traductions.especes(condition.especeEchange)}`);
  }
  if (condition.statsPhysiquesRelatives !== undefined) {
    const relation = STATS_RELATIVES[condition.statsPhysiquesRelatives];
    if (relation) parties.push(relation);
  }
  if (condition.sexe === 1) parties.push("femelle");
  if (condition.sexe === 2) parties.push("mâle");
  if (condition.momentDeLaJournee) {
    parties.push(MOMENTS[condition.momentDeLaJournee] ?? condition.momentDeLaJournee);
  }
  if (condition.lieu) parties.push(`à un lieu précis (${libelleSlug(condition.lieu)})`);
  if (condition.pluieRequise) parties.push("sous la pluie");
  if (condition.consoleRetournee) parties.push("console retournée");

  return parties.join(", ");
}

/** Plus petit niveau requis parmi les conditions, pour trier les évolutions. */
export function niveauMinimal(conditions: ConditionEvolution[]): number | null {
  const niveaux = conditions
    .map((condition) => condition.niveauMin)
    .filter((niveau): niveau is number => niveau !== undefined);
  return niveaux.length > 0 ? Math.min(...niveaux) : null;
}
