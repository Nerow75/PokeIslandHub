// src/domaine/stockageLocal.ts

import {
  lireSauvegarde,
  sauvegardeVide,
  serialiserSauvegarde,
  type Sauvegarde,
} from "./sauvegarde.ts";

const CLE_SAUVEGARDE = "pokeislandhub:sauvegarde";
const PREFIXE_CLE_ILLISIBLE = "pokeislandhub:sauvegarde-illisible:";

export interface ChargementLocal {
  sauvegarde: Sauvegarde;
  /** Message à afficher si une sauvegarde existante n'a pas pu être relue. */
  avertissement: string | null;
}

/**
 * Charge la sauvegarde du navigateur.
 * Une sauvegarde illisible n'est jamais écrasée : elle est d'abord copiée
 * sous une clé dédiée, puis l'application repart d'une sauvegarde vide.
 */
export function chargerSauvegardeLocale(): ChargementLocal {
  let brut: string | null;
  try {
    brut = localStorage.getItem(CLE_SAUVEGARDE);
  } catch {
    return {
      sauvegarde: sauvegardeVide(),
      avertissement: "Stockage du navigateur inaccessible : la progression ne sera pas conservée.",
    };
  }
  if (brut === null) {
    return { sauvegarde: sauvegardeVide(), avertissement: null };
  }

  let resultat;
  try {
    resultat = lireSauvegarde(JSON.parse(brut));
  } catch {
    resultat = { succes: false as const, erreur: "JSON illisible." };
  }
  if (resultat.succes) {
    return { sauvegarde: resultat.sauvegarde, avertissement: null };
  }

  const cleCopie = `${PREFIXE_CLE_ILLISIBLE}${new Date().toISOString()}`;
  try {
    localStorage.setItem(cleCopie, brut);
  } catch {
    /* Sans copie possible, l'avertissement ci-dessous reste la seule trace. */
  }
  return {
    sauvegarde: sauvegardeVide(),
    avertissement: `Sauvegarde existante illisible (${resultat.erreur}). Elle a été conservée sous la clé "${cleCopie}".`,
  };
}

export function enregistrerSauvegardeLocale(sauvegarde: Sauvegarde): boolean {
  try {
    localStorage.setItem(CLE_SAUVEGARDE, serialiserSauvegarde(sauvegarde));
    return true;
  } catch {
    return false;
  }
}
