// src/components/SuggestionsNoms.tsx

import { memo } from "react";
import { ESPECES } from "../donnees.ts";

/**
 * Suggestions de noms français pour les champs de saisie (attribut `list`).
 * 1025 options : rendues une seule fois par identifiant.
 */
const SuggestionsNoms = memo(function SuggestionsNoms({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {ESPECES.map((espece) => (
        <option key={espece.slug} value={espece.nomFr} />
      ))}
    </datalist>
  );
});

export default SuggestionsNoms;
