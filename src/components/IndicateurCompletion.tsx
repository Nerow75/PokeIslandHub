// src/components/IndicateurCompletion.tsx

import { type FC } from "react";
import { formaterPourcentage, type EtatCompletion } from "../domaine/completion.ts";

interface IndicateurCompletionProps {
  etat: EtatCompletion;
  onOuvrir: () => void;
}

/**
 * Complétion en raccourci dans la barre du haut : pourcentage et mini-jauge vers
 * l'objectif du prochain rang. Le détail et les réglages restent sur l'onglet Pokédex.
 */
const IndicateurCompletion: FC<IndicateurCompletionProps> = ({ etat, onOuvrir }) => {
  const progression =
    etat.objectif > 0 ? Math.min(100, (etat.pourcentage / etat.objectif) * 100) : 100;
  const detail =
    etat.restantPourObjectif > 0
      ? `${etat.compte} / ${etat.total}, encore ${etat.restantPourObjectif} pour ${formaterPourcentage(etat.objectif)}`
      : `${etat.compte} / ${etat.total}, objectif de ${formaterPourcentage(etat.objectif)} atteint`;
  return (
    <button
      type="button"
      className="repere completion-mini"
      onClick={onOuvrir}
      title={detail}
      aria-label={`Complétion ${formaterPourcentage(etat.pourcentage)}, ${detail}`}
    >
      <span className="repere__chiffre">{formaterPourcentage(etat.pourcentage)}</span>
      <span className="completion-mini__jauge" aria-hidden="true">
        <span style={{ width: `${progression}%` }} />
      </span>
    </button>
  );
};

export default IndicateurCompletion;
