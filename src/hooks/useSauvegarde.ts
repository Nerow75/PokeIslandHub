// src/hooks/useSauvegarde.ts

import { useCallback, useEffect, useRef, useState } from "react";
import type { Chasse } from "../domaine/chasse.ts";
import type { ReglagesCompletion } from "../domaine/completion.ts";
import type { ChoixEquipe } from "../domaine/equipe.ts";
import {
  lireSauvegardeDepuisTexte,
  serialiserSauvegarde,
  type Sauvegarde,
} from "../domaine/sauvegarde.ts";
import type { StatutPokemon } from "../domaine/statut.ts";
import {
  nouveauMinuteur,
  type CategorieMinuteur,
  type Minuteur,
} from "../domaine/minuteurs.ts";
import {
  chargerSauvegardeFichier,
  enregistrerSauvegardeFichier,
} from "../domaine/stockageFichierClient.ts";
import {
  aDesModificationsNonSynchronisees,
  chargerSauvegardeLocale,
  enregistrerSauvegardeLocale,
  marquerNonSynchronise,
} from "../domaine/stockageLocal.ts";

export type ResultatImport = { succes: true } | { succes: false; erreur: string };

/**
 * "synchronisation" : lecture du fichier en cours.
 * "fichier" : donnees/sauvegarde.json fait foi, le navigateur garde une copie de secours.
 * "navigateur" : pas de serveur de dev (build statique), localStorage seul.
 */
export type ModeStockage = "synchronisation" | "fichier" | "navigateur";

/* Regroupe les clics rapprochés en une seule écriture du fichier. */
const DELAI_ECRITURE_MS = 300;
/* Après un échec (serveur arrêté), nouvel essai à intervalle régulier. */
const DELAI_REESSAI_MS = 5000;

const MESSAGE_ECHEC_ECRITURE =
  "Serveur de dev injoignable : modifications gardées dans le navigateur, elles seront écrites dans le fichier dès son retour.";
const MESSAGE_RECUPERATION =
  "Modifications faites pendant l'arrêt du serveur récupérées depuis le navigateur et enregistrées dans le fichier.";

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
  /* Incrémenté à chaque modification : une écriture ne lève le marqueur que si elle est la dernière. */
  const generation = useRef(0);
  const echecSignale = useRef(false);

  /** Écrit l'état courant dans le fichier et tient à jour le marqueur de synchronisation. */
  const ecrireFichier = useCallback(async (options: { keepalive?: boolean } = {}) => {
    const generationEnvoyee = generation.current;
    const estEcrite = await enregistrerSauvegardeFichier(derniereSauvegarde.current, options);
    if (!estEcrite) {
      echecSignale.current = true;
      setAvertissement(MESSAGE_ECHEC_ECRITURE);
      return;
    }
    if (generationEnvoyee === generation.current) marquerNonSynchronise(false);
    if (echecSignale.current) {
      echecSignale.current = false;
      setAvertissement(null);
    }
  }, []);

  /*
   * Au démarrage : le fichier fait foi, sauf si le navigateur garde des modifications
   * jamais écrites (serveur arrêté entre-temps). Absent, le fichier est créé.
   */
  useEffect(() => {
    let estActif = true;
    void chargerSauvegardeFichier().then(async (resultat) => {
      if (!estActif) return;
      const localPlusRecent = aDesModificationsNonSynchronisees();
      if (resultat.etat === "trouvee" && !localPlusRecent) {
        setSauvegarde(resultat.sauvegarde);
        setModeStockage("fichier");
        return;
      }
      if (resultat.etat === "indisponible") {
        setModeStockage("navigateur");
        return;
      }
      if (resultat.etat === "trouvee") setAvertissement(MESSAGE_RECUPERATION);
      if (resultat.etat === "absente" && resultat.avertissement) {
        setAvertissement(resultat.avertissement);
      }
      const estEcrite = await enregistrerSauvegardeFichier(derniereSauvegarde.current);
      if (!estActif) return;
      if (estEcrite) marquerNonSynchronise(false);
      setModeStockage(estEcrite ? "fichier" : "navigateur");
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
      void ecrireFichier();
    }, DELAI_ECRITURE_MS);
    return () => clearTimeout(minuteur);
  }, [sauvegarde, modeStockage, ecrireFichier]);

  /* Réessai périodique tant que des modifications n'ont pas atteint le fichier. */
  useEffect(() => {
    if (modeStockage !== "fichier") return;
    const minuteur = setInterval(() => {
      if (!ecritureEnAttente.current && aDesModificationsNonSynchronisees()) {
        void ecrireFichier();
      }
    }, DELAI_REESSAI_MS);
    return () => clearInterval(minuteur);
  }, [modeStockage, ecrireFichier]);

  /* Fermeture de l'onglet pendant le délai d'écriture : envoi immédiat. */
  useEffect(() => {
    const viderEcriture = (): void => {
      if (!ecritureEnAttente.current) return;
      ecritureEnAttente.current = false;
      void ecrireFichier({ keepalive: true });
    };
    window.addEventListener("pagehide", viderEcriture);
    return () => window.removeEventListener("pagehide", viderEcriture);
  }, [ecrireFichier]);

  /** Applique une modification du joueur et la marque comme à écrire dans le fichier. */
  const modifier = useCallback((transformer: (precedente: Sauvegarde) => Sauvegarde): void => {
    generation.current += 1;
    marquerNonSynchronise(true);
    setSauvegarde(transformer);
  }, []);

  /* Référence stable : chaque carte du Pokédex (plus de 1000) est mémoïsée sur ce callback. */
  const definirStatut = useCallback(
    (slug: string, statut: StatutPokemon): void => {
      modifier((precedente) => {
        const statuts = { ...precedente.statuts };
        if (statut === "non-vu") {
          delete statuts[slug];
        } else {
          statuts[slug] = statut;
        }
        return { ...precedente, statuts };
      });
    },
    [modifier],
  );

  const modifierChasse = (transformerChasse: (chasse: Chasse) => Chasse): void => {
    modifier((precedente) => ({ ...precedente, chasse: transformerChasse(precedente.chasse) }));
  };

  const modifierMinuteur = (id: string, transformer: (minuteur: Minuteur) => Minuteur): void => {
    modifier((precedente) => ({
      ...precedente,
      minuteurs: precedente.minuteurs.map((m) => (m.id === id ? transformer(m) : m)),
    }));
  };

  /** Ajoute un élément à une catégorie (dresseur, PokéStops...) et renvoie son identifiant. */
  const ajouterMinuteur = (categorie: CategorieMinuteur): string => {
    const minuteur = nouveauMinuteur(categorie, new Date());
    modifier((precedente) => ({ ...precedente, minuteurs: [...precedente.minuteurs, minuteur] }));
    return minuteur.id;
  };

  const supprimerMinuteur = (id: string): void => {
    modifier((precedente) => ({
      ...precedente,
      minuteurs: precedente.minuteurs.filter((m) => m.id !== id),
    }));
  };

  const modifierEquipe = (transformerEquipe: (equipe: ChoixEquipe) => ChoixEquipe): void => {
    modifier((precedente) => ({ ...precedente, equipe: transformerEquipe(precedente.equipe) }));
  };

  const modifierReglagesCompletion = (reglages: ReglagesCompletion): void => {
    modifier((precedente) => ({ ...precedente, reglagesCompletion: reglages }));
  };

  /** Remplace la sauvegarde par le contenu importé, seulement s'il est valide. */
  const importer = (texte: string): ResultatImport => {
    const resultat = lireSauvegardeDepuisTexte(texte);
    if (!resultat.succes) {
      return resultat;
    }
    modifier(() => resultat.sauvegarde);
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
    definirStatut,
    modifierReglagesCompletion,
    modifierChasse,
    modifierMinuteur,
    ajouterMinuteur,
    supprimerMinuteur,
    modifierEquipe,
    importer,
    exporter,
  };
}
