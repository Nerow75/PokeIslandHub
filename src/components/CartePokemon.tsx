// src/components/CartePokemon.tsx

import { memo } from "react";
import { urlSprite } from "../donnees.ts";
import { LIBELLES_STATUT, statutSuivant, type StatutPokemon } from "../domaine/statut.ts";
import type { EspecePokemon } from "../types/pokedex.ts";

interface CartePokemonProps {
  espece: EspecePokemon;
  statut: StatutPokemon;
  onStatutChange: (slug: string, statut: StatutPokemon) => void;
}

/**
 * Carte d'une espèce. Un clic fait passer au statut suivant :
 * non vu -> vu -> capturé -> non vu.
 */
const CartePokemon = memo(function CartePokemon({
  espece,
  statut,
  onStatutChange,
}: CartePokemonProps) {
  const suivant = statutSuivant(statut);
  const numero = `#${String(espece.id).padStart(4, "0")}`;

  return (
    <li>
      <button
        type="button"
        className={`carte carte--${statut}`}
        aria-label={`${espece.nomFr} ${numero}, ${LIBELLES_STATUT[statut]}. Passer à : ${LIBELLES_STATUT[suivant]}`}
        onClick={() => onStatutChange(espece.slug, suivant)}
      >
        <span className="carte__numero">{numero}</span>
        <img
          className="carte__sprite"
          src={urlSprite(espece.id)}
          alt=""
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
        />
        <span className="carte__nom">{espece.nomFr}</span>
        <span className="carte__nom-en">{espece.nomEn}</span>
        <span className="carte__statut">{LIBELLES_STATUT[statut]}</span>
      </button>
    </li>
  );
});

export default CartePokemon;
