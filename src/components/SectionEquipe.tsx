// src/components/SectionEquipe.tsx

import { useMemo, useState, type FC } from "react";
import {
  ESPECES,
  ESPECES_PAR_SLUG,
  especeCobblemon,
  evolutionsVers,
  listeTypesFr,
  NOMS_TYPES,
} from "../donnees.ts";
import {
  basculerEpingle,
  basculerExclusion,
  bilanDefensif,
  bilanOffensif,
  proposerEquipes,
  suggererCaptures,
  TAILLE_EQUIPE,
  type CandidatEquipe,
  type ChoixEquipe,
} from "../domaine/equipe.ts";
import { racineFamille } from "../domaine/famille.ts";
import type { StatutEnregistre } from "../domaine/statut.ts";
import { multiplicateurAffiche, typesAttaque } from "../domaine/strategie.ts";
import type { EspecePokemon } from "../types/pokedex.ts";
import type { StrategieGeneree } from "../types/strategie.ts";
import { BadgeTier, TypesPokemon } from "./PastillesStrategie.tsx";
import SpritePokemon from "./SpritePokemon.tsx";

interface SectionEquipeProps {
  donnees: StrategieGeneree;
  statuts: Readonly<Record<string, StatutEnregistre>>;
  choixEquipe: ChoixEquipe;
  onChoixEquipeChange: (transformer: (choix: ChoixEquipe) => ChoixEquipe) => void;
}

const parentsDe = (slug: string): string[] => evolutionsVers(slug).map((p) => p.depuis);

function candidatDepuis(espece: EspecePokemon, donnees: StrategieGeneree): CandidatEquipe {
  const strategie = donnees.parEspece[espece.slug];
  return {
    slug: espece.slug,
    tier: strategie?.tier ?? null,
    pourcentageUsage: strategie?.usage?.pourcentage ?? 0,
    types: espece.types,
    typesAttaque: typesAttaque(strategie, espece.types, donnees.typesCapacites),
    famille: racineFamille(espece.slug, parentsDe),
  };
}

function nomFr(slug: string): string {
  return ESPECES_PAR_SLUG.get(slug)?.nomFr ?? slug;
}

/**
 * Équipes proposées parmi les captures (trois variantes au plus), leurs faiblesses,
 * leur couverture offensive et les Pokémon à capturer pour les renforcer.
 */
const SectionEquipe: FC<SectionEquipeProps> = ({
  donnees,
  statuts,
  choixEquipe,
  onChoixEquipeChange,
}) => {
  const [indexEquipe, setIndexEquipe] = useState(0);
  const [inclureLegendaires, setInclureLegendaires] = useState(false);

  /* L'optimisation teste des milliers d'équipes : mémoïsée sur ses seules entrées. */
  const equipes = useMemo(() => {
    const candidats = ESPECES.filter(
      (e) => statuts[e.slug] === "capture" && donnees.parEspece[e.slug],
    ).map((e) => candidatDepuis(e, donnees));
    return proposerEquipes(candidats, choixEquipe, donnees.efficacites);
  }, [statuts, choixEquipe, donnees]);

  const equipe = equipes[indexEquipe] ?? equipes[0];
  const nombreEpingles = choixEquipe.epingles.filter((slug) =>
    equipe?.membres.some((m) => m.slug === slug),
  ).length;

  const suggestions = useMemo(() => {
    if (!equipe) return [];
    const aCapturer = ESPECES.filter(
      (e) =>
        statuts[e.slug] !== "capture" &&
        donnees.parEspece[e.slug] &&
        especeCobblemon(e.slug)?.implementee &&
        (inclureLegendaires || (!e.estLegendaire && !e.estFabuleux)),
    ).map((e) => candidatDepuis(e, donnees));
    return suggererCaptures(equipe, nombreEpingles, aCapturer, donnees.efficacites);
  }, [equipe, nombreEpingles, statuts, donnees, inclureLegendaires]);

  const epingles = new Set(choixEquipe.epingles);

  if (!equipe) {
    return (
      <section aria-labelledby="titre-equipe" className="panneau">
        <h3 id="titre-equipe">Team proposée</h3>
        <p className="vide">
          Capture des Pokémon entièrement évolués pour obtenir une proposition.
        </p>
      </section>
    );
  }

  const { membres, evaluation } = equipe;
  const defense = bilanDefensif(membres, donnees.efficacites);
  const attaque = bilanOffensif(membres, donnees.efficacites);

  return (
    <section aria-labelledby="titre-equipe" className="panneau">
      <h3 id="titre-equipe">Team proposée</h3>
      <p className="texte-discret">
        Les meilleures combinaisons de tes captures : Pokémon forts, peu de faiblesses en commun et
        de quoi frapper fort un maximum de types. Un seul Pokémon par famille, les non évolués sont
        écartés. Épingle ou retire un membre pour ajuster.
      </p>

      {equipes.length > 1 && (
        <div className="build__sets" role="group" aria-label="Équipes proposées">
          {equipes.map((proposition, index) => (
            <button
              key={proposition.membres.map((m) => m.slug).join("|")}
              type="button"
              className="bouton bouton--petit"
              aria-pressed={proposition === equipe}
              onClick={() => setIndexEquipe(index)}
            >
              {index === 0 ? "Meilleure team" : `Variante ${index}`}
            </button>
          ))}
        </div>
      )}

      <ol className="equipe">
        {membres.map((membre) => {
          const espece = ESPECES_PAR_SLUG.get(membre.slug);
          if (!espece) return null;
          const estEpingle = epingles.has(membre.slug);
          return (
            <li key={membre.slug} className="equipe__membre" data-type={espece.types[0]}>
              <SpritePokemon espece={espece} taille={72} className="equipe__sprite" />
              <a className="equipe__nom lien-fiche" href={`#fiche/${espece.slug}`}>
                {espece.nomFr}
              </a>
              <BadgeTier
                tier={membre.tier}
                generation={donnees.parEspece[membre.slug]?.generationTier ?? null}
              />
              <TypesPokemon types={espece.types} />
              <div className="equipe__actions">
                <button
                  type="button"
                  className="bouton bouton--petit"
                  aria-pressed={estEpingle}
                  onClick={() => onChoixEquipeChange((c) => basculerEpingle(c, membre.slug))}
                >
                  {estEpingle ? "Épinglé" : "Épingler"}
                </button>
                <button
                  type="button"
                  className="bouton bouton--petit"
                  onClick={() => onChoixEquipeChange((c) => basculerExclusion(c, membre.slug))}
                >
                  Retirer
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {membres.length < TAILLE_EQUIPE && (
        <p className="texte-discret">
          {membres.length} sur {TAILLE_EQUIPE} : pas assez de candidats parmi tes captures.
        </p>
      )}
      {choixEquipe.exclus.length > 0 && (
        <p className="texte-discret">
          Retirés :{" "}
          {choixEquipe.exclus.map((slug, index) => (
            <span key={slug}>
              {index > 0 && ", "}
              <button
                type="button"
                className="lien-bouton"
                onClick={() => onChoixEquipeChange((c) => basculerExclusion(c, slug))}
                title="Remettre dans les propositions"
              >
                {nomFr(slug)}
              </button>
            </span>
          ))}
        </p>
      )}

      <dl className="resume-equipe">
        <div>
          <dt>Faiblesses partagées</dt>
          <dd
            className={
              evaluation.faiblessesPartagees.length > 0 ? "bilan--faible" : "bilan--resiste"
            }
          >
            {listeTypesFr(evaluation.faiblessesPartagees) || "aucune"}
          </dd>
        </div>
        <div>
          <dt>Types mal couverts en attaque</dt>
          <dd
            className={evaluation.typesNonCouverts.length > 0 ? "bilan--faible" : "bilan--resiste"}
          >
            {listeTypesFr(evaluation.typesNonCouverts) ||
              "aucun, tout est touché en super efficace"}
          </dd>
        </div>
      </dl>

      <details className="bilan">
        <summary>Détail des faiblesses</summary>
        <div className="tableau-defilant">
          <table className="tableau-ev tableau-bilan">
            <thead>
              <tr>
                <th scope="col">Attaque reçue</th>
                {membres.map((m) => (
                  <th key={m.slug} scope="col">
                    {nomFr(m.slug)}
                  </th>
                ))}
                <th scope="col">Bilan</th>
              </tr>
            </thead>
            <tbody>
              {defense.map((ligne) => (
                <tr key={ligne.typeAttaquant}>
                  <th scope="row">
                    <span className="type" data-type={ligne.typeAttaquant}>
                      {NOMS_TYPES[ligne.typeAttaquant] ?? ligne.typeAttaquant}
                    </span>
                  </th>
                  {ligne.multiplicateurs.map((m, index) => (
                    <td
                      key={membres[index]?.slug ?? index}
                      className={m > 1 ? "bilan--faible" : m < 1 ? "bilan--resiste" : "ev-nul"}
                    >
                      {m === 1 ? "·" : multiplicateurAffiche(m)}
                    </td>
                  ))}
                  <td
                    className={ligne.faibles > ligne.resistants ? "bilan--faible" : "texte-discret"}
                  >
                    {ligne.faibles} faible{ligne.faibles > 1 ? "s" : ""}, {ligne.resistants} résiste
                    {ligne.resistants > 1 ? "nt" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="bilan">
        <summary>Couverture offensive</summary>
        <p className="texte-discret">
          Meilleure efficacité contre un Pokémon de chaque type, avec les capacités du build
          conseillé.
        </p>
        <div className="tableau-defilant">
          <table className="tableau-ev tableau-bilan">
            <thead>
              <tr>
                <th scope="col">Cible</th>
                {membres.map((m) => (
                  <th key={m.slug} scope="col">
                    {nomFr(m.slug)}
                  </th>
                ))}
                <th scope="col">Meilleur</th>
              </tr>
            </thead>
            <tbody>
              {attaque.map((ligne) => (
                <tr key={ligne.typeDefenseur}>
                  <th scope="row">
                    <span className="type" data-type={ligne.typeDefenseur}>
                      {NOMS_TYPES[ligne.typeDefenseur] ?? ligne.typeDefenseur}
                    </span>
                  </th>
                  {ligne.multiplicateurs.map((m, index) => (
                    <td
                      key={membres[index]?.slug ?? index}
                      className={m >= 2 ? "bilan--resiste" : m < 1 ? "bilan--faible" : "ev-nul"}
                    >
                      {m === 1 ? "·" : multiplicateurAffiche(m)}
                    </td>
                  ))}
                  <td className={ligne.meilleur >= 2 ? "bilan--resiste" : "bilan--faible"}>
                    {ligne.meilleur >= 2 ? "couvert" : "mal couvert"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="suggestions">
        <div className="suggestions__entete">
          <h4>À capturer pour renforcer cette team</h4>
          <label className="case-a-cocher">
            <input
              type="checkbox"
              checked={inclureLegendaires}
              onChange={(e) => setInclureLegendaires(e.target.checked)}
            />
            Inclure légendaires et fabuleux
          </label>
        </div>
        {suggestions.length === 0 ? (
          <p className="texte-discret">
            Aucune capture ne renforce cette team sans l'affaiblir ailleurs.
          </p>
        ) : (
          <ul className="suggestions__liste">
            {suggestions.map(({ candidat, remplace, faiblessesComblees, typesCouverts }) => {
              const tierDe = (slug: string): string => donnees.parEspece[slug]?.tier ?? "?";
              const espece = ESPECES_PAR_SLUG.get(candidat.slug);
              if (!espece) return null;
              return (
                <li key={candidat.slug} className="suggestion">
                  <SpritePokemon espece={espece} taille={56} />
                  <div className="suggestion__texte">
                    <p className="suggestion__nom">
                      <a className="lien-fiche" href={`#fiche/${espece.slug}`}>
                        {espece.nomFr}
                      </a>
                      <BadgeTier
                        tier={candidat.tier}
                        generation={donnees.parEspece[candidat.slug]?.generationTier ?? null}
                      />
                      <TypesPokemon types={espece.types} />
                      {statuts[espece.slug] === "vu" && (
                        <span className="etiquette etiquette--vu">Vu</span>
                      )}
                    </p>
                    <p className="texte-discret">
                      Remplace {nomFr(remplace)}.
                      {faiblessesComblees.length > 0 &&
                        ` La team ne craint plus : ${listeTypesFr(faiblessesComblees)}.`}
                      {typesCouverts.length > 0 &&
                        ` Touche en super efficace : ${listeTypesFr(typesCouverts)}.`}
                      {faiblessesComblees.length + typesCouverts.length === 0 &&
                        ` Plus fort (${candidat.tier ?? "?"} au lieu de ${tierDe(remplace)}), sans créer de faiblesse.`}
                    </p>
                  </div>
                  <a className="bouton bouton--petit" href={`#fiche/${espece.slug}`}>
                    Où le trouver
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SectionEquipe;
