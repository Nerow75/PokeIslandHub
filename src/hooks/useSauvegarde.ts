// src/hooks/useSauvegarde.ts

import { useCallback, useEffect, useRef, useState } from "react";
import type { Chasse } from "../domaine/chasse.ts";
import type { ReglagesCompletion } from "../domaine/completion.ts";
import {
  lireSauvegardeDepuisTexte,
  serialiserSauvegarde,
  type Sauvegarde,
} from "../domaine/sauvegarde.ts";
import type { StatutPokemon } from "../domaine/statut.ts";
import {
  chargerSauvegardeFichier,
  enregistrerSauvegardeFichier,
} from "../domaine/stockageFichierClient.ts";
import { chargerSauvegardeLocale, enregistrerSauvegardeLocale } from "../domaine/stockageLocal.ts";

export type ResultatImport = { succes: true } | { succes: false; erreur: string };

/**
 * "synchronisation" : lecture du fichier en cours.
 * "fichier" : donnees/sauvegarde.json fait foi, le navigateur garde une copie de secours.
 * "navigateur" : pas de serveur de dev (build statique), localStorage seul.
 */
export type ModeStockage = "synchronisation" | "fichier" | "navigateur";

/* Regroupe les clics rapprochés en une seule écriture du fichier. */
const DELAI_ECRITURE_MS = 300;

/**
 * État de la progression du joueur. Source de vérité : le fichier du projet
 * (via le serveur de dev) ; copie de secours dans le navigateur.
 */
export function useSauvegarde() {
  const [chargementInitial] = useState(chargerSauvegardeLocale);
  const [sauvegarde, setSauvegarde] = useState<Sauvegarde>(chargementInitial.sauvegarde);
  /* Incrémenté à chaque import réussi : permet de réinitialiser les champs non contrôlés. */
  const [nombreImports, setNombreImports] = useState(0);
  const [avertissement, setAvertissement] = useState<string | null>(
    chargementInitial.avertissement,
  );
  const [modeStockage, setModeStockage] = useState<ModeStockage>("synchronisation");
  const derniereSauvegarde = useRef(sauvegarde);
  const ecritureEnAttente = useRef(false);

  /* Au démarrage : le fichier fait foi. Absent, il est créé avec la progression du navigateur. */
  useEffect(() => {
    let estActif = true;
    void chargerSauvegardeFichier().then(async (resultat) => {
      if (!estActif) return;
      if (resultat.etat === "trouvee") {
        setSauvegarde(resultat.sauvegarde);
        setModeStockage("fichier");
        return;
      }
      if (resultat.etat === "indisponible") {
        setModeStockage("navigateur");
        return;
      }
      if (resultat.avertissement) setAvertissement(resultat.avertissement);
      const estEcrite = await enregistrerSauvegardeFichier(derniereSauvegarde.current);
      if (estActif) setModeStockage(estEcrite ? "fichier" : "navigateur");
    });
    return () => {
      estActif = false;
    };
  }, []);

  useEffect(() => {
    derniereSauvegarde.current = sauvegarde;
    if (!enregistrerSauvegardeLocale(sauvegarde)) {
      // oxlint-disable-next-line react/set-state-in-effect -- signale l'échec d'écriture du système externe (localStorage), uniquement en cas d'erreur
      setAvertissement("Écriture impossible dans le stockage du navigateur : pensez à exporter.");
    }
    if (modeStockage !== "fichier") return;
    ecritureEnAttente.current = true;
    const minuteur = setTimeout(() => {
      ecritureEnAttente.current = false;
      void enregistrerSauvegardeFichier(sauvegarde).then((estEcrite) => {
        if (!estEcrite) {
          setAvertissement(
            "Écriture du fichier de sauvegarde impossible : le serveur de dev est-il lancé ? La copie du navigateur reste à jour.",
          );
        }
      });
    }, DELAI_ECRITURE_MS);
    return () => clearTimeout(minuteur);
  }, [sauvegarde, modeStockage]);

  /* Fermeture de l'onglet pendant le délai d'écriture : envoi immédiat. */
  useEffect(() => {
    const viderEcriture = (): void => {
      if (!ecritureEnAttente.current) return;
      ecritureEnAttente.current = false;
      void enregistrerSauvegardeFichier(derniereSauvegarde.current, { keepalive: true });
    };
    window.addEventListener("pagehide", viderEcriture);
    return () => window.removeEventListener("pagehide", viderEcriture);
  }, []);

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

  const modifierChasse = (modifier: (chasse: Chasse) => Chasse): void => {
    setSauvegarde((precedente) => ({ ...precedente, chasse: modifier(precedente.chasse) }));
  };

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
    modeStockage,
    nombreImports,
    avertissement,
    fermerAvertissement: () => setAvertissement(null),
    statutDe,
    definirStatut,
    modifierReglagesCompletion,
    modifierChasse,
    importer,
    exporter,
  };
}
