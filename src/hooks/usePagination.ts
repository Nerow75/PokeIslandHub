// src/hooks/usePagination.ts

import { useState } from "react";
import { elementsDeLaPage, nombreDePages, pageBornee } from "../domaine/pagination.ts";

export interface Pagination<T> {
  page: number;
  nombrePages: number;
  elementsPage: readonly T[];
  allerALaPage: (page: number) => void;
}

/**
 * Découpe une liste en pages. `cleFiltres` résume les filtres de la liste :
 * quand elle change, la pagination repart de la première page.
 */
export function usePagination<T>(
  elements: readonly T[],
  taillePage: number,
  cleFiltres: string,
): Pagination<T> {
  const [etat, setEtat] = useState({ cleFiltres, page: 1 });
  const nombrePages = nombreDePages(elements.length, taillePage);
  /* Calcul au rendu plutôt qu'un effet : la page demandée ne vaut que pour ces filtres. */
  const page = pageBornee(etat.cleFiltres === cleFiltres ? etat.page : 1, nombrePages);
  return {
    page,
    nombrePages,
    elementsPage: elementsDeLaPage(elements, page, taillePage),
    allerALaPage: (nouvellePage) => {
      setEtat({ cleFiltres, page: nouvellePage });
      /* La nouvelle page se lit depuis son début, filtres compris. */
      window.scrollTo({ top: 0 });
    },
  };
}
