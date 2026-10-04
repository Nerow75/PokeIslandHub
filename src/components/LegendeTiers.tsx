// src/components/LegendeTiers.tsx

import { type FC } from "react";
import { DESCRIPTIONS_TIERS, ORDRE_TIERS } from "../domaine/equipe.ts";

/**
 * Pense-bête des tiers Smogon : l'échelle du plus fort au plus faible, toujours visible,
 * et la signification de chaque tier en dépliant.
 */
const LegendeTiers: FC = () => (
  <details className="legende-tiers">
    <summary>
      <span className="legende-tiers__titre">Tiers, du plus fort au plus faible</span>
      <ol className="legende-tiers__echelle" aria-label="Tiers du plus fort au plus faible">
        {ORDRE_TIERS.map((tier) => (
          <li key={tier}>
            <span className="tier" data-tier={tier}>
              {tier}
            </span>
          </li>
        ))}
      </ol>
    </summary>
    <dl className="legende-tiers__detail">
      {ORDRE_TIERS.map((tier) => (
        <div key={tier}>
          <dt>
            <span className="tier" data-tier={tier}>
              {tier}
            </span>{" "}
            {DESCRIPTIONS_TIERS[tier].nom}
          </dt>
          <dd>{DESCRIPTIONS_TIERS[tier].description}</dd>
        </div>
      ))}
    </dl>
    <p className="texte-discret">
      Un tier « BL » (BorderLine) est trop fort pour son tier mais pas assez pour le précédent. Le
      badge « G7 » ou « G8 » indique un tier tiré d'une génération plus ancienne.
    </p>
  </details>
);

export default LegendeTiers;
