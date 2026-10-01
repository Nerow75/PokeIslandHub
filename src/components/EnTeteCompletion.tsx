// src/components/EnTeteCompletion.tsx

import { type FC } from "react";
import {
  formaterPourcentage,
  type BaseCompletion,
  type EtatCompletion,
  type ReglagesCompletion,
} from "../domaine/completion.ts";

interface EnTeteCompletionProps {
  etat: EtatCompletion;
  reglages: ReglagesCompletion;
  nombreVus: number;
  nombreCaptures: number;
  /** Total calculé à partir des entrées connues du Pokédex du serveur. */
  totalAutomatique: number;
  onReglagesChange: (reglages: ReglagesCompletion) => void;
}

/**
 * Taux de complétion du Pokédex et progression vers le prochain rang du serveur.
 */
const EnTeteCompletion: FC<EnTeteCompletionProps> = ({
  etat,
  reglages,
  nombreVus,
  nombreCaptures,
  totalAutomatique,
  onReglagesChange,
}) => {
  const progressionObjectif =
    etat.objectif > 0 ? Math.min(100, (etat.pourcentage / etat.objectif) * 100) : 100;

  const handleTotalManuel = (valeur: string): void => {
    const nombre = Number(valeur);
    if (valeur !== "" && Number.isInteger(nombre) && nombre > 0) {
      onReglagesChange({ ...reglages, totalManuel: nombre });
    }
  };

  const handleObjectif = (valeur: string): void => {
    const nombre = Number(valeur);
    if (valeur !== "" && nombre >= 0 && nombre <= 100) {
      onReglagesChange({ ...reglages, objectif: nombre });
    }
  };

  return (
    <section className="completion" aria-labelledby="titre-completion">
      <div className="completion__principal">
        <h2 id="titre-completion" className="completion__titre">
          Complétion
        </h2>
        <p className="completion__pourcentage">{formaterPourcentage(etat.pourcentage)}</p>
        <p className="completion__detail">
          {etat.compte} / {etat.total} {reglages.base === "capture" ? "capturés" : "vus"}
        </p>
      </div>

      <div className="completion__objectif">
        <p>
          Objectif {formaterPourcentage(etat.objectif)} :{" "}
          {etat.restantPourObjectif > 0 ? (
            <strong>encore {etat.restantPourObjectif}</strong>
          ) : (
            <strong>atteint</strong>
          )}{" "}
          <span className="texte-discret">({etat.requisPourObjectif} requis)</span>
        </p>
        <progress
          className="completion__barre"
          max={100}
          value={progressionObjectif}
          aria-label="Progression vers l'objectif de rang"
        />
        <p className="texte-discret">
          {nombreVus} vus, dont {nombreCaptures} capturés
        </p>
      </div>

      <details className="completion__reglages">
        <summary>Réglages du calcul</summary>
        <p className="texte-discret">
          Règle exacte du serveur à confirmer : ajuster jusqu'à retrouver le pourcentage affiché en
          jeu.
        </p>
        <label>
          Compter
          <select
            value={reglages.base}
            onChange={(e) =>
              onReglagesChange({ ...reglages, base: e.target.value as BaseCompletion })
            }
          >
            <option value="capture">les capturés</option>
            <option value="vu">les vus (capturés inclus)</option>
          </select>
        </label>
        <label className="case-a-cocher">
          <input
            type="checkbox"
            checked={reglages.totalManuel === null}
            onChange={(e) =>
              onReglagesChange({
                ...reglages,
                totalManuel: e.target.checked ? null : totalAutomatique,
              })
            }
          />
          Total automatique ({totalAutomatique} entrées)
        </label>
        {reglages.totalManuel !== null && (
          <label>
            Total manuel
            <input
              type="number"
              min={1}
              step={1}
              defaultValue={reglages.totalManuel}
              onChange={(e) => handleTotalManuel(e.target.value)}
            />
          </label>
        )}
        <label>
          Objectif (%)
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            defaultValue={reglages.objectif}
            onChange={(e) => handleObjectif(e.target.value)}
          />
        </label>
      </details>
    </section>
  );
};

export default EnTeteCompletion;
