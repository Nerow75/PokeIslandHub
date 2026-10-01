// src/hooks/useSauvegarde.ts

import { useCallback, useEffect, useState } from "react";
import type { ReglagesCompletion } from "../domaine/completion.ts";
import {
  lireSauvegardeDepuisTexte,
  serialiserSauvegarde,
  type Sauvegarde,
} from "../domaine/sauvegarde.ts";
import type { StatutPokemon } from "../domaine/statut.ts";
import {
  chargerSauvegardeLocale,
  enregistrerSauvegardeLocale,
} from "../domaine/stockageLocal.ts";

export type ResultatImport = { succes: true } | { succes: false; erreur: string };

/**
 * État de la progression du joueur, persisté dans le navigateur à chaque modification.
 */
export function useSauvegarde() {
  const [chargementInitial] = useState(chargerSauvegardeLocale);
  const [sauvegarde, setSauvegarde] = useState<Sauvegarde>(chargementInitial.sauvegarde);
  /* Incrémenté à chaque import réussi : permet de réinitialiser les champs non contrôlés. */
  const [nombreImports, setNombreImports] = useState(0);
  const [avertissement, setAvertissement] = useState<string | null>(
    chargementInitial.avertissement,
  );

  useEffect(() => {
    if (!enregistrerSauvegardeLocale(sauvegarde)) {
      // oxlint-disable-next-line react/set-state-in-effect -- signale l'échec d'écriture du système externe (localStorage), uniquement en cas d'erreur
      setAvertissement("Écriture impossible dans le stockage du navigateur : pensez à exporter.");
    }
  }, [sauvegarde]);

  const statutDe = (slug: string): StatutPokemon => sauvegarde.statuts[slug] ?? "non-vu";

  /* Référence stable : chaque carte du Pokédex (plus de 1000) est mémoïsée sur ce callback. */
  const definirStatut = useCallback((slug: string, statut: StatutPokemon): void => {
    setSauvegarde((precedente) => {
      const statuts = { ...precedente.statuts };
      if (statut === "non-vu") {
        delete statuts[slug];
      } else {
        statuts[slug] = statut;
      }
      return { ...precedente, statuts };
    });
  }, []);

  const modifierReglagesCompletion = (reglages: ReglagesCompletion): void => {
    setSauvegarde((precedente) => ({ ...precedente, reglagesCompletion: reglages }));
  };

  /** Remplace la sauvegarde par le contenu importé, seulement s'il est valide. */
  const importer = (texte: string): ResultatImport => {
    const resultat = lireSauvegardeDepuisTexte(texte);
    if (!resultat.succes) {
      return resultat;
    }
    setSauvegarde(resultat.sauvegarde);
    setNombreImports((n) => n + 1);
    return { succes: true };
  };

  const exporter = (): string => serialiserSauvegarde(sauvegarde);

  return {
    sauvegarde,
    nombreImports,
    avertissement,
    fermerAvertissement: () => setAvertissement(null),
    statutDe,
    definirStatut,
    modifierReglagesCompletion,
    importer,
    exporter,
  };
}
