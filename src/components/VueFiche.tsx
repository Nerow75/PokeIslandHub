// src/components/VueFiche.tsx

import { useState, type FC, type FormEvent } from "react";
import {
  COBBLEMON,
  ESPECE_PAR_NOM_NORMALISE,
  ESPECES_PAR_SLUG,
  especeCobblemon,
  evolutionsAffichees,
  evolutionsVers,
  libelleGeneration,
  NOMS_TYPES,
  normaliserRecherche,
} from "../donnees.ts";
import { etiquettesAffichables } from "../domaine/etiquettes.ts";
import { cleEvolution } from "../domaine/evolutionsAFaire.ts";
import { construireArbre, racineFamille, type NoeudFamille } from "../domaine/famille.ts";
import { LIBELLES_STATUT, type StatutEnregistre, type StatutPokemon } from "../domaine/statut.ts";
import { useApparitions } from "../hooks/useApparitions.ts";
import type { StatEv } from "../types/pokedex.ts";
import { BlocApparition, SansApparition } from "./BlocApparition.tsx";
import BlocStrategieFiche from "./BlocStrategieFiche.tsx";
import ConditionEvolution from "./ConditionEvolution.tsx";
import ChampACopier from "./ChampACopier.tsx";
import SpritePokemon from "./SpritePokemon.tsx";
import SuggestionsNoms from "./SuggestionsNoms.tsx";

interface VueFicheProps {
  slug: string | null;
  statuts: Readonly<Record<string, StatutEnregistre>>;
  onStatutChange: (slug: string, statut: StatutPokemon) => void;
}

const ID_LISTE_NOMS = "fiche-noms-pokemon";
const STATUTS: readonly StatutPokemon[] = ["non-vu", "vu", "capture"];
const LIBELLES_EV: Record<StatEv, string> = {
  pv: "PV",
  attaque: "Attaque",
  defense: "Défense",
  attaqueSpeciale: "Atq. Spé.",
  defenseSpeciale: "Déf. Spé.",
  vitesse: "Vitesse",
};
/* Au-delà, les variantes d'une même évolution (Charmilly...) sont repliées. */
const VARIANTES_VISIBLES = 3;

const parentsDe = (slug: string): string[] => evolutionsVers(slug).map((p) => p.depuis);

function NomFiche({ slug, estActuel }: { slug: string; estActuel: boolean }) {
  const espece = ESPECES_PAR_SLUG.get(slug);
  if (!espece) return <span>{slug}</span>;
  return (
    <a
      className={`famille__espece${estActuel ? " famille__espece--actuelle" : ""}`}
      href={`#fiche/${slug}`}
      aria-current={estActuel ? "page" : undefined}
    >
      <SpritePokemon espece={espece} taille={64} />
      <span>{espece.nomFr}</span>
    </a>
  );
}

function Noeud({
  noeud,
  actuel,
  statuts,
}: {
  noeud: NoeudFamille;
  actuel: string;
  statuts: VueFicheProps["statuts"];
}) {
  const statut = statuts[noeud.slug] ?? "non-vu";
  return (
    <div className="famille__noeud">
      <div className="famille__tete">
        <NomFiche slug={noeud.slug} estActuel={noeud.slug === actuel} />
        <span className={`etiquette etiquette--${statut}`}>{LIBELLES_STATUT[statut]}</span>
      </div>
      {noeud.branches.length > 0 && (
        <ul className="famille__branches">
          {noeud.branches.map(({ evolutions, noeud: enfant }) => {
            const visibles = evolutions.slice(0, VARIANTES_VISIBLES);
            const cachees = evolutions.slice(VARIANTES_VISIBLES);
            return (
              <li key={enfant.slug} className="famille__branche">
                <ul className="famille__conditions">
                  {visibles.map((evolution) => (
                    <ConditionEvolution key={cleEvolution(evolution)} evolution={evolution} />
                  ))}
                </ul>
                {cachees.length > 0 && (
                  <details className="famille__variantes">
                    <summary>{cachees.length} autres variantes</summary>
                    <ul className="famille__conditions">
                      {cachees.map((evolution) => (
                        <ConditionEvolution key={cleEvolution(evolution)} evolution={evolution} />
                      ))}
                    </ul>
                  </details>
                )}
                <Noeud noeud={enfant} actuel={actuel} statuts={statuts} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OuTrouver({ slug }: { slug: string }) {
  const chargement = useApparitions();
  const espece = ESPECES_PAR_SLUG.get(slug);
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
  const apparitions = chargement.donnees.parEspece[slug] ?? [];
  if (apparitions.length === 0) {
    return espece ? <SansApparition espece={espece} /> : null;
  }
  return (
    <ul className="fiche-apparition__liste">
      {apparitions.map((apparition) => (
        <BlocApparition key={JSON.stringify(apparition)} apparition={apparition} />
      ))}
    </ul>
  );
}

/**
 * Fiche d'un Pokémon : identité, statut, famille d'évolution complète (Cobblemon),
 * stratégie (tier, build, lien Coup Critique), biomes d'apparition, EV rapportés
 * et chaîne PokéFinder.
 */
const VueFiche: FC<VueFicheProps> = ({ slug, statuts, onStatutChange }) => {
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const handleRecherche = (evenement: FormEvent): void => {
    evenement.preventDefault();
    const trouvee = ESPECE_PAR_NOM_NORMALISE.get(normaliserRecherche(saisie));
    if (!trouvee) {
      setErreur(`Aucun Pokémon nommé « ${saisie.trim()} ».`);
      return;
    }
    setErreur(null);
    setSaisie("");
    window.location.hash = `fiche/${trouvee.slug}`;
  };

  const espece = slug ? ESPECES_PAR_SLUG.get(slug) : undefined;
  const cobblemon = slug ? especeCobblemon(slug) : undefined;

  return (
    <section aria-labelledby="titre-fiche" className="vue">
      <form className="fiche__recherche" onSubmit={handleRecherche}>
        <label className="filtres__recherche">
          <span id="titre-fiche">Rechercher un Pokémon</span>
          <input
            type="search"
            list={ID_LISTE_NOMS}
            placeholder="Évoli, Eevee..."
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
          />
        </label>
        <button type="submit" className="bouton bouton--plein" disabled={!saisie.trim()}>
          Voir la fiche
        </button>
        <SuggestionsNoms id={ID_LISTE_NOMS} />
      </form>
      {erreur && (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      )}

      {!espece || !slug ? (
        <p className="vide">
          Cherche un Pokémon pour voir ses évolutions, ses biomes et ses EV. Les noms sont aussi
          cliquables dans les onglets Évolutions, Chasse et Où trouver.
        </p>
      ) : (
        <>
          <article className="fiche" data-type={espece.types[0]}>
            <div className="fiche__identite">
              <span className="fiche__scene">
                <SpritePokemon espece={espece} taille={160} className="fiche__sprite" />
              </span>
              <div className="fiche__textes">
                <p className="texte-discret">
                  #{String(espece.id).padStart(4, "0")} · Génération{" "}
                  {libelleGeneration(espece.generation)}
                </p>
                <h2 className="fiche__nom">{espece.nomFr}</h2>
                <p className="fiche__nom-en">{espece.nomEn}</p>
                <span className="carte__types fiche__types">
                  {espece.types.map((type) => (
                    <span key={type} className="type" data-type={type}>
                      {NOMS_TYPES[type] ?? type}
                    </span>
                  ))}
                  {etiquettesAffichables(cobblemon?.etiquettes ?? []).map(({ id, libelle }) => (
                    <span key={id} className="fiche__etiquette">
                      {libelle}
                    </span>
                  ))}
                </span>
                <div className="fiche__statut" role="group" aria-label="Statut au Pokédex">
                  {STATUTS.map((statut) => {
                    const estActif = (statuts[slug] ?? "non-vu") === statut;
                    return (
                      <button
                        key={statut}
                        type="button"
                        className={`fiche__choix fiche__choix--${statut}`}
                        aria-pressed={estActif}
                        onClick={() => onStatutChange(slug, statut)}
                      >
                        {LIBELLES_STATUT[statut]}
                      </button>
                    );
                  })}
                </div>
                {cobblemon && !cobblemon.implementee && (
                  <p className="message-erreur">
                    Pas encore implémenté dans Cobblemon {COBBLEMON.versionCobblemon} : introuvable
                    en jeu, sauf ajout du serveur.
                  </p>
                )}
              </div>
            </div>
          </article>

          <div className="fiche__grille">
            <div className="panneau fiche__famille">
              <h3>Famille d'évolution</h3>
              {evolutionsAffichees(slug).length === 0 && evolutionsVers(slug).length === 0 ? (
                <p className="texte-discret">Ce Pokémon n'évolue pas.</p>
              ) : (
                <Noeud
                  noeud={construireArbre(racineFamille(slug, parentsDe), evolutionsAffichees)}
                  actuel={slug}
                  statuts={statuts}
                />
              )}
              <p className="texte-discret">Conditions de Cobblemon {COBBLEMON.versionCobblemon}.</p>
            </div>

            <div className="fiche__colonne">
              <div className="panneau">
                <h3>PokéFinder</h3>
                <ChampACopier libelle="Espèce" valeur={espece.nomEn} />
                {(cobblemon?.etiquettes ?? []).length > 0 && (
                  <p className="texte-discret">
                    Étiquettes Cobblemon : {(cobblemon?.etiquettes ?? []).join(", ")}
                  </p>
                )}
              </div>
              <div className="panneau">
                <h3>EV rapportés</h3>
                <ul className="fiche__ev">
                  {(Object.keys(LIBELLES_EV) as StatEv[]).map((stat) => (
                    <li
                      key={stat}
                      className={espece.evRapportes[stat] > 0 ? "ev-positif" : "ev-nul"}
                    >
                      <span>{LIBELLES_EV[stat]}</span>
                      <strong>
                        {espece.evRapportes[stat] > 0 ? `+${espece.evRapportes[stat]}` : "0"}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="panneau">
            <h3>Stratégie</h3>
            <BlocStrategieFiche slug={slug} nomEn={espece.nomEn} />
          </div>

          <div className="panneau">
            <h3>Où le trouver</h3>
            <OuTrouver slug={slug} />
          </div>
        </>
      )}
    </section>
  );
};

export default VueFiche;
