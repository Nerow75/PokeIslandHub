// src/components/VueEvolutions.tsx

import { useMemo, useState, type FC } from "react";
import {
  ESPECES,
  ESPECES_PAR_SLUG,
  INDEX_RECHERCHE,
  normaliserRecherche,
  TRADUCTIONS,
} from "../donnees.ts";
import { decrireCondition } from "../domaine/conditionsEvolution.ts";
import { listerEvolutions, type PorteeEvolutions } from "../domaine/evolutionsAFaire.ts";
import SpritePokemon from "./SpritePokemon.tsx";
import { LIBELLES_STATUT, type StatutEnregistre, type StatutPokemon } from "../domaine/statut.ts";
import type { EspecePokemon } from "../types/pokedex.ts";

interface VueEvolutionsProps {
  statuts: Readonly<Record<string, StatutEnregistre>>;
  onStatutChange: (slug: string, statut: StatutPokemon) => void;
}

/** Dernière évolution marquée, pour pouvoir l'annuler. */
interface DerniereEvolution {
  vers: EspecePokemon;
  statutPrecedent: StatutPokemon;
}

/**
 * Évolutions à réaliser pour découvrir de nouvelles espèces, triées par niveau requis.
 */
const VueEvolutions: FC<VueEvolutionsProps> = ({ statuts, onStatutChange }) => {
  const [portee, setPortee] = useState<PorteeEvolutions>("mes-captures");
  const [recherche, setRecherche] = useState("");
  const [derniere, setDerniere] = useState<DerniereEvolution | null>(null);

  /* Faire évoluer un Pokémon enregistre l'espèce obtenue comme capturée. */
  const handleEvolutionFaite = (vers: EspecePokemon, statutPrecedent: StatutPokemon): void => {
    onStatutChange(vers.slug, "capture");
    setDerniere({ vers, statutPrecedent });
  };

  const handleAnnuler = (): void => {
    if (derniere) {
      onStatutChange(derniere.vers.slug, derniere.statutPrecedent);
      setDerniere(null);
    }
  };

  const evolutions = useMemo(
    () => listerEvolutions(ESPECES, ESPECES_PAR_SLUG, (slug) => statuts[slug] ?? "non-vu", portee),
    [statuts, portee],
  );

  const termes = normaliserRecherche(recherche).split(" ").filter(Boolean);
  const evolutionsFiltrees = evolutions.filter((evolution) => {
    const texte = `${INDEX_RECHERCHE.get(evolution.depuis.slug) ?? ""} ${INDEX_RECHERCHE.get(evolution.vers.slug) ?? ""}`;
    return termes.every((terme) => texte.includes(terme));
  });

  return (
    <section aria-labelledby="titre-evolutions" className="vue">
      <div className="vue__entete">
        <h2 id="titre-evolutions">Évolutions</h2>
        <p className="texte-discret">
          {portee === "mes-captures"
            ? "Tes Pokémon capturés qui peuvent évoluer vers une espèce pas encore capturée."
            : "Toutes les évolutions du Pokédex."}{" "}
          Conditions des jeux officiels : Cobblemon peut différer.
        </p>
      </div>

      <div className="filtres">
        <label className="filtres__recherche">
          <span className="visuellement-masque">Rechercher</span>
          <input
            type="search"
            placeholder="Nom FR, nom EN ou numéro"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </label>
        <label>
          Afficher
          <select value={portee} onChange={(e) => setPortee(e.target.value as PorteeEvolutions)}>
            <option value="mes-captures">À faire avec mes captures</option>
            <option value="tout">Tout le Pokédex</option>
          </select>
        </label>
        <p className="filtres__compte" aria-live="polite">
          {evolutionsFiltrees.length} évolution{evolutionsFiltrees.length > 1 ? "s" : ""}
        </p>
      </div>

      {derniere && (
        <div className="confirmation" role="status">
          <p>
            {derniere.vers.nomFr} marqué comme capturé (avant :{" "}
            {LIBELLES_STATUT[derniere.statutPrecedent].toLowerCase()}).
          </p>
          <button type="button" className="bouton" onClick={handleAnnuler}>
            Annuler
          </button>
        </div>
      )}

      {evolutionsFiltrees.length === 0 ? (
        <p className="vide">
          {portee === "mes-captures"
            ? "Aucune évolution à faire : marque des Pokémon comme capturés dans le Pokédex."
            : "Aucun résultat."}
        </p>
      ) : (
        <ul className="liste-evolutions">
          {evolutionsFiltrees.map(({ depuis, vers, conditions, statutCible, niveau }) => (
            <li key={`${depuis.slug}-${vers.slug}`} className="evolution">
              <span
                className="evolution__niveau"
                aria-label={niveau ? `Niveau ${niveau}` : "Sans niveau"}
              >
                {niveau !== null ? `N.${niveau}` : "–"}
              </span>
              <span className="evolution__pokemon">
                <SpritePokemon espece={depuis} taille={56} />
                {depuis.nomFr}
              </span>
              <span className="evolution__fleche" aria-hidden="true">
                →
              </span>
              <span className="evolution__pokemon">
                <SpritePokemon espece={vers} taille={56} />
                <span>
                  {vers.nomFr}
                  <span className={`etiquette etiquette--${statutCible}`}>
                    {LIBELLES_STATUT[statutCible]}
                  </span>
                </span>
              </span>
              {statutCible === "capture" ? (
                <span className="evolution__action texte-discret">Déjà capturé</span>
              ) : (
                <button
                  type="button"
                  className="bouton bouton--plein evolution__action"
                  aria-label={`Évolution faite : marquer ${vers.nomFr} comme capturé`}
                  onClick={() => handleEvolutionFaite(vers, statutCible)}
                >
                  Évolution faite
                </button>
              )}
              <ul className="evolution__conditions">
                {conditions.map((condition, index) => (
                  <li key={JSON.stringify(condition)}>
                    {index > 0 && <span className="texte-discret">ou </span>}
                    {decrireCondition(condition, TRADUCTIONS)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default VueEvolutions;
