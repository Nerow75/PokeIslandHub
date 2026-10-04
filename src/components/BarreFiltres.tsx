// src/components/BarreFiltres.tsx

import { type FC } from "react";
import { GENERATION_SERVEUR, GENERATIONS, libelleGeneration } from "../donnees.ts";
import { libelleBiome, type MomentJournee } from "../domaine/apparitions.ts";
import { ABREVIATIONS_EV } from "../domaine/ev.ts";
import type { Filtres, FiltreStatut } from "../domaine/filtres.ts";
import type { StatEv } from "../types/pokedex.ts";

const LIBELLES_FILTRE_STATUT: Record<FiltreStatut, string> = {
  tous: "Tous",
  "non-vu": "Non vus",
  vu: "Vus, non capturés",
  capture: "Capturés",
  "non-capture": "Non capturés",
};

interface BarreFiltresProps {
  filtres: Filtres;
  /** Biomes proposés au filtre ; null tant que les apparitions se chargent. */
  biomes: readonly string[] | null;
  nombreResultats: number;
  onFiltresChange: (filtres: Filtres) => void;
}

/**
 * Recherche par nom (FR ou EN) ou numéro, filtres par génération, statut,
 * EV rapportés, biome et moment d'apparition.
 */
const BarreFiltres: FC<BarreFiltresProps> = ({
  filtres,
  biomes,
  nombreResultats,
  onFiltresChange,
}) => {
  return (
    <div className="filtres" role="search">
      <label className="filtres__recherche">
        <span className="visuellement-masque">Rechercher</span>
        <input
          type="search"
          placeholder="Nom FR, nom EN ou numéro"
          value={filtres.recherche}
          onChange={(e) => onFiltresChange({ ...filtres, recherche: e.target.value })}
        />
      </label>

      <label>
        Génération
        <select
          value={filtres.generation ?? ""}
          onChange={(e) =>
            onFiltresChange({
              ...filtres,
              generation: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        >
          <option value="">Toutes</option>
          {[...GENERATIONS, GENERATION_SERVEUR].map((generation) => (
            <option key={generation} value={generation}>
              {libelleGeneration(generation)}
            </option>
          ))}
        </select>
      </label>

      <label>
        Statut
        <select
          value={filtres.statut}
          onChange={(e) => onFiltresChange({ ...filtres, statut: e.target.value as FiltreStatut })}
        >
          {(Object.keys(LIBELLES_FILTRE_STATUT) as FiltreStatut[]).map((statut) => (
            <option key={statut} value={statut}>
              {LIBELLES_FILTRE_STATUT[statut]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Donne des EV en
        <select
          value={filtres.statEv ?? ""}
          onChange={(e) =>
            onFiltresChange({
              ...filtres,
              statEv: e.target.value === "" ? null : (e.target.value as StatEv),
            })
          }
        >
          <option value="">Peu importe</option>
          {ABREVIATIONS_EV.map(({ stat, libelle }) => (
            <option key={stat} value={stat}>
              {libelle}
            </option>
          ))}
        </select>
      </label>

      <label>
        Biome
        <select
          value={filtres.biome ?? ""}
          disabled={biomes === null}
          onChange={(e) =>
            onFiltresChange({ ...filtres, biome: e.target.value === "" ? null : e.target.value })
          }
        >
          <option value="">{biomes === null ? "Chargement..." : "Tous"}</option>
          {(biomes ?? []).map((biome) => (
            <option key={biome} value={biome}>
              {libelleBiome(biome)}
            </option>
          ))}
        </select>
      </label>

      <label>
        Moment
        <select
          value={filtres.moment ?? ""}
          disabled={biomes === null}
          onChange={(e) =>
            onFiltresChange({
              ...filtres,
              moment: e.target.value === "" ? null : (e.target.value as MomentJournee),
            })
          }
        >
          <option value="">Jour et nuit</option>
          <option value="jour">Jour</option>
          <option value="nuit">Nuit</option>
        </select>
      </label>

      <p className="filtres__compte" aria-live="polite">
        {nombreResultats} Pokémon
      </p>
    </div>
  );
};

export default BarreFiltres;
