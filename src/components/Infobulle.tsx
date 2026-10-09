// src/components/Infobulle.tsx

import { useId, useRef, useState, type FC, type KeyboardEvent, type ReactNode } from "react";

interface InfobulleProps {
  /** Texte survolé ou focalisé qui ouvre l'infobulle. */
  children: ReactNode;
  /** Contenu de l'infobulle. */
  contenu: ReactNode;
}

/* Hauteur réservée au-dessus du déclencheur avant de basculer l'infobulle en dessous. */
const HAUTEUR_MIN_AU_DESSUS = 180;
/* Demi-largeur maximale de l'infobulle (20rem), pour la garder dans la fenêtre. */
const DEMI_LARGEUR = 160;
const MARGE_FENETRE = 8;

interface Position {
  gauche: number;
  haut: number;
  enDessous: boolean;
}

/**
 * Infobulle au survol, au focus clavier et au toucher. Positionnée en `fixed` pour
 * échapper aux conteneurs à défilement ; Échap la referme.
 */
const Infobulle: FC<InfobulleProps> = ({ children, contenu }) => {
  const id = useId();
  const declencheurRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const handleOuvrir = (): void => {
    const rect = declencheurRef.current?.getBoundingClientRect();
    if (!rect) return;
    const enDessous = rect.top < HAUTEUR_MIN_AU_DESSUS;
    const centre = rect.left + rect.width / 2;
    const bordDroit = window.innerWidth - DEMI_LARGEUR - MARGE_FENETRE;
    setPosition({
      gauche: Math.max(DEMI_LARGEUR + MARGE_FENETRE, Math.min(centre, bordDroit)),
      haut: enDessous ? rect.bottom : rect.top,
      enDessous,
    });
  };
  const handleFermer = (): void => setPosition(null);
  const handleTouche = (event: KeyboardEvent): void => {
    if (event.key === "Escape") handleFermer();
  };

  return (
    <span
      ref={declencheurRef}
      className="infobulle__declencheur"
      tabIndex={0}
      aria-describedby={id}
      onMouseEnter={handleOuvrir}
      onMouseLeave={handleFermer}
      onFocus={handleOuvrir}
      onBlur={handleFermer}
      onKeyDown={handleTouche}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className="infobulle"
        data-sens={position?.enDessous ? "bas" : "haut"}
        hidden={!position}
        style={position ? { left: position.gauche, top: position.haut } : undefined}
      >
        {contenu}
      </span>
    </span>
  );
};

export default Infobulle;
