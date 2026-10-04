// src/components/CartePokemon.tsx

import { memo } from "react";
import { NOMS_TYPES } from "../donnees.ts";
import { resumeEv } from "../domaine/ev.ts";
import { BadgeTier } from "./PastillesStrategie.tsx";
import SpritePokemon from "./SpritePokemon.tsx";
import { LIBELLES_STATUT, statutSuivant, type StatutPokemon } from "../domaine/statut.ts";
import type { EspecePokemon } from "../types/pokedex.ts";

interface CartePokemonProps {
  espece: EspecePokemon;
  statut: StatutPokemon;
  /** Tier Smogon, null tant que les données ne sont pas chargées ou si inconnu. */
  tier: string | null;
  generationTier: number | null;
  /** Où trouver le Pokémon en une ligne, affiché tant qu'il n'est pas capturé. */
  repereApparition: string | null;
  onStatutChange: (slug: string, statut: StatutPokemon) => void;
}

/**
 * Carte d'une espèce. Un clic fait passer au statut suivant :
 * non vu -> vu -> capturé -> non vu.
 */
const CartePokemon = memo(function CartePokemon({
  espece,
  statut,
  tier,
  generationTier,
  repereApparition,
  onStatutChange,
}: CartePokemonProps) {
  const suivant = statutSuivant(statut);
  const numero = `#${String(espece.id).padStart(4, "0")}`;
  const ev = resumeEv(espece.evRapportes);

  return (
    <li className="grille__case">
      <button
        type="button"
        className={`carte carte--${statut}`}
        data-type={espece.types[0]}
        aria-label={`${espece.nomFr} ${numero}${ev ? `, EV ${ev}` : ""}, ${LIBELLES_STATUT[statut]}. Passer à : ${LIBELLES_STATUT[suivant]}`}
        onClick={() => onStatutChange(espece.slug, suivant)}
      >
        <span className="carte__haut">
          <span className="carte__numero">{numero}</span>
          {statut === "capture" && <span className="pokeball pokeball--mini" aria-hidden="true" />}
        </span>
        <span className="carte__scene">
          <SpritePokemon espece={espece} taille={96} className="carte__sprite" />
        </span>
        <span className="carte__nom">{espece.nomFr}</span>
        <span className="carte__nom-en">{espece.nomEn}</span>
        {espece.types.length > 0 && (
          <span className="carte__types">
            {espece.types.map((type) => (
              <span key={type} className="type" data-type={type}>
                {NOMS_TYPES[type] ?? type}
              </span>
            ))}
          </span>
        )}
        {(ev || tier) && (
          <span className="carte__reperes">
            {tier && <BadgeTier tier={tier} generation={generationTier} />}
            {ev && (
              <span className="carte__ev" title="EV rapportés quand il est mis K.O.">
                EV {ev}
              </span>
            )}
          </span>
        )}
        {statut !== "capture" && repereApparition && (
          <span className="carte__ou" title="Apparition la plus facile">
            {repereApparition}
          </span>
        )}
        <span className="carte__statut">{LIBELLES_STATUT[statut]}</span>
      </button>
      {espece.generation !== 0 && (
        <a
          className="carte__fiche"
          href={`#fiche/${espece.slug}`}
          aria-label={`Fiche de ${espece.nomFr}`}
        >
          Fiche
        </a>
      )}
    </li>
  );
});

export default CartePokemon;
