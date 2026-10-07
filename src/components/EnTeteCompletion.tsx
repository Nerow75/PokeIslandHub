// src/components/EnTeteCompletion.tsx

import { type FC } from "react";
import {
  formaterPourcentage,
  RANGS,
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

  const handleRangActuel = (valeur: string): void => {
    const rang = RANGS.find((r) => r.id === valeur);
    onReglagesChange({ ...reglages, rangActuel: rang?.id ?? null });
  };

  const libelleObjectif = etat.rangVise
    ? `Prochain rang, ${etat.rangVise.nom} (${formaterPourcentage(etat.objectif)})`
    : `Dernier rang obtenu, Pokédex complet (${formaterPourcentage(etat.objectif)})`;

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
        <label className="completion__rang">
          Mon rang
          <select
            value={reglages.rangActuel ?? ""}
            onChange={(e) => handleRangActuel(e.target.value)}
          >
            <option value="">Aucun rang</option>
            {RANGS.map((rang) => (
              <option key={rang.id} value={rang.id}>
                {rang.nom} ({rang.seuil} %)
              </option>
            ))}
          </select>
        </label>
        <p>
          {libelleObjectif} :{" "}
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
      </details>
    </section>
  );
};

export default EnTeteCompletion;
