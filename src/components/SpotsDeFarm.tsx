// src/components/SpotsDeFarm.tsx

import { useMemo, useState, type FC } from "react";
import { ESPECES, ESPECES_PAR_SLUG } from "../donnees.ts";
import {
  LIBELLES_RARETE,
  libelleBiome,
  meilleureRarete,
  TAG_PARTOUT,
  type MomentJournee,
} from "../domaine/apparitions.ts";
import type { Rarete } from "../types/apparitions.ts";
import { ABREVIATIONS_EV } from "../domaine/ev.ts";
import { sourcesPartout, spotsDeFarm, type PresenceFarm } from "../domaine/farmEv.ts";
import { useApparitions } from "../hooks/useApparitions.ts";
import type { StatEv } from "../types/pokedex.ts";
import SpritePokemon from "./SpritePokemon.tsx";

interface SpotsDeFarmProps {
  stat: StatEv;
}

const NOMBRE_SPOTS = 5;
/* Au-delà, les Pokémon d'un spot sont repliés : les premiers rapportent le plus. */
const ESPECES_VISIBLES = 8;

const ListeEspecesFarm: FC<{ presences: readonly PresenceFarm[] }> = ({ presences }) => (
  <ul className="spot__especes">
    {presences.map((presence) => {
      const espece = ESPECES_PAR_SLUG.get(presence.slug);
      if (!espece) return null;
      return (
        <li key={presence.slug}>
          <a className="spot__espece lien-fiche" href={`#fiche/${espece.slug}`}>
            <SpritePokemon espece={espece} taille={40} />
            <span>
              {espece.nomFr} <strong className="ev-positif">+{presence.ev}</strong>
              <span className="texte-discret">
                {" "}
                {LIBELLES_RARETE[presence.rarete].toLowerCase()}
              </span>
            </span>
          </a>
        </li>
      );
    })}
  </ul>
);

/**
 * Meilleurs biomes pour farmer une statistique : ceux où l'on croise le plus de
 * Pokémon qui rapportent ces EV, pondérés par leurs EV et leur rareté.
 */
const SpotsDeFarm: FC<SpotsDeFarmProps> = ({ stat }) => {
  const chargement = useApparitions();
  const [moment, setMoment] = useState<MomentJournee | null>(null);
  const parEspece = chargement.etat === "pret" ? chargement.donnees.parEspece : null;
  const raretePartout = (slug: string): Rarete =>
    meilleureRarete((parEspece?.[slug] ?? []).filter((a) => a.biomes.includes(TAG_PARTOUT))) ??
    "common";
  const libelleStat = ABREVIATIONS_EV.find((a) => a.stat === stat)?.libelle ?? stat;

  const { spots, partout } = useMemo(() => {
    if (!parEspece) return { spots: [], partout: [] };
    const sources = ESPECES.map((e) => ({ slug: e.slug, ev: e.evRapportes[stat] }));
    return {
      spots: spotsDeFarm(sources, parEspece, moment).slice(0, NOMBRE_SPOTS),
      partout: sourcesPartout(sources, parEspece, moment),
    };
  }, [parEspece, stat, moment]);

  return (
    <section aria-labelledby="titre-spots" className="panneau">
      <div className="suggestions__entete">
        <h3 id="titre-spots">Où farmer : {libelleStat}</h3>
        <label>
          Moment
          <select
            value={moment ?? ""}
            onChange={(e) =>
              setMoment(e.target.value === "" ? null : (e.target.value as MomentJournee))
            }
          >
            <option value="">Jour et nuit</option>
            <option value="jour">Jour</option>
            <option value="nuit">Nuit</option>
          </select>
        </label>
      </div>
      {chargement.etat === "chargement" && (
        <div className="squelette__ligne" aria-busy="true" aria-label="Chargement" />
      )}
      {chargement.etat === "erreur" && (
        <p className="message-erreur" role="alert">
          {chargement.message}
        </p>
      )}
      {chargement.etat === "pret" && (
        <>
          <p className="texte-discret">
            Biomes où l'on croise le plus de Pokémon qui donnent des EV en {libelleStat}, en tenant
            compte des EV rapportés et de la rareté (Cobblemon {chargement.donnees.versionCobblemon}
            ).
          </p>
          <ol className="spots">
            {spots.map((spot, index) => (
              <li key={spot.biome} className="spot">
                <p className="spot__titre">
                  <span className="spot__rang">{index + 1}</span>
                  {libelleBiome(spot.biome)}
                  <span className="texte-discret">
                    {spot.presences.length} Pokémon, {spot.presences.reduce((t, p) => t + p.ev, 0)}{" "}
                    EV au total
                  </span>
                </p>
                <ListeEspecesFarm presences={spot.presences.slice(0, ESPECES_VISIBLES)} />
                {spot.presences.length > ESPECES_VISIBLES && (
                  <details className="spot__autres">
                    <summary>{spot.presences.length - ESPECES_VISIBLES} autres Pokémon</summary>
                    <ListeEspecesFarm presences={spot.presences.slice(ESPECES_VISIBLES)} />
                  </details>
                )}
              </li>
            ))}
          </ol>
          {partout.length > 0 && (
            <details className="spot__autres">
              <summary>
                {partout.length} Pokémon visibles partout en Surface, quel que soit le biome
              </summary>
              <ListeEspecesFarm
                presences={partout.map(({ slug, ev }) => ({
                  slug,
                  ev,
                  rarete: raretePartout(slug),
                }))}
              />
            </details>
          )}
        </>
      )}
    </section>
  );
};

export default SpotsDeFarm;
