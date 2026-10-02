// src/components/BlocStrategieFiche.tsx

import { type FC } from "react";
import { ESPECES_PAR_SLUG, evolutionsFinales } from "../donnees.ts";
import { estNonEvolue } from "../domaine/equipe.ts";
import { useStrategie } from "../hooks/useStrategie.ts";
import BuildPokemon from "./BuildPokemon.tsx";
import { BadgeTier } from "./PastillesStrategie.tsx";

interface BlocStrategieFicheProps {
  slug: string;
  nomEn: string;
}

const URL_FICHE_COUP_CRITIQUE = "https://www.coupcritique.fr/entity/pokemons";

/**
 * Stratégie d'un Pokémon sur sa fiche : tier Smogon, build conseillé
 * et lien vers sa fiche stratégique Coup Critique.
 */
const BlocStrategieFiche: FC<BlocStrategieFicheProps> = ({ slug, nomEn }) => {
  const chargement = useStrategie();
  if (chargement.etat === "chargement") {
    return <div className="squelette__ligne" aria-busy="true" aria-label="Chargement" />;
  }
  if (chargement.etat === "erreur") {
    return (
      <p className="message-erreur" role="alert">
        {chargement.message}
      </p>
    );
  }

  const { donnees } = chargement;
  const strategie = donnees.parEspece[slug];
  if (!strategie) {
    return <p className="texte-discret">Aucune donnée de stratégie pour ce Pokémon.</p>;
  }
  const finales = estNonEvolue(strategie.tier) ? evolutionsFinales(slug) : [];

  return (
    <div className="strategie-fiche">
      <p className="strategie-fiche__entete">
        <BadgeTier tier={strategie.tier} generation={strategie.generationTier} />
        {strategie.usage && (
          <span className="texte-discret">
            Joué dans {strategie.usage.pourcentage.toLocaleString("fr-FR")} % des équipes{" "}
            {strategie.usage.tier} sur Showdown
          </span>
        )}
        {strategie.idCoupCritique !== null && (
          <a
            className="bouton bouton--petit strategie-fiche__lien"
            href={`${URL_FICHE_COUP_CRITIQUE}/${strategie.idCoupCritique}`}
            target="_blank"
            rel="noreferrer"
          >
            Fiche Coup Critique
          </a>
        )}
      </p>
      {finales.length > 0 && (
        <p className="classement__evolution">
          Pas encore évolué : vise{" "}
          {finales.map((final, index) => (
            <span key={final}>
              {index > 0 && ", "}
              <a className="lien-fiche" href={`#fiche/${final}`}>
                {ESPECES_PAR_SLUG.get(final)?.nomFr ?? final}
              </a>{" "}
              ({donnees.parEspece[final]?.tier ?? "?"})
            </span>
          ))}
          .
        </p>
      )}
      <BuildPokemon key={slug} nomEn={nomEn} strategie={strategie} donnees={donnees} />
    </div>
  );
};

export default BlocStrategieFiche;
