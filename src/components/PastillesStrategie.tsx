// src/components/PastillesStrategie.tsx

import { type FC } from "react";
import { NOMS_TYPES } from "../donnees.ts";

/** Pastille du tier Smogon, avec la génération quand elle n'est pas la plus récente. */
export const BadgeTier: FC<{
  tier: string | null;
  generation: number | null;
}> = ({ tier, generation }) => (
  <span className="tier" data-tier={tier ?? "aucun"}>
    {tier ?? "?"}
    {generation !== null && generation < 9 && (
      <span className="tier__gen" title={`Tier de la génération ${generation}`}>
        G{generation}
      </span>
    )}
  </span>
);

/** Pastilles de types, aux couleurs officielles. */
export const TypesPokemon: FC<{ types: readonly string[] }> = ({ types }) => (
  <span className="carte__types">
    {types.map((type) => (
      <span key={type} className="type" data-type={type}>
        {NOMS_TYPES[type] ?? type}
      </span>
    ))}
  </span>
);
