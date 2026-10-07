// src/components/PiedDePage.tsx

import { type FC } from "react";

/**
 * Pied de page : auteur du hub et mention de non-affiliation au serveur et aux ayants droit.
 */
const PiedDePage: FC = () => {
  return (
    <footer className="pied-de-page">
      <p className="pied-de-page__auteur">
        Créé par{" "}
        <a href="https://a-nerow.fr" target="_blank" rel="noopener noreferrer">
          Nerow
        </a>
      </p>
      <p className="pied-de-page__mention">
        Outil de fan non officiel, sans lien avec le serveur PokeIsland, Cobblemon, Mojang,
        Nintendo, Game Freak, Creatures ou The Pokémon Company. Pokémon et les noms associés sont
        des marques de leurs détenteurs respectifs. Données issues de PokeAPI et de Cobblemon.
      </p>
    </footer>
  );
};

export default PiedDePage;
