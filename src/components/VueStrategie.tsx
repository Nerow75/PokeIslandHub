// src/components/VueStrategie.tsx

import { useMemo, useState, type FC } from "react";
import {
  ESPECES,
  ESPECES_PAR_SLUG,
  evolutionsFinales,
  INDEX_RECHERCHE,
  normaliserRecherche,
} from "../donnees.ts";
import {
  basculerEpingle,
  basculerExclusion,
  classerParForce,
  estNonEvolue,
  MAX_EPINGLES,
  type ChoixEquipe,
} from "../domaine/equipe.ts";
import type { StatutEnregistre } from "../domaine/statut.ts";
import { useStrategie } from "../hooks/useStrategie.ts";
import type { StrategieGeneree } from "../types/strategie.ts";
import BuildPokemon from "./BuildPokemon.tsx";
import LegendeTiers from "./LegendeTiers.tsx";
import { BadgeTier, TypesPokemon } from "./PastillesStrategie.tsx";
import SectionEquipe from "./SectionEquipe.tsx";
import SpritePokemon from "./SpritePokemon.tsx";

interface VueStrategieProps {
  statuts: Readonly<Record<string, StatutEnregistre>>;
  choixEquipe: ChoixEquipe;
  onChoixEquipeChange: (transformer: (choix: ChoixEquipe) => ChoixEquipe) => void;
}

interface ContenuProps extends VueStrategieProps {
  donnees: StrategieGeneree;
}

const ContenuStrategie: FC<ContenuProps> = ({
  donnees,
  statuts,
  choixEquipe,
  onChoixEquipeChange,
}) => {
  const [inclureVus, setInclureVus] = useState(false);
  const [recherche, setRecherche] = useState("");

  const classement = useMemo(() => {
    const termes = normaliserRecherche(recherche).split(" ").filter(Boolean);
    const lignes = ESPECES.filter((e) => {
      const statut = statuts[e.slug];
      if (statut !== "capture" && !(inclureVus && statut === "vu")) return false;
      const texte = INDEX_RECHERCHE.get(e.slug) ?? "";
      return termes.every((terme) => texte.includes(terme));
    }).map((e) => {
      const strategie = donnees.parEspece[e.slug];
      return {
        espece: e,
        strategie,
        tier: strategie?.tier ?? null,
        pourcentageUsage: strategie?.usage?.pourcentage ?? 0,
      };
    });
    return classerParForce(lignes);
  }, [statuts, inclureVus, recherche, donnees]);

  const epingles = new Set(choixEquipe.epingles);
  const exclus = new Set(choixEquipe.exclus);
  const epinglesAuMax = choixEquipe.epingles.length >= MAX_EPINGLES;
  const nombreCaptures = ESPECES.filter((e) => statuts[e.slug] === "capture").length;

  return (
    <>
      <SectionEquipe
        donnees={donnees}
        statuts={statuts}
        choixEquipe={choixEquipe}
        onChoixEquipeChange={onChoixEquipeChange}
      />

      <section aria-labelledby="titre-classement" className="vue">
        <div className="vue__entete">
          <h3 id="titre-classement">Mes Pokémon classés</h3>
          <p className="texte-discret">
            Du plus fort au plus faible. Déplie un Pokémon pour voir son build : capacités, talent,
            objet, nature, EV et IV.
          </p>
        </div>
        <div className="filtres">
          <label className="filtres__recherche">
            <span className="visuellement-masque">Rechercher</span>
            <input
              type="search"
              placeholder="Nom FR, nom EN ou numéro"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </label>
          <label className="case-a-cocher">
            <input
              type="checkbox"
              checked={inclureVus}
              onChange={(e) => setInclureVus(e.target.checked)}
            />
            Inclure les vus
          </label>
          <p className="filtres__compte" aria-live="polite">
            {classement.length} Pokémon
          </p>
        </div>

        {nombreCaptures === 0 && !inclureVus ? (
          <p className="vide">Aucun Pokémon capturé pour l'instant.</p>
        ) : (
          <ul className="classement">
            {classement.map(({ espece, strategie }) => {
              const statut = statuts[espece.slug];
              const finales =
                strategie && estNonEvolue(strategie.tier) ? evolutionsFinales(espece.slug) : [];
              return (
                <li key={espece.slug}>
                  <details className="classement__pokemon">
                    <summary>
                      <SpritePokemon espece={espece} taille={48} />
                      <span className="classement__nom">
                        {espece.nomFr}
                        {statut === "vu" && <span className="etiquette etiquette--vu">Vu</span>}
                      </span>
                      <BadgeTier
                        tier={strategie?.tier ?? null}
                        generation={strategie?.generationTier ?? null}
                      />
                      <TypesPokemon types={espece.types} />
                      <span className="classement__usage texte-discret">
                        {strategie?.usage
                          ? `${strategie.usage.pourcentage.toLocaleString("fr-FR")} % en ${strategie.usage.tier}`
                          : ""}
                      </span>
                    </summary>
                    <div className="classement__detail">
                      {finales.length > 0 && (
                        <p className="classement__evolution">
                          Pas encore évolué : vise{" "}
                          {finales.map((slug, index) => {
                            const finale = donnees.parEspece[slug];
                            return (
                              <span key={slug}>
                                {index > 0 && ", "}
                                <a className="lien-fiche" href={`#fiche/${slug}`}>
                                  {ESPECES_PAR_SLUG.get(slug)?.nomFr ?? slug}
                                </a>{" "}
                                ({finale?.tier ?? "?"})
                              </span>
                            );
                          })}
                          .
                        </p>
                      )}
                      {strategie ? (
                        <BuildPokemon
                          nomEn={espece.nomEn}
                          strategie={strategie}
                          donnees={donnees}
                        />
                      ) : (
                        <p className="texte-discret">Aucune donnée de stratégie.</p>
                      )}
                      {statut === "capture" && (
                        <div className="classement__actions">
                          <button
                            type="button"
                            className="bouton bouton--petit"
                            aria-pressed={epingles.has(espece.slug)}
                            disabled={epinglesAuMax && !epingles.has(espece.slug)}
                            title={
                              epinglesAuMax && !epingles.has(espece.slug)
                                ? `${MAX_EPINGLES} épinglés au maximum`
                                : undefined
                            }
                            onClick={() =>
                              onChoixEquipeChange((c) => basculerEpingle(c, espece.slug))
                            }
                          >
                            {epingles.has(espece.slug)
                              ? "Épinglé dans la team"
                              : "Épingler dans la team"}
                          </button>
                          <button
                            type="button"
                            className="bouton bouton--petit"
                            aria-pressed={exclus.has(espece.slug)}
                            onClick={() =>
                              onChoixEquipeChange((c) => basculerExclusion(c, espece.slug))
                            }
                          >
                            {exclus.has(espece.slug) ? "Exclu de la team" : "Exclure de la team"}
                          </button>
                        </div>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
};

/**
 * Onglet Stratégie : tiers Smogon des Pokémon capturés, builds conseillés
 * et proposition d'équipe.
 */
const VueStrategie: FC<VueStrategieProps> = (props) => {
  const chargement = useStrategie();

  return (
    <section aria-labelledby="titre-strategie" className="vue">
      <div className="vue__entete">
        <h2 id="titre-strategie">Stratégie</h2>
        <p className="texte-discret">
          Tiers et sets de Smogon (solo 6v6), statistiques d'usage Showdown relevées par{" "}
          <a href="https://www.coupcritique.fr" target="_blank" rel="noreferrer">
            Coup Critique
          </a>
          . Cobblemon suit les règles de Showdown, mais certaines capacités ou talents cachés y sont
          plus difficiles à obtenir. Les tiers ne sont pas une règle du serveur.
        </p>
      </div>
      <LegendeTiers />
      {chargement.etat === "chargement" && (
        <div className="squelette__ligne" aria-busy="true" aria-label="Chargement des données" />
      )}
      {chargement.etat === "erreur" && (
        <p className="message-erreur" role="alert">
          {chargement.message}
        </p>
      )}
      {chargement.etat === "pret" && <ContenuStrategie donnees={chargement.donnees} {...props} />}
    </section>
  );
};

export default VueStrategie;
