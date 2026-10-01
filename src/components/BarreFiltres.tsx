// src/components/BarreFiltres.tsx

import { type FC } from "react";
import { GENERATION_SERVEUR, GENERATIONS, libelleGeneration } from "../donnees.ts";
import type { Filtres, FiltreStatut } from "../domaine/filtres.ts";

const LIBELLES_FILTRE_STATUT: Record<FiltreStatut, string> = {
  tous: "Tous",
  "non-vu": "Non vus",
  vu: "Vus, non capturés",
  capture: "Capturés",
  "non-capture": "Non capturés",
};

interface BarreFiltresProps {
  filtres: Filtres;
  nombreResultats: number;
  onFiltresChange: (filtres: Filtres) => void;
}

/**
 * Recherche par nom (FR ou EN) ou numéro, filtres par génération et par statut.
 */
const BarreFiltres: FC<BarreFiltresProps> = ({ filtres, nombreResultats, onFiltresChange }) => {
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

      <p className="filtres__compte" aria-live="polite">
        {nombreResultats} Pokémon
      </p>
    </div>
  );
};

export default BarreFiltres;
