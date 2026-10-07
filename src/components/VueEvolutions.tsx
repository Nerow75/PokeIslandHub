// src/components/VueEvolutions.tsx

import { useMemo, useState, type FC } from "react";
import { z } from "zod";
import {
  COBBLEMON,
  ESPECES,
  ESPECES_PAR_SLUG,
  evolutionsAffichees,
  INDEX_RECHERCHE,
  normaliserRecherche,
} from "../donnees.ts";
import {
  cleEvolution,
  listerEvolutions,
  regrouperEvolutions,
  type PorteeEvolutions,
} from "../domaine/evolutionsAFaire.ts";
import ConditionEvolution from "./ConditionEvolution.tsx";
import Pagination from "./Pagination.tsx";
import SpritePokemon from "./SpritePokemon.tsx";
import { LIBELLES_STATUT, type StatutEnregistre, type StatutPokemon } from "../domaine/statut.ts";
import type { EspecePokemon } from "../types/pokedex.ts";
import { useFiltresMemorises } from "../hooks/useFiltresMemorises.ts";
import { usePagination } from "../hooks/usePagination.ts";

interface VueEvolutionsProps {
  statuts: Readonly<Record<string, StatutEnregistre>>;
  onStatutChange: (slug: string, statut: StatutPokemon) => void;
}

/** Dernière évolution marquée, pour pouvoir l'annuler. */
interface DerniereEvolution {
  vers: EspecePokemon;
  statutPrecedent: StatutPokemon;
}

interface FiltresEvolutions {
  portee: PorteeEvolutions;
  recherche: string;
}

const FILTRES_PAR_DEFAUT: FiltresEvolutions = { portee: "mes-captures", recherche: "" };

const schemaFiltresEvolutions: z.ZodType<FiltresEvolutions> = z.object({
  portee: z.enum(["mes-captures", "tout"]),
  recherche: z.string(),
});

const EVOLUTIONS_PAR_PAGE = 20;

/**
 * Évolutions à réaliser pour découvrir de nouvelles espèces, triées par niveau requis.
 * Les variantes d'une même évolution (formes régionales, tendances) partagent une ligne.
 */
const VueEvolutions: FC<VueEvolutionsProps> = ({ statuts, onStatutChange }) => {
  const [filtres, setFiltres] = useFiltresMemorises(
    "evolutions",
    schemaFiltresEvolutions,
    FILTRES_PAR_DEFAUT,
  );
  const { portee, recherche } = filtres;
  const [derniere, setDerniere] = useState<DerniereEvolution | null>(null);

  /* Faire évoluer un Pokémon enregistre l'espèce obtenue comme capturée. */
  const handleEvolutionFaite = (vers: EspecePokemon, statutPrecedent: StatutPokemon): void => {
    onStatutChange(vers.slug, "capture");
    setDerniere({ vers, statutPrecedent });
  };

  const handleAnnuler = (): void => {
    if (derniere) {
      onStatutChange(derniere.vers.slug, derniere.statutPrecedent);
      setDerniere(null);
    }
  };

  const groupes = useMemo(
    () =>
      regrouperEvolutions(
        listerEvolutions(
          ESPECES,
          ESPECES_PAR_SLUG,
          (slug) => statuts[slug] ?? "non-vu",
          portee,
          evolutionsAffichees,
        ),
      ),
    [statuts, portee],
  );

  const termes = normaliserRecherche(recherche).split(" ").filter(Boolean);
  const groupesFiltres = groupes.filter((groupe) => {
    const texte = `${INDEX_RECHERCHE.get(groupe.depuis.slug) ?? ""} ${INDEX_RECHERCHE.get(groupe.vers.slug) ?? ""}`;
    return termes.every((terme) => texte.includes(terme));
  });
  const pagination = usePagination(groupesFiltres, EVOLUTIONS_PAR_PAGE, `${portee}|${recherche}`);

  return (
    <section aria-labelledby="titre-evolutions" className="vue">
      <div className="vue__entete">
        <h2 id="titre-evolutions">Évolutions</h2>
        <p className="texte-discret">
          {portee === "mes-captures"
            ? "Tes Pokémon capturés qui peuvent évoluer vers une espèce pas encore capturée."
            : "Toutes les évolutions du Pokédex."}{" "}
          Conditions de Cobblemon {COBBLEMON.versionCobblemon} : le serveur peut les avoir ajustées.
        </p>
      </div>

      <div className="filtres">
        <label className="filtres__recherche">
          <span className="visuellement-masque">Rechercher</span>
          <input
            type="search"
            placeholder="Nom FR, nom EN ou numéro"
            value={recherche}
            onChange={(e) => setFiltres({ ...filtres, recherche: e.target.value })}
          />
        </label>
        <label>
          Afficher
          <select
            value={portee}
            onChange={(e) => setFiltres({ ...filtres, portee: e.target.value as PorteeEvolutions })}
          >
            <option value="mes-captures">À faire avec mes captures</option>
            <option value="tout">Tout le Pokédex</option>
          </select>
        </label>
        <p className="filtres__compte" aria-live="polite">
          {groupesFiltres.length} évolution{groupesFiltres.length > 1 ? "s" : ""}
        </p>
      </div>

      {derniere && (
        <div className="confirmation" role="status">
          <p>
            {derniere.vers.nomFr} marqué comme capturé (avant :{" "}
            {LIBELLES_STATUT[derniere.statutPrecedent].toLowerCase()}).
          </p>
          <button type="button" className="bouton" onClick={handleAnnuler}>
            Annuler
          </button>
        </div>
      )}

      {groupesFiltres.length === 0 ? (
        <p className="vide">
          {portee === "mes-captures"
            ? "Aucune évolution à faire : marque des Pokémon comme capturés dans le Pokédex."
            : "Aucun résultat."}
        </p>
      ) : (
        <>
          <ul className="liste-evolutions">
            {pagination.elementsPage.map(({ depuis, vers, statutCible, niveau, variantes }) => {
              const [principale, ...autres] = variantes;
              return (
                <li key={`${depuis.slug}>${vers.slug}`} className="evolution">
                  <span
                    className="evolution__niveau"
                    aria-label={niveau !== null ? `Niveau ${niveau}` : "Sans niveau"}
                  >
                    {niveau !== null ? `N.${niveau}` : "·"}
                  </span>
                  <span className="evolution__pokemon">
                    <SpritePokemon espece={depuis} taille={56} />
                    <a className="lien-fiche" href={`#fiche/${depuis.slug}`}>
                      {depuis.nomFr}
                    </a>
                  </span>
                  <span className="evolution__fleche" aria-hidden="true">
                    →
                  </span>
                  <span className="evolution__pokemon">
                    <SpritePokemon espece={vers} taille={56} />
                    <span>
                      <a className="lien-fiche" href={`#fiche/${vers.slug}`}>
                        {vers.nomFr}
                      </a>
                      <span className={`etiquette etiquette--${statutCible}`}>
                        {LIBELLES_STATUT[statutCible]}
                      </span>
                    </span>
                  </span>
                  {statutCible === "capture" ? (
                    <span className="evolution__action texte-discret">Déjà capturé</span>
                  ) : (
                    <button
                      type="button"
                      className="bouton bouton--plein evolution__action"
                      aria-label={`Évolution faite : marquer ${vers.nomFr} comme capturé`}
                      onClick={() => handleEvolutionFaite(vers, statutCible)}
                    >
                      Évolution faite
                    </button>
                  )}
                  <div className="evolution__conditions">
                    {principale && (
                      <ul>
                        <ConditionEvolution evolution={principale} />
                      </ul>
                    )}
                    {autres.length > 0 && (
                      <details className="evolution__variantes">
                        <summary>
                          {autres.length} autre{autres.length > 1 ? "s" : ""} variante
                          {autres.length > 1 ? "s" : ""}
                        </summary>
                        <ul>
                          {autres.map((evolution) => (
                            <ConditionEvolution
                              key={cleEvolution(evolution)}
                              evolution={evolution}
                            />
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={pagination.page}
            nombrePages={pagination.nombrePages}
            libelle="évolutions"
            onPageChange={pagination.allerALaPage}
          />
        </>
      )}
    </section>
  );
};

export default VueEvolutions;
