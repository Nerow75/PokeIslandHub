// src/hooks/useStrategie.ts

import { useEffect, useState } from "react";
import { schemaStrategieGeneree } from "../domaine/schemaStrategie.ts";
import type { StrategieGeneree } from "../types/strategie.ts";

export type ChargementStrategie =
  | { etat: "chargement" }
  | { etat: "pret"; donnees: StrategieGeneree }
  | { etat: "erreur"; message: string };

/* Partagé entre les montages : le fichier n'est importé qu'une fois. */
let promesseStrategie: Promise<StrategieGeneree> | null = null;

function importerStrategie(): Promise<StrategieGeneree> {
  promesseStrategie ??= import("../data/strategie.json").then((module) => {
    const resultat = schemaStrategieGeneree.safeParse(module.default);
    if (!resultat.success) {
      throw new Error("Données de stratégie invalides : relancer npm run generate:strategie.");
    }
    return resultat.data;
  });
  return promesseStrategie;
}

/**
 * Charge à la demande les données de stratégie (près d'un Mo),
 * pour ne pas alourdir le premier affichage.
 */
export function useStrategie(): ChargementStrategie {
  const [chargement, setChargement] = useState<ChargementStrategie>({ etat: "chargement" });

  useEffect(() => {
    let estActif = true;
    importerStrategie()
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
