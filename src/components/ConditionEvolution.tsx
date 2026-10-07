// src/components/ConditionEvolution.tsx

import { type FC } from "react";
import { libelleAspect } from "../domaine/apparitions.ts";
import type { EvolutionAffichee } from "../domaine/evolutionsAFaire.ts";

interface ConditionEvolutionProps {
  evolution: EvolutionAffichee;
}

/** "Forme d'Alola" -> "forme d'Alola". */
function minusculeInitiale(texte: string): string {
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}

/**
 * Une façon d'obtenir l'évolution, avec l'aspect requis au départ et la forme obtenue.
 */
const ConditionEvolution: FC<ConditionEvolutionProps> = ({ evolution }) => {
  return (
    <li>
      {evolution.aspectDepart && <strong>{libelleAspect(evolution.aspectDepart)} : </strong>}
      {evolution.description}
      {evolution.aspectObtenu &&
        ` (donne la ${minusculeInitiale(libelleAspect(evolution.aspectObtenu))})`}
    </li>
  );
};

export default ConditionEvolution;
