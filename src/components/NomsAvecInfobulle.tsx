// src/components/NomsAvecInfobulle.tsx

import { type FC } from "react";
import { NOMS_TYPES } from "../donnees.ts";
import { traduire } from "../domaine/strategie.ts";
import type { CategorieCapacite, StrategieGeneree } from "../types/strategie.ts";
import Infobulle from "./Infobulle.tsx";

const LIBELLES_CATEGORIE: Readonly<Record<CategorieCapacite, string>> = {
  physique: "Physique",
  speciale: "Spéciale",
  statut: "Statut",
};

/** Nom français d'une capacité ; type, puissance, précision et effet au survol. */
export const NomCapacite: FC<{ nom: string; donnees: StrategieGeneree }> = ({ nom, donnees }) => {
  const libelle = traduire(donnees.traductions.capacites, nom);
  const fiche = donnees.capacites[nom];
  if (!fiche) return <>{libelle}</>;
  const caracteristiques = [
    fiche.puissance !== null && `Puissance ${fiche.puissance}`,
    fiche.precision !== null
      ? `Précision ${fiche.precision} %`
      : fiche.categorie !== "statut" && "Ne rate jamais",
    fiche.pp !== null && `${fiche.pp} PP`,
    fiche.priorite !== 0 && `Priorité ${fiche.priorite > 0 ? "+" : ""}${fiche.priorite}`,
  ].filter((texte): texte is string => typeof texte === "string");
  return (
    <Infobulle
      contenu={
        <>
          <span className="infobulle__titre">
            {libelle}
            <span className="type" data-type={fiche.type}>
              {NOMS_TYPES[fiche.type] ?? fiche.type}
            </span>
            <span className="infobulle__categorie">{LIBELLES_CATEGORIE[fiche.categorie]}</span>
          </span>
          {caracteristiques.length > 0 && (
            <span className="infobulle__chiffres">{caracteristiques.join(" · ")}</span>
          )}
          {fiche.description && <span className="infobulle__texte">{fiche.description}</span>}
        </>
      }
    >
      {libelle}
    </Infobulle>
  );
};

/** Nom français d'un talent ou d'un objet ; son effet au survol. */
export const NomAvecEffet: FC<{
  nom: string;
  traductions: Readonly<Record<string, string>>;
  descriptions: Readonly<Record<string, string>>;
}> = ({ nom, traductions, descriptions }) => {
  const libelle = traduire(traductions, nom);
  const description = descriptions[nom];
  if (!description) return <>{libelle}</>;
  return (
    <Infobulle
      contenu={
        <>
          <span className="infobulle__titre">{libelle}</span>
          <span className="infobulle__texte">{description}</span>
        </>
      }
    >
      {libelle}
    </Infobulle>
  );
};
