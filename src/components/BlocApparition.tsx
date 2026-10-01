// src/components/BlocApparition.tsx

import { ESPECES_PAR_SLUG } from "../donnees.ts";
import {
  conditionsApparition,
  libelleAspect,
  libelleBiome,
  libellePosition,
  LIBELLES_RARETE,
} from "../domaine/apparitions.ts";
import type { Apparition } from "../types/apparitions.ts";
import type { EspecePokemon } from "../types/pokedex.ts";

/** Une condition d'apparition : rareté, position, niveaux, biomes et conditions. */
export function BlocApparition({ apparition }: { apparition: Apparition }) {
  const conditions = conditionsApparition(apparition);
  return (
    <li className="apparition">
      <div className="apparition__entete">
        <span className={`rarete rarete--${apparition.rarete}`}>
          {LIBELLES_RARETE[apparition.rarete]}
        </span>
        <span className="apparition__info">{libellePosition(apparition.position)}</span>
        {apparition.niveaux && <span className="apparition__info">Niv. {apparition.niveaux}</span>}
        {apparition.aspect && (
          <span className="apparition__aspect">{libelleAspect(apparition.aspect)}</span>
        )}
      </div>
      <ul className="apparition__biomes" aria-label="Biomes">
        {apparition.biomes.map((biome) => (
          <li key={biome} className="biome">
            {libelleBiome(biome)}
          </li>
        ))}
      </ul>
      {apparition.biomesExclus.length > 0 && (
        <p className="apparition__detail">
          Sauf : {apparition.biomesExclus.map(libelleBiome).join(", ")}
        </p>
      )}
      {conditions.length > 0 && <p className="apparition__detail">{conditions.join(" · ")}</p>}
    </li>
  );
}

/** Explication quand une espèce n'apparaît pas à l'état sauvage. */
export function SansApparition({ espece }: { espece: EspecePokemon }) {
  const parent = espece.evolueDe ? ESPECES_PAR_SLUG.get(espece.evolueDe) : undefined;
  let message = "N'apparaît pas à l'état sauvage dans Cobblemon.";
  if (parent) {
    message = `Pas d'apparition sauvage : à obtenir en faisant évoluer ${parent.nomFr}.`;
  } else if (espece.estLegendaire || espece.estFabuleux) {
    message =
      "Légendaire ou fabuleux : pas d'apparition sauvage classique (événement, autel, serveur).";
  }
  return <p className="apparition__detail">{message}</p>;
}
