// src/components/ChampACopier.tsx

import { useState, type FC } from "react";

interface ChampACopierProps {
  libelle: string;
  valeur: string;
}

/**
 * Valeur en lecture seule avec bouton de copie dans le presse-papiers.
 */
const ChampACopier: FC<ChampACopierProps> = ({ libelle, valeur }) => {
  const [estCopie, setEstCopie] = useState(false);

  const handleCopier = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(valeur);
      setEstCopie(true);
      setTimeout(() => setEstCopie(false), 1500);
    } catch {
      setEstCopie(false);
    }
  };

  return (
    <div className="champ-copie">
      <label>
        {libelle}
        <textarea readOnly rows={2} value={valeur} onFocus={(e) => e.target.select()} />
      </label>
      <button
        type="button"
        className="bouton"
        onClick={() => void handleCopier()}
        disabled={!valeur}
      >
        {estCopie ? "Copié" : "Copier"}
      </button>
    </div>
  );
};

export default ChampACopier;
