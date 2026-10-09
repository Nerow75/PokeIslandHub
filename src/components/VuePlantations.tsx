// src/components/VuePlantations.tsx

import { useState, type FC } from "react";
import { PLANTES_VANILLA } from "../data/plantesVanilla.ts";
import { COBBLEMON, normaliserRecherche } from "../donnees.ts";
import {
  bilanPlantations,
  QUANTITE_PLANTS_MAX,
  type Plantations,
} from "../domaine/plantations.ts";
import type { PlanteCobblemon } from "../types/cobblemon.ts";

interface VuePlantationsProps {
  plantations: Readonly<Plantations>;
  onQuantiteChange: (id: string, quantite: number) => void;
}

const CATEGORIES: readonly { id: string; titre: string; plantes: readonly PlanteCobblemon[] }[] = [
  { id: "noigrumes", titre: "Noigrumes", plantes: COBBLEMON.plantes.noigrumes },
  { id: "baies", titre: "Baies", plantes: COBBLEMON.plantes.baies },
  { id: "vanilla", titre: "Cultures du jeu de base", plantes: PLANTES_VANILLA },
];

const TOUS_LES_IDS = CATEGORIES.flatMap((c) => c.plantes.map((p) => p.id));

function libelleBilan({ plants, varietes }: { plants: number; varietes: number }): string {
  if (plants === 0) return "rien de planté";
  return `${plants} plant${plants > 1 ? "s" : ""}, ${varietes} variété${varietes > 1 ? "s" : ""}`;
}

const LignePlante: FC<{
  plante: PlanteCobblemon;
  quantite: number;
  onQuantiteChange: (id: string, quantite: number) => void;
}> = ({ plante, quantite, onQuantiteChange }) => (
  <li className="plantation" data-plantee={quantite > 0}>
    <span className="plantation__nom">{plante.nomFr}</span>
    <span className="plantation__compteur">
      <button
        type="button"
        className="bouton bouton--petit plantation__pas"
        aria-label={`Un plant de moins : ${plante.nomFr}`}
        disabled={quantite === 0}
        onClick={() => onQuantiteChange(plante.id, quantite - 1)}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={QUANTITE_PLANTS_MAX}
        placeholder="0"
        aria-label={`Nombre de plants : ${plante.nomFr}`}
        value={quantite === 0 ? "" : quantite}
        onChange={(e) => onQuantiteChange(plante.id, Number(e.target.value))}
      />
      <button
        type="button"
        className="bouton bouton--petit plantation__pas"
        aria-label={`Un plant de plus : ${plante.nomFr}`}
        disabled={quantite >= QUANTITE_PLANTS_MAX}
        onClick={() => onQuantiteChange(plante.id, quantite + 1)}
      >
        +
      </button>
    </span>
  </li>
);

/**
 * Inventaire de ce qui est planté dans la base : noigrumes et baies de Cobblemon,
 * cultures du jeu de base, avec le nombre de plants de chacun.
 */
const VuePlantations: FC<VuePlantationsProps> = ({ plantations, onQuantiteChange }) => {
  const [recherche, setRecherche] = useState("");
  const [seulementPlantees, setSeulementPlantees] = useState(false);
  const cle = normaliserRecherche(recherche);

  const visibles = (plantes: readonly PlanteCobblemon[]): PlanteCobblemon[] =>
    plantes.filter(
      (p) =>
        (!seulementPlantees || (plantations[p.id] ?? 0) > 0) &&
        (cle === "" || normaliserRecherche(p.nomFr).includes(cle)),
    );

  return (
    <section aria-labelledby="titre-plantations" className="vue">
      <div className="vue__entete">
        <h2 id="titre-plantations">Plantations</h2>
        <p className="texte-discret">
          Ce qui pousse dans ta base, plant par plant :{" "}
          {libelleBilan(bilanPlantations(plantations, TOUS_LES_IDS))}.
        </p>
      </div>

      <div className="filtres">
        <label className="filtres__recherche">
          <span className="visuellement-masque">Rechercher une plante</span>
          <input
            type="search"
            placeholder="Noigrume Rouge, Baie Oran, Blé..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </label>
        <label className="case-a-cocher">
          <input
            type="checkbox"
            checked={seulementPlantees}
            onChange={(e) => setSeulementPlantees(e.target.checked)}
          />
          Seulement ce que j'ai planté
        </label>
      </div>

      {CATEGORIES.map(({ id, titre, plantes }) => {
        const liste = visibles(plantes);
        const bilan = bilanPlantations(
          plantations,
          plantes.map((p) => p.id),
        );
        return (
          <section key={id} className="panneau" aria-labelledby={`titre-plantes-${id}`}>
            <div className="plantations__entete">
              <h3 id={`titre-plantes-${id}`}>{titre}</h3>
              <span className="texte-discret">{libelleBilan(bilan)}</span>
            </div>
            {liste.length === 0 ? (
              <p className="texte-discret">
                {seulementPlantees && cle === ""
                  ? "Rien de planté ici."
                  : "Aucune plante ne correspond."}
              </p>
            ) : (
              <ul className="plantations">
                {liste.map((plante) => (
                  <LignePlante
                    key={plante.id}
                    plante={plante}
                    quantite={plantations[plante.id] ?? 0}
                    onQuantiteChange={onQuantiteChange}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </section>
  );
};

export default VuePlantations;
