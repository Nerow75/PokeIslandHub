// src/components/SpritePokemon.tsx

import { type FC } from "react";
import { urlSprite } from "../donnees.ts";
import type { EspecePokemon } from "../types/pokedex.ts";

interface SpritePokemonProps {
  espece: EspecePokemon;
  taille: number;
  className?: string;
}

/**
 * Sprite d'une espèce, ou pastille "?" pour une entrée propre au serveur sans visuel.
 */
const SpritePokemon: FC<SpritePokemonProps> = ({ espece, taille, className }) => {
  const url = urlSprite(espece);
  if (!url) {
    return (
      <span
        className={`sprite-inconnu ${className ?? ""}`}
        style={{ width: taille, height: taille }}
        aria-hidden="true"
      >
        ?
      </span>
    );
  }
  return (
    <img
      className={className}
      src={url}
      alt=""
      width={taille}
      height={taille}
      loading="lazy"
      decoding="async"
    />
  );
};

export default SpritePokemon;
