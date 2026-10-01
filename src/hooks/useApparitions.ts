// src/hooks/useApparitions.ts

import { useEffect, useState } from "react";
import { schemaApparitionsGenerees } from "../domaine/schemaApparitions.ts";
import type { ApparitionsGenerees } from "../types/apparitions.ts";

export type ChargementApparitions =
  | { etat: "chargement" }
  | { etat: "pret"; donnees: ApparitionsGenerees }
  | { etat: "erreur"; message: string };

/* Partagé entre les montages : le fichier n'est importé qu'une fois. */
let promesseApparitions: Promise<ApparitionsGenerees> | null = null;

function importerApparitions(): Promise<ApparitionsGenerees> {
  promesseApparitions ??= import("../data/apparitions.json").then((module) => {
    const resultat = schemaApparitionsGenerees.safeParse(module.default);
    if (!resultat.success) {
      throw new Error("Données d'apparition invalides : relancer npm run generate:apparitions.");
    }
    return resultat.data;
  });
  return promesseApparitions;
}

/**
 * Charge à la demande les données d'apparition Cobblemon (plusieurs centaines de Ko),
 * pour ne pas alourdir le premier affichage.
 */
export function useApparitions(): ChargementApparitions {
  const [chargement, setChargement] = useState<ChargementApparitions>({ etat: "chargement" });

  useEffect(() => {
    let estActif = true;
    importerApparitions()
      .then((donnees) => {
        if (estActif) setChargement({ etat: "pret", donnees });
      })
      .catch((erreur: unknown) => {
        if (estActif) {
          setChargement({
            etat: "erreur",
            message: erreur instanceof Error ? erreur.message : "Chargement impossible.",
          });
        }
      });
    return () => {
      estActif = false;
    };
  }, []);

  return chargement;
}
