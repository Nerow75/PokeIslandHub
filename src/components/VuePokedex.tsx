// src/components/VuePokedex.tsx

import { useDeferredValue, useMemo, type FC } from "react";
import { ENTREES_POKEDEX, INDEX_RECHERCHE, normaliserRecherche } from "../donnees.ts";
import {
  apparaitIci,
  apparitionLaPlusFacile,
  biomesConnus,
  libelleRepere,
} from "../domaine/apparitions.ts";
import {
  correspondAuFiltreStatut,
  filtreApparitionActif,
  type Filtres,
} from "../domaine/filtres.ts";
import type { StatutEnregistre, StatutPokemon } from "../domaine/statut.ts";
import { useApparitions } from "../hooks/useApparitions.ts";
import { useStrategie } from "../hooks/useStrategie.ts";
import { usePagination } from "../hooks/usePagination.ts";
import BarreFiltres from "./BarreFiltres.tsx";
import CartePokemon from "./CartePokemon.tsx";
import Pagination from "./Pagination.tsx";

interface VuePokedexProps {
  filtres: Filtres;
  onFiltresChange: (filtres: Filtres) => void;
  statuts: Readonly<Record<string, StatutEnregistre>>;
  onStatutChange: (slug: string, statut: StatutPokemon) => void;
}

const POKEMON_PAR_PAGE = 60;

/**
 * Grille du Pokédex et ses filtres. Les tiers et les apparitions (chargés à la demande)
 * ajoutent sur chaque carte un repère de force et, si besoin, où trouver le Pokémon.
 */
const VuePokedex: FC<VuePokedexProps> = ({ filtres, onFiltresChange, statuts, onStatutChange }) => {
  const rechercheDifferee = useDeferredValue(filtres.recherche);
  const apparitions = useApparitions();
  const strategie = useStrategie();
  const parEspeceApparitions = apparitions.etat === "pret" ? apparitions.donnees.parEspece : null;
  const parEspeceStrategie = strategie.etat === "pret" ? strategie.donnees.parEspece : null;

  const biomes = useMemo(
    () => (parEspeceApparitions ? biomesConnus(parEspeceApparitions) : null),
    [parEspeceApparitions],
  );

  /*
   * Repère d'apparition précalculé : les cartes mémoïsées reçoivent une simple chaîne.
   * Avec un filtre de biome ou de moment, seules les apparitions qui y correspondent comptent.
   */
  const { biome, moment } = filtres;
  const reperes = useMemo(() => {
    const table = new Map<string, string>();
    if (!parEspeceApparitions) return table;
    for (const [slug, liste] of Object.entries(parEspeceApparitions)) {
      const retenues = liste.filter((a) => apparaitIci([a], biome, moment));
      const repere = apparitionLaPlusFacile(retenues, biome);
      if (repere) table.set(slug, libelleRepere(repere));
    }
    return table;
  }, [parEspeceApparitions, biome, moment]);

  const especesFiltrees = useMemo(() => {
    const termes = normaliserRecherche(rechercheDifferee).split(" ").filter(Boolean);
    const filtrerApparitions = filtreApparitionActif(filtres) && parEspeceApparitions !== null;
    return ENTREES_POKEDEX.filter((espece) => {
      if (filtres.generation !== null && espece.generation !== filtres.generation) return false;
      if (!correspondAuFiltreStatut(statuts[espece.slug] ?? "non-vu", filtres.statut)) return false;
      if (filtres.statEv !== null && espece.evRapportes[filtres.statEv] === 0) return false;
      if (
        filtrerApparitions &&
        !apparaitIci(parEspeceApparitions[espece.slug] ?? [], filtres.biome, filtres.moment)
      ) {
        return false;
      }
      const texte = INDEX_RECHERCHE.get(espece.slug) ?? "";
      return termes.every((terme) => texte.includes(terme));
    });
  }, [rechercheDifferee, filtres, statuts, parEspeceApparitions]);

  const pagination = usePagination(especesFiltrees, POKEMON_PAR_PAGE, JSON.stringify(filtres));

  return (
    <section aria-labelledby="titre-pokedex">
      <h2 id="titre-pokedex" className="visuellement-masque">
        Pokédex
      </h2>
      <BarreFiltres
        filtres={filtres}
        biomes={biomes}
        nombreResultats={especesFiltrees.length}
        onFiltresChange={onFiltresChange}
      />
      <p className="texte-discret aide">
        Cliquer sur un Pokémon pour passer de non vu à vu, puis à capturé.
      </p>
      {especesFiltrees.length === 0 ? (
        <p className="vide">Aucun Pokémon ne correspond à ces filtres.</p>
      ) : (
        <>
          <ul className="grille">
            {pagination.elementsPage.map((espece) => {
              const strategieEspece = parEspeceStrategie?.[espece.slug];
              return (
                <CartePokemon
                  key={espece.slug}
                  espece={espece}
                  statut={statuts[espece.slug] ?? "non-vu"}
                  tier={strategieEspece?.tier ?? null}
                  generationTier={strategieEspece?.generationTier ?? null}
                  repereApparition={reperes.get(espece.slug) ?? null}
                  onStatutChange={onStatutChange}
                />
              );
            })}
          </ul>
          <Pagination
            page={pagination.page}
            nombrePages={pagination.nombrePages}
            libelle="Pokémon"
            onPageChange={pagination.allerALaPage}
          />
        </>
      )}
    </section>
  );
};

export default VuePokedex;
