// src/components/VueStrategie.tsx

import { useMemo, useState, type FC } from "react";
import {
  ESPECES,
  ESPECES_PAR_SLUG,
  evolutionsAffichees,
  evolutionsVers,
  INDEX_RECHERCHE,
  NOMS_TYPES,
  normaliserRecherche,
} from "../donnees.ts";
import {
  basculerEpingle,
  basculerExclusion,
  bilanDefensif,
  classerParForce,
  estNonEvolue,
  proposerEquipe,
  TAILLE_EQUIPE,
  type CandidatEquipe,
  type ChoixEquipe,
} from "../domaine/equipe.ts";
import { racineFamille } from "../domaine/famille.ts";
import type { StatutEnregistre } from "../domaine/statut.ts";
import { useStrategie } from "../hooks/useStrategie.ts";
import type { StrategieGeneree } from "../types/strategie.ts";
import BuildPokemon from "./BuildPokemon.tsx";
import SpritePokemon from "./SpritePokemon.tsx";

interface VueStrategieProps {
  statuts: Readonly<Record<string, StatutEnregistre>>;
  choixEquipe: ChoixEquipe;
  onChoixEquipeChange: (transformer: (choix: ChoixEquipe) => ChoixEquipe) => void;
}

const parentsDe = (slug: string): string[] => evolutionsVers(slug).map((p) => p.depuis);

/** Formes finales atteignables depuis une espèce, selon les évolutions Cobblemon. */
function evolutionsFinales(slug: string): string[] {
  const finales = new Set<string>();
  const parcourus = new Set<string>();
  const parcourir = (courant: string): void => {
    if (parcourus.has(courant)) return;
    parcourus.add(courant);
    const suivantes = evolutionsAffichees(courant).map((e) => e.vers);
    if (suivantes.length === 0 && courant !== slug) finales.add(courant);
    suivantes.forEach(parcourir);
  };
  parcourir(slug);
  return [...finales];
}

function multiplicateurAffiche(valeur: number): string {
  if (valeur === 0) return "0";
  if (valeur === 0.25) return "¼";
  if (valeur === 0.5) return "½";
  return `×${valeur}`;
}

const BadgeTier: FC<{ tier: string | null; generation: number | null }> = ({
  tier,
  generation,
}) => (
  <span className="tier" data-tier={tier ?? "aucun"}>
    {tier ?? "?"}
    {generation !== null && generation < 9 && (
      <span className="tier__gen" title={`Tier de la génération ${generation}`}>
        G{generation}
      </span>
    )}
  </span>
);

const Types: FC<{ types: readonly string[] }> = ({ types }) => (
  <span className="carte__types">
    {types.map((type) => (
      <span key={type} className="type" data-type={type}>
        {NOMS_TYPES[type] ?? type}
      </span>
    ))}
  </span>
);

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

  /* Candidats : Pokémon capturés connus des données de stratégie. */
  const candidats = useMemo<CandidatEquipe[]>(
    () =>
      ESPECES.filter((e) => statuts[e.slug] === "capture" && donnees.parEspece[e.slug]).map(
        (e) => {
          const strategie = donnees.parEspece[e.slug];
          return {
            slug: e.slug,
            tier: strategie?.tier ?? null,
            pourcentageUsage: strategie?.usage?.pourcentage ?? 0,
            types: e.types,
            famille: racineFamille(e.slug, parentsDe),
          };
        },
      ),
    [statuts, donnees],
  );

  const equipe = useMemo(
    () => proposerEquipe(candidats, choixEquipe, donnees.efficacites),
    [candidats, choixEquipe, donnees.efficacites],
  );
  const bilan = bilanDefensif(equipe, donnees.efficacites);

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
  const nombreCaptures = candidats.length;

  return (
    <>
      <section aria-labelledby="titre-equipe" className="panneau">
        <h3 id="titre-equipe">Team proposée</h3>
        <p className="texte-discret">
          Les plus forts de tes captures selon leur tier, en évitant d'empiler les mêmes faiblesses.
          Un seul Pokémon par famille, les non évolués sont écartés. Épingle ou retire un membre
          pour ajuster.
        </p>
        {equipe.length === 0 ? (
          <p className="vide">Capture des Pokémon entièrement évolués pour obtenir une proposition.</p>
        ) : (
          <ol className="equipe">
            {equipe.map((membre) => {
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
                  <Types types={espece.types} />
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
        )}
        {equipe.length > 0 && equipe.length < TAILLE_EQUIPE && (
          <p className="texte-discret">
            {equipe.length} sur {TAILLE_EQUIPE} : pas assez de candidats parmi tes captures.
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
                  {ESPECES_PAR_SLUG.get(slug)?.nomFr ?? slug}
                </button>
              </span>
            ))}
          </p>
        )}

        {equipe.length > 0 && (
          <details className="bilan">
            <summary>
              Faiblesses de la team :{" "}
              {bilan
                .filter((b) => b.faibles >= 2 && b.faibles > b.resistants)
                .map((b) => NOMS_TYPES[b.typeAttaquant] ?? b.typeAttaquant)
                .join(", ") || "aucune faiblesse partagée"}
            </summary>
            <div className="tableau-defilant">
              <table className="tableau-ev tableau-bilan">
                <thead>
                  <tr>
                    <th scope="col">Attaque</th>
                    {equipe.map((m) => (
                      <th key={m.slug} scope="col">
                        {ESPECES_PAR_SLUG.get(m.slug)?.nomFr ?? m.slug}
                      </th>
                    ))}
                    <th scope="col">Bilan</th>
                  </tr>
                </thead>
                <tbody>
                  {bilan.map((ligne) => (
                    <tr key={ligne.typeAttaquant}>
                      <th scope="row">
                        <span className="type" data-type={ligne.typeAttaquant}>
                          {NOMS_TYPES[ligne.typeAttaquant] ?? ligne.typeAttaquant}
                        </span>
                      </th>
                      {ligne.multiplicateurs.map((m, index) => (
                        <td
                          key={equipe[index]?.slug ?? index}
                          className={m > 1 ? "bilan--faible" : m < 1 ? "bilan--resiste" : "ev-nul"}
                        >
                          {m === 1 ? "·" : multiplicateurAffiche(m)}
                        </td>
                      ))}
                      <td
                        className={
                          ligne.faibles > ligne.resistants ? "bilan--faible" : "texte-discret"
                        }
                      >
                        {ligne.faibles} faible{ligne.faibles > 1 ? "s" : ""}, {ligne.resistants}{" "}
                        résiste{ligne.resistants > 1 ? "nt" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

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
              const finales = strategie && estNonEvolue(strategie.tier) ? evolutionsFinales(espece.slug) : [];
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
                      <Types types={espece.types} />
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
                            onClick={() =>
                              onChoixEquipeChange((c) => basculerEpingle(c, espece.slug))
                            }
                          >
                            {epingles.has(espece.slug) ? "Épinglé dans la team" : "Épingler dans la team"}
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
