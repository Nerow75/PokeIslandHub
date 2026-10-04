// src/App.tsx

import { useEffect, useState } from "react";
import AlerteVotes from "./components/AlerteVotes.tsx";
import BarreSauvegarde from "./components/BarreSauvegarde.tsx";
import EnTeteCompletion from "./components/EnTeteCompletion.tsx";
import IndicateurCompletion from "./components/IndicateurCompletion.tsx";
import RechercheRapide from "./components/RechercheRapide.tsx";
import VueChasse from "./components/VueChasse.tsx";
import VueEv from "./components/VueEv.tsx";
import VueFiche from "./components/VueFiche.tsx";
import VueEvolutions from "./components/VueEvolutions.tsx";
import VueOuTrouver from "./components/VueOuTrouver.tsx";
import VuePokedex from "./components/VuePokedex.tsx";
import VueStrategie from "./components/VueStrategie.tsx";
import VuePokeFinder from "./components/VuePokeFinder.tsx";
import VueVotes from "./components/VueVotes.tsx";
import { ESPECES_PAR_SLUG, TOTAL_POKEDEX_SERVEUR } from "./donnees.ts";
import { calculerCompletion, compteSelonBase } from "./domaine/completion.ts";
import { FILTRES_PAR_DEFAUT, type Filtres } from "./domaine/filtres.ts";
import { STAT_EV } from "./domaine/strategie.ts";
import type { StatEv } from "./types/pokedex.ts";
import { useSauvegarde } from "./hooks/useSauvegarde.ts";

type Onglet =
  | "pokedex"
  | "fiche"
  | "strategie"
  | "chasse"
  | "evolutions"
  | "ou-trouver"
  | "pokefinder"
  | "ev"
  | "votes";

const ONGLETS: readonly { id: Onglet; libelle: string }[] = [
  { id: "pokedex", libelle: "Pokédex" },
  { id: "fiche", libelle: "Fiche" },
  { id: "strategie", libelle: "Stratégie" },
  { id: "chasse", libelle: "Chasse" },
  { id: "evolutions", libelle: "Évolutions" },
  { id: "ou-trouver", libelle: "Où trouver" },
  { id: "pokefinder", libelle: "PokéFinder" },
  { id: "ev", libelle: "EV" },
  { id: "votes", libelle: "Votes" },
] as const;

interface Navigation {
  onglet: Onglet;
  /** Espèce affichée par l'onglet Fiche (#fiche/eevee). */
  slugFiche: string | null;
  /** Stat présélectionnée par l'onglet EV (#ev/vitesse), depuis un build de l'onglet Stratégie. */
  statEv: StatEv | null;
}

const STATS_EV: readonly string[] = Object.values(STAT_EV);

function estStatEv(valeur: string): valeur is StatEv {
  return STATS_EV.includes(valeur);
}

/** Navigation indiquée dans l'URL (#evolutions, #fiche/eevee, #ev/vitesse...), conservée au rafraîchissement. */
function navigationDepuisUrl(): Navigation {
  const [demande = "", parametre] = window.location.hash.slice(1).split("/");
  const onglet = ONGLETS.find((o) => o.id === demande)?.id ?? "pokedex";
  return {
    onglet,
    slugFiche: onglet === "fiche" && parametre ? decodeURIComponent(parametre) : null,
    statEv: onglet === "ev" && parametre && estStatEv(parametre) ? parametre : null,
  };
}

/**
 * Page principale : complétion, filtres et grille du Pokédex.
 */
const App = () => {
  const {
    sauvegarde,
    modeStockage,
    nombreImports,
    avertissement,
    fermerAvertissement,
    definirStatut,
    modifierReglagesCompletion,
    modifierChasse,
    modifierVote,
    modifierEquipe,
    importer,
    exporter,
  } = useSauvegarde();
  const [navigation, setNavigation] = useState<Navigation>(navigationDepuisUrl);
  const { onglet, slugFiche, statEv } = navigation;

  /* Les liens vers une fiche (#fiche/slug) changent l'URL : la navigation la suit. */
  useEffect(() => {
    const suivreUrl = (): void => {
      setNavigation(navigationDepuisUrl());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", suivreUrl);
    return () => window.removeEventListener("hashchange", suivreUrl);
  }, []);

  const handleOngletChange = (id: Onglet): void => {
    const slug = id === "fiche" ? slugFiche : null;
    setNavigation({ onglet: id, slugFiche: slug, statEv: null });
    window.history.replaceState(null, "", slug ? `#fiche/${slug}` : `#${id}`);
  };
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_PAR_DEFAUT);

  /* Seules les espèces connues du Pokédex comptent : une entrée inconnue reste stockée mais ignorée. */
  const statutsConnus = Object.entries(sauvegarde.statuts)
    .filter(([slug]) => ESPECES_PAR_SLUG.has(slug))
    .map(([, statut]) => statut);
  const nombreVus = compteSelonBase(statutsConnus, "vu");
  const nombreCaptures = compteSelonBase(statutsConnus, "capture");
  const reglages = sauvegarde.reglagesCompletion;
  const etatCompletion = calculerCompletion(
    reglages.base === "capture" ? nombreCaptures : nombreVus,
    reglages,
    TOTAL_POKEDEX_SERVEUR,
  );

  return (
    <>
      <header className="barre">
        <div className="barre__haut">
          <h1 className="logo">
            <span className="pokeball" aria-hidden="true" />
            <span className="logo__texte">
              PokeIsland<span className="logo__hub">Hub</span>
            </span>
          </h1>
          <RechercheRapide />
          <div className="barre__reperes">
            <IndicateurCompletion
              etat={etatCompletion}
              onOuvrir={() => handleOngletChange("pokedex")}
            />
            <AlerteVotes votes={sauvegarde.votes} onOuvrir={() => handleOngletChange("votes")} />
            <BarreSauvegarde
              modeStockage={modeStockage}
              onExporter={exporter}
              onImporter={importer}
            />
          </div>
        </div>
        <nav aria-label="Sections" className="onglets">
          <div className="onglets__liste">
            {ONGLETS.map(({ id, libelle }) => (
              <button
                key={id}
                type="button"
                className="onglets__bouton"
                aria-current={onglet === id ? "page" : undefined}
                onClick={() => handleOngletChange(id)}
              >
                {libelle}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="page">
        {avertissement && (
          <div className="avertissement" role="alert">
            <p>{avertissement}</p>
            <button type="button" className="bouton" onClick={fermerAvertissement}>
              Fermer
            </button>
          </div>
        )}

        <main>
          {onglet === "pokedex" && (
            <EnTeteCompletion
              key={nombreImports}
              etat={etatCompletion}
              reglages={reglages}
              nombreVus={nombreVus}
              nombreCaptures={nombreCaptures}
              totalAutomatique={TOTAL_POKEDEX_SERVEUR}
              onReglagesChange={modifierReglagesCompletion}
            />
          )}

          {onglet === "fiche" && (
            <VueFiche
              slug={slugFiche}
              statuts={sauvegarde.statuts}
              onStatutChange={definirStatut}
            />
          )}
          {onglet === "strategie" && (
            <VueStrategie
              statuts={sauvegarde.statuts}
              choixEquipe={sauvegarde.equipe}
              onChoixEquipeChange={modifierEquipe}
            />
          )}
          {onglet === "chasse" && (
            <VueChasse
              chasse={sauvegarde.chasse}
              statuts={sauvegarde.statuts}
              onChasseChange={modifierChasse}
              onStatutChange={definirStatut}
            />
          )}
          {onglet === "evolutions" && (
            <VueEvolutions statuts={sauvegarde.statuts} onStatutChange={definirStatut} />
          )}
          {onglet === "ou-trouver" && <VueOuTrouver statuts={sauvegarde.statuts} />}
          {onglet === "pokefinder" && <VuePokeFinder statuts={sauvegarde.statuts} />}
          {onglet === "votes" && <VueVotes votes={sauvegarde.votes} onVoteChange={modifierVote} />}
          {onglet === "ev" && (
            <VueEv key={statEv ?? ""} statuts={sauvegarde.statuts} statInitiale={statEv} />
          )}

          {onglet === "pokedex" && (
            <VuePokedex
              filtres={filtres}
              onFiltresChange={setFiltres}
              statuts={sauvegarde.statuts}
              onStatutChange={definirStatut}
            />
          )}
        </main>
      </div>
    </>
  );
};

export default App;
