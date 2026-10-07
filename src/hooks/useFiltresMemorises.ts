// src/hooks/useFiltresMemorises.ts

import { useState } from "react";
import type { z } from "zod";

/* Filtres propres à ce navigateur (hors sauvegarde) : retrouvés au rechargement de la page. */
const PREFIXE_CLE = "pokeislandhub:filtres:";

function lireFiltres<T extends object>(cle: string, schema: z.ZodType<T>, defauts: T): T {
  try {
    const brut = localStorage.getItem(PREFIXE_CLE + cle);
    if (brut === null) return defauts;
    const memorises: unknown = JSON.parse(brut);
    if (typeof memorises !== "object" || memorises === null) return defauts;
    /* Un filtre ajouté depuis prend sa valeur par défaut ; un filtre invalide annule le tout. */
    const resultat = schema.safeParse({ ...defauts, ...memorises });
    return resultat.success ? resultat.data : defauts;
  } catch {
    return defauts;
  }
}

/**
 * État de filtres mémorisé dans le navigateur sous `cle`, validé par `schema` à la relecture.
 * `imposes` l'emporte sur la mémoire à l'ouverture (ex. stat choisie depuis un lien).
 */
export function useFiltresMemorises<T extends object>(
  cle: string,
  schema: z.ZodType<T>,
  defauts: T,
  imposes: Partial<T> = {},
): [T, (filtres: T) => void] {
  const [filtres, setFiltres] = useState(() => ({
    ...lireFiltres(cle, schema, defauts),
    ...imposes,
  }));
  const modifierFiltres = (nouveaux: T): void => {
    setFiltres(nouveaux);
    try {
      localStorage.setItem(PREFIXE_CLE + cle, JSON.stringify(nouveaux));
    } catch {
      /* Filtres non mémorisés : sans conséquence. */
    }
  };
  return [filtres, modifierFiltres];
}
