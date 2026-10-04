// src/components/RechercheRapide.tsx

import { useEffect, useRef, useState, type FC, type KeyboardEvent } from "react";
import { rechercherEspeces } from "../donnees.ts";
import SpritePokemon from "./SpritePokemon.tsx";

const NOMBRE_RESULTATS = 8;
const ID_LISTE = "recherche-rapide-resultats";

/** Vrai si la frappe vise un champ de saisie : "/" y reste un caractère normal. */
function estDansUnChamp(cible: EventTarget | null): boolean {
  return (
    cible instanceof HTMLElement &&
    (cible.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(cible.tagName))
  );
}

/**
 * Recherche rapide depuis n'importe quel onglet : Ctrl+K (ou "/") ouvre une fenêtre,
 * on tape un nom FR ou EN ou un numéro, Entrée ouvre la fiche du Pokémon.
 */
const RechercheRapide: FC = () => {
  const fenetre = useRef<HTMLDialogElement>(null);
  const [saisie, setSaisie] = useState("");
  const [indexActif, setIndexActif] = useState(0);
  const resultats = rechercherEspeces(saisie, NOMBRE_RESULTATS);

  const ouvrir = (): void => {
    setSaisie("");
    setIndexActif(0);
    fenetre.current?.showModal();
  };

  useEffect(() => {
    const surRaccourci = (evenement: globalThis.KeyboardEvent): void => {
      const raccourci =
        ((evenement.ctrlKey || evenement.metaKey) && evenement.key.toLowerCase() === "k") ||
        (evenement.key === "/" && !estDansUnChamp(evenement.target));
      if (!raccourci || fenetre.current?.open) return;
      evenement.preventDefault();
      setSaisie("");
      setIndexActif(0);
      fenetre.current?.showModal();
    };
    window.addEventListener("keydown", surRaccourci);
    return () => window.removeEventListener("keydown", surRaccourci);
  }, []);

  const ouvrirFiche = (slug: string): void => {
    fenetre.current?.close();
    window.location.hash = `fiche/${slug}`;
  };

  const handleClavier = (evenement: KeyboardEvent<HTMLInputElement>): void => {
    if (evenement.key === "ArrowDown" || evenement.key === "ArrowUp") {
      evenement.preventDefault();
      const pas = evenement.key === "ArrowDown" ? 1 : -1;
      setIndexActif((i) =>
        resultats.length === 0 ? 0 : (i + pas + resultats.length) % resultats.length,
      );
    } else if (evenement.key === "Enter") {
      evenement.preventDefault();
      const choisi = resultats[indexActif] ?? resultats[0];
      if (choisi) ouvrirFiche(choisi.slug);
    }
  };

  return (
    <>
      <button type="button" className="recherche-rapide__bouton" onClick={ouvrir}>
        <span className="recherche-rapide__invite">Rechercher un Pokémon…</span>
        <kbd>Ctrl K</kbd>
      </button>
      <dialog
        ref={fenetre}
        className="recherche-rapide"
        aria-label="Recherche rapide"
        onClick={(e) => {
          /* Clic sur le fond (hors du contenu) : fermeture. */
          if (e.target === fenetre.current) fenetre.current.close();
        }}
      >
        <div className="recherche-rapide__contenu">
          <input
            type="search"
            className="recherche-rapide__champ"
            placeholder="Nom FR, nom EN ou numéro, puis Entrée"
            aria-label="Pokémon à ouvrir"
            role="combobox"
            aria-expanded={resultats.length > 0}
            aria-controls={ID_LISTE}
            aria-activedescendant={
              resultats[indexActif] ? `recherche-rapide-${resultats[indexActif].slug}` : undefined
            }
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value);
              setIndexActif(0);
            }}
            onKeyDown={handleClavier}
            autoFocus
          />
          {saisie.trim() !== "" && resultats.length === 0 && (
            <p className="texte-discret">Aucun Pokémon trouvé.</p>
          )}
          <ul id={ID_LISTE} role="listbox" className="recherche-rapide__liste">
            {resultats.map((espece, index) => (
              <li
                key={espece.slug}
                id={`recherche-rapide-${espece.slug}`}
                role="option"
                aria-selected={index === indexActif}
                className="recherche-rapide__resultat"
                onMouseEnter={() => setIndexActif(index)}
                onClick={() => ouvrirFiche(espece.slug)}
              >
                <SpritePokemon espece={espece} taille={40} />
                <span className="recherche-rapide__nom">{espece.nomFr}</span>
                <span className="texte-discret">
                  {espece.nomEn} #{espece.id}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
};

export default RechercheRapide;
