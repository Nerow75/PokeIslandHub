// src/components/Pagination.tsx

import { type FC } from "react";
import { pagesAProposer } from "../domaine/pagination.ts";

interface PaginationProps {
  page: number;
  nombrePages: number;
  /** Nom de la liste pour les lecteurs d'écran, ex. "évolutions". */
  libelle: string;
  onPageChange: (page: number) => void;
}

/**
 * Navigation entre les pages d'une liste. Rien n'est affiché quand tout tient sur une page.
 */
const Pagination: FC<PaginationProps> = ({ page, nombrePages, libelle, onPageChange }) => {
  if (nombrePages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label={`Pages des ${libelle}`}>
      <button
        type="button"
        className="bouton"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Précédente
      </button>
      <ul className="pagination__pages">
        {pagesAProposer(page, nombrePages).map((numero) =>
          typeof numero === "number" ? (
            <li key={numero}>
              <button
                type="button"
                className={`pagination__numero${numero === page ? " pagination__numero--actif" : ""}`}
                aria-label={`Page ${numero}`}
                aria-current={numero === page ? "page" : undefined}
                onClick={() => onPageChange(numero)}
              >
                {numero}
              </button>
            </li>
          ) : (
            <li key={numero} className="pagination__ellipse" aria-hidden="true">
              …
            </li>
          ),
        )}
      </ul>
      <button
        type="button"
        className="bouton"
        disabled={page === nombrePages}
        onClick={() => onPageChange(page + 1)}
      >
        Suivante
      </button>
    </nav>
  );
};

export default Pagination;
