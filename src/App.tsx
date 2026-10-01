// src/App.tsx

import { useDeferredValue, useMemo, useState } from "react";
import BarreFiltres from "./components/BarreFiltres.tsx";
import BarreSauvegarde from "./components/BarreSauvegarde.tsx";
import CartePokemon from "./components/CartePokemon.tsx";
import EnTeteCompletion from "./components/EnTeteCompletion.tsx";
import VueEv from "./components/VueEv.tsx";
import VueEvolutions from "./components/VueEvolutions.tsx";
import VuePokeFinder from "./components/VuePokeFinder.tsx";
import {
  ENTREES_POKEDEX,
  ESPECES_PAR_SLUG,
  INDEX_RECHERCHE,
  normaliserRecherche,
} from "./donnees.ts";
import { calculerCompletion, compteSelonBase } from "./domaine/completion.ts";
import { FILTRES_PAR_DEFAUT, type Filtres } from "./domaine/filtres.ts";
import type { StatutPokemon } from "./domaine/statut.ts";
import { useSauvegarde } from "./hooks/useSauvegarde.ts";

type Onglet = "pokedex" | "evolutions" | "pokefinder" | "ev";

const ONGLETS: readonly { id: Onglet; libelle: string }[] = [
  { id: "pokedex", libelle: "Pokédex" },
  { id: "evolutions", libelle: "Évolutions" },
  { id: "pokefinder", libelle: "PokéFinder" },
  { id: "ev", libelle: "EV" },
] as const;

function correspondAuFiltreStatut(statut: StatutPokemon, filtre: Filtres["statut"]): boolean {
  switch (filtre) {
    case "tous":
      return true;
    case "non-capture":
      return statut !== "capture";
    default:
      return statut === filtre;
  }
}

/**
 * Page principale : complétion, filtres et grille du Pokédex.
 */
const App = () => {
  const {
    sauvegarde,
    nombreImports,
    avertissement,
    fermerAvertissement,
    statutDe,
    definirStatut,
    modifierReglagesCompletion,
    importer,
    exporter,
  } = useSauvegarde();
  const [onglet, setOnglet] = useState<Onglet>("pokedex");
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_PAR_DEFAUT);
  const rechercheDifferee = useDeferredValue(filtres.recherche);

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
  );

  const especesFiltrees = useMemo(() => {
    const termes = normaliserRecherche(rechercheDifferee).split(" ").filter(Boolean);
    return ENTREES_POKEDEX.filter((espece) => {
      if (filtres.generation !== null && espece.generation !== filtres.generation) {
        return false;
      }
      const statut = sauvegarde.statuts[espece.slug] ?? "non-vu";
      if (!correspondAuFiltreStatut(statut, filtres.statut)) {
        return false;
      }
      const texte = INDEX_RECHERCHE.get(espece.slug) ?? "";
      return termes.every((terme) => texte.includes(terme));
    });
  }, [rechercheDifferee, filtres.generation, filtres.statut, sauvegarde.statuts]);

  return (
    <div className="page">
      <header className="page__entete">
        <h1>PokeIslandHub</h1>
        <nav aria-label="Sections" className="onglets">
          {ONGLETS.map(({ id, libelle }) => (
            <button
              key={id}
              type="button"
              className="onglets__bouton"
              aria-current={onglet === id ? "page" : undefined}
              onClick={() => setOnglet(id)}
            >
              {libelle}
            </button>
          ))}
        </nav>
        <BarreSauvegarde onExporter={exporter} onImporter={importer} />
      </header>

      {avertissement && (
        <div className="avertissement" role="alert">
          <p>{avertissement}</p>
          <button type="button" className="bouton" onClick={fermerAvertissement}>
            Fermer
          </button>
        </div>
      )}

      <main>
        <EnTeteCompletion
          key={nombreImports}
          etat={etatCompletion}
          reglages={reglages}
          nombreVus={nombreVus}
          nombreCaptures={nombreCaptures}
          onReglagesChange={modifierReglagesCompletion}
        />

        {onglet === "evolutions" && <VueEvolutions statuts={sauvegarde.statuts} />}
        {onglet === "pokefinder" && <VuePokeFinder statuts={sauvegarde.statuts} />}
        {onglet === "ev" && <VueEv statuts={sauvegarde.statuts} />}

        {onglet === "pokedex" && (
          <section aria-labelledby="titre-pokedex">
            <h2 id="titre-pokedex" className="visuellement-masque">
              Pokédex
            </h2>
            <BarreFiltres
              filtres={filtres}
              nombreResultats={especesFiltrees.length}
              onFiltresChange={setFiltres}
            />
            <p className="texte-discret aide">
              Cliquer sur un Pokémon pour passer de non vu à vu, puis à capturé.
            </p>
            <ul className="grille">
              {especesFiltrees.map((espece) => (
                <CartePokemon
                  key={espece.slug}
                  espece={espece}
                  statut={statutDe(espece.slug)}
                  onStatutChange={definirStatut}
                />
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
