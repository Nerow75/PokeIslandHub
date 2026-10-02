// src/components/VueEv.tsx

import { useMemo, useState, type FC } from "react";
import { ESPECES, GENERATIONS, INDEX_RECHERCHE, normaliserRecherche } from "../donnees.ts";
import SpritePokemon from "./SpritePokemon.tsx";
import { LIBELLES_STATUT, type StatutEnregistre } from "../domaine/statut.ts";
import type { StatEv } from "../types/pokedex.ts";

interface VueEvProps {
  statuts: Readonly<Record<string, StatutEnregistre>>;
  /** Stat choisie à l'ouverture (lien "Où farmer" d'un build). */
  statInitiale?: StatEv | null;
}

const STATS: readonly { cle: StatEv; libelle: string; court: string }[] = [
  { cle: "pv", libelle: "PV", court: "PV" },
  { cle: "attaque", libelle: "Attaque", court: "Atq" },
  { cle: "defense", libelle: "Défense", court: "Déf" },
  { cle: "attaqueSpeciale", libelle: "Attaque Spéciale", court: "Atq Spé" },
  { cle: "defenseSpeciale", libelle: "Défense Spéciale", court: "Déf Spé" },
  { cle: "vitesse", libelle: "Vitesse", court: "Vit" },
] as const;

/**
 * Table des EV rapportés par chaque espèce vaincue, filtrable par statistique.
 */
const VueEv: FC<VueEvProps> = ({ statuts, statInitiale = null }) => {
  const [stat, setStat] = useState<StatEv | null>(statInitiale);
  const [generation, setGeneration] = useState<number | null>(null);
  const [recherche, setRecherche] = useState("");

  const lignes = useMemo(() => {
    const termes = normaliserRecherche(recherche).split(" ").filter(Boolean);
    const filtrees = ESPECES.filter((espece) => {
      if (stat !== null && espece.evRapportes[stat] === 0) return false;
      if (generation !== null && espece.generation !== generation) return false;
      const texte = INDEX_RECHERCHE.get(espece.slug) ?? "";
      return termes.every((terme) => texte.includes(terme));
    });
    /* Avec une stat choisie : les plus rentables d'abord, puis par numéro. */
    return stat === null
      ? filtrees
      : [...filtrees].sort((a, b) => b.evRapportes[stat] - a.evRapportes[stat] || a.id - b.id);
  }, [stat, generation, recherche]);

  return (
    <section aria-labelledby="titre-ev" className="vue">
      <div className="vue__entete">
        <h2 id="titre-ev">EV rapportés</h2>
        <p className="texte-discret">
          EV gagnés par ton Pokémon quand il met K.O. l'espèce sauvage. Choisir une stat pour voir
          quoi combattre.
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
          Stat à entraîner
          <select
            value={stat ?? ""}
            onChange={(e) => setStat(e.target.value === "" ? null : (e.target.value as StatEv))}
          >
            <option value="">Toutes</option>
            {STATS.map(({ cle, libelle }) => (
              <option key={cle} value={cle}>
                {libelle}
              </option>
            ))}
          </select>
        </label>
        <label>
          Génération
          <select
            value={generation ?? ""}
            onChange={(e) => setGeneration(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">Toutes</option>
            {GENERATIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <p className="filtres__compte" aria-live="polite">
          {lignes.length} Pokémon
        </p>
      </div>

      <div className="tableau-defilant">
        <table className="tableau-ev">
          <thead>
            <tr>
              <th scope="col">Pokémon</th>
              {STATS.map(({ cle, libelle, court }) => (
                <th key={cle} scope="col" className={cle === stat ? "est-selectionne" : undefined}>
                  <abbr title={libelle}>{court}</abbr>
                </th>
              ))}
              <th scope="col">Statut</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((espece) => {
              const statut = statuts[espece.slug] ?? "non-vu";
              return (
                <tr key={espece.slug}>
                  <th scope="row">
                    <span className="tableau-ev__pokemon">
                      <SpritePokemon espece={espece} taille={40} />
                      <span>
                        {espece.nomFr}
                        <span className="texte-discret"> #{espece.id}</span>
                      </span>
                    </span>
                  </th>
                  {STATS.map(({ cle }) => {
                    const valeur = espece.evRapportes[cle];
                    return (
                      <td
                        key={cle}
                        className={`${valeur > 0 ? "ev-positif" : "ev-nul"}${cle === stat ? " est-selectionne" : ""}`}
                      >
                        {valeur > 0 ? `+${valeur}` : "·"}
                      </td>
                    );
                  })}
                  <td>
                    <span className={`etiquette etiquette--${statut}`}>
                      {LIBELLES_STATUT[statut]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default VueEv;
