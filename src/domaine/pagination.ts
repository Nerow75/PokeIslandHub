// src/domaine/pagination.ts

/** Repère entre deux numéros de page non consécutifs. */
export type EllipsePagination = "ellipse-debut" | "ellipse-fin";

export function nombreDePages(nombreElements: number, taillePage: number): number {
  return Math.max(1, Math.ceil(nombreElements / taillePage));
}

/** Page ramenée dans les bornes : une liste filtrée peut compter moins de pages qu'avant. */
export function pageBornee(page: number, nombrePages: number): number {
  return Math.min(Math.max(1, page), nombrePages);
}

export function elementsDeLaPage<T>(
  elements: readonly T[],
  page: number,
  taillePage: number,
): readonly T[] {
  return elements.slice((page - 1) * taillePage, page * taillePage);
}

/**
 * Numéros à proposer : première et dernière page, la page courante et ses voisines,
 * des ellipses pour le reste. Ex. page 6 sur 20 -> 1 … 5 6 7 … 20.
 */
export function pagesAProposer(page: number, nombrePages: number): (number | EllipsePagination)[] {
  const numeros = new Set([1, nombrePages, page - 1, page, page + 1]);
  /* Une ellipse qui ne cacherait qu'une page est remplacée par cette page. */
  if (page - 3 === 1) numeros.add(2);
  if (page + 3 === nombrePages) numeros.add(nombrePages - 1);
  const tries = [...numeros].filter((n) => n >= 1 && n <= nombrePages).sort((a, b) => a - b);
  const resultat: (number | EllipsePagination)[] = [];
  for (const numero of tries) {
    const precedent = resultat.at(-1);
    if (typeof precedent === "number" && numero - precedent > 1) {
      resultat.push(numero < page ? "ellipse-debut" : "ellipse-fin");
    }
    resultat.push(numero);
  }
  return resultat;
}
