// src/components/VueOuTrouver.tsx

import { useMemo, useState, type FC } from "react";
import { ESPECES, INDEX_RECHERCHE, normaliserRecherche } from "../donnees.ts";
import {
  apparaitDansBiome,
  libelleBiome,
  meilleureRarete,
  TAG_PARTOUT,
} from "../domaine/apparitions.ts";
import { LIBELLES_STATUT, type StatutEnregistre } from "../domaine/statut.ts";
import { useApparitions } from "../hooks/useApparitions.ts";
import type { Apparition, ApparitionsGenerees, Rarete } from "../types/apparitions.ts";
import type { EspecePokemon } from "../types/pokedex.ts";
import { BlocApparition, SansApparition } from "./BlocApparition.tsx";
import SpritePokemon from "./SpritePokemon.tsx";

interface VueOuTrouverProps {
  statuts: Readonly<Record<string, StatutEnregistre>>;
}

type FiltreStatut = "non-capture" | "non-vu" | "tous";
type FiltreMoment = "tous" | "day" | "night";

const TAILLE_PAGE = 40;
const ORDRE_RARETE: Record<Rarete, number> = { common: 0, uncommon: 1, rare: 2, "ultra-rare": 3 };

function correspondAuMoment(apparition: Apparition, moment: FiltreMoment): boolean {
  return moment === "tous" || apparition.moment === undefined || apparition.moment === moment;
}

/**
 * Où trouver les Pokémon : apparitions sauvages Cobblemon par biome, moment et rareté.
 */
const VueOuTrouver: FC<VueOuTrouverProps> = ({ statuts }) => {
  const chargement = useApparitions();

  return (
    <section aria-labelledby="titre-ou-trouver" className="vue">
      <div className="vue__entete">
        <h2 id="titre-ou-trouver">Où trouver</h2>
        <p className="texte-discret">
          Apparitions sauvages de Cobblemon
          {chargement.etat === "pret" ? ` ${chargement.donnees.versionCobblemon}` : ""}. Le serveur
          peut avoir ajusté certains spawns.
        </p>
      </div>
      {chargement.etat === "chargement" && (
        <div className="squelette" aria-busy="true" aria-label="Chargement des apparitions">
          <div className="squelette__ligne" />
          <div className="squelette__ligne" />
          <div className="squelette__ligne" />
        </div>
      )}
      {chargement.etat === "erreur" && (
        <p className="message-erreur" role="alert">
          {chargement.message}
        </p>
      )}
      {chargement.etat === "pret" && (
        <ListeOuTrouver statuts={statuts} donnees={chargement.donnees} />
      )}
    </section>
  );
};

function ListeOuTrouver({
  statuts,
  donnees,
}: {
  statuts: Readonly<Record<string, StatutEnregistre>>;
  donnees: ApparitionsGenerees;
}) {
  const [recherche, setRecherche] = useState("");
  const [biome, setBiome] = useState("");
  const [inclurePartout, setInclurePartout] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>("non-capture");
  const [moment, setMoment] = useState<FiltreMoment>("tous");
  const [nombreAffiches, setNombreAffiches] = useState(TAILLE_PAGE);

  const biomesDisponibles = useMemo(() => {
    const tags = new Set<string>();
    for (const apparitions of Object.values(donnees.parEspece)) {
      for (const apparition of apparitions) apparition.biomes.forEach((b) => tags.add(b));
    }
    tags.delete(TAG_PARTOUT);
    return [...tags].sort((a, b) => libelleBiome(a).localeCompare(libelleBiome(b), "fr"));
  }, [donnees]);

  const resultats = useMemo(() => {
    const termes = normaliserRecherche(recherche).split(" ").filter(Boolean);
    const lignes: { espece: EspecePokemon; apparitions: Apparition[] }[] = [];
    for (const espece of ESPECES) {
      const statut = statuts[espece.slug];
      if (filtreStatut === "non-capture" && statut === "capture") continue;
      if (filtreStatut === "non-vu" && statut !== undefined) continue;
      const texte = INDEX_RECHERCHE.get(espece.slug) ?? "";
      if (!termes.every((terme) => texte.includes(terme))) continue;

      const toutes = donnees.parEspece[espece.slug] ?? [];
      const retenues = toutes.filter(
        (a) =>
          correspondAuMoment(a, moment) && (!biome || apparaitDansBiome(a, biome, inclurePartout)),
      );
      /* Avec un biome ou un moment choisi, seules les espèces qui y apparaissent restent. */
      if ((biome || moment !== "tous") && retenues.length === 0) continue;
      lignes.push({ espece, apparitions: retenues });
    }
    if (biome) {
      lignes.sort(
        (a, b) =>
          ORDRE_RARETE[meilleureRarete(a.apparitions) ?? "ultra-rare"] -
            ORDRE_RARETE[meilleureRarete(b.apparitions) ?? "ultra-rare"] ||
          a.espece.id - b.espece.id,
      );
    }
    return lignes;
  }, [donnees, statuts, recherche, biome, inclurePartout, filtreStatut, moment]);

  const reinitialiserPagination = () => setNombreAffiches(TAILLE_PAGE);

  return (
    <>
      <div className="filtres">
        <label className="filtres__recherche">
          <span className="visuellement-masque">Rechercher</span>
          <input
            type="search"
            placeholder="Nom FR, nom EN ou numéro"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              reinitialiserPagination();
            }}
          />
        </label>
        <label>
          Je suis dans le biome
          <select
            value={biome}
            onChange={(e) => {
              setBiome(e.target.value);
              reinitialiserPagination();
            }}
          >
            <option value="">Tous les biomes</option>
            {biomesDisponibles.map((tag) => (
              <option key={tag} value={tag}>
                {libelleBiome(tag)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Moment
          <select
            value={moment}
            onChange={(e) => {
              setMoment(e.target.value as FiltreMoment);
              reinitialiserPagination();
            }}
          >
            <option value="tous">Jour et nuit</option>
            <option value="day">Jour</option>
            <option value="night">Nuit</option>
          </select>
        </label>
        <label>
          Afficher
          <select
            value={filtreStatut}
            onChange={(e) => {
              setFiltreStatut(e.target.value as FiltreStatut);
              reinitialiserPagination();
            }}
          >
            <option value="non-capture">Non capturés</option>
            <option value="non-vu">Jamais vus</option>
            <option value="tous">Tous</option>
          </select>
        </label>
        {biome && (
          <label className="case-a-cocher">
            <input
              type="checkbox"
              checked={inclurePartout}
              onChange={(e) => setInclurePartout(e.target.checked)}
            />
            Inclure ceux présents partout
          </label>
        )}
        <p className="filtres__compte" aria-live="polite">
          {resultats.length} Pokémon
        </p>
      </div>

      {resultats.length === 0 ? (
        <p className="vide">Aucun Pokémon ne correspond à ces critères.</p>
      ) : (
        <ul className="liste-ou-trouver">
          {resultats.slice(0, nombreAffiches).map(({ espece, apparitions }) => {
            const statut = statuts[espece.slug] ?? "non-vu";
            return (
              <li key={espece.slug} className="fiche-apparition" data-type={espece.types[0]}>
                <div className="fiche-apparition__identite">
                  <SpritePokemon espece={espece} taille={72} className="fiche-apparition__sprite" />
                  <div>
                    <p className="fiche-apparition__nom">{espece.nomFr}</p>
                    <p className="texte-discret">
                      #{String(espece.id).padStart(4, "0")} {espece.nomEn}
                    </p>
                    <span className={`etiquette etiquette--${statut}`}>
                      {LIBELLES_STATUT[statut]}
                    </span>
                  </div>
                </div>
                {apparitions.length > 0 ? (
                  <ul className="fiche-apparition__liste">
                    {apparitions.map((apparition) => (
                      <BlocApparition key={JSON.stringify(apparition)} apparition={apparition} />
                    ))}
                  </ul>
                ) : (
                  <SansApparition espece={espece} />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {resultats.length > nombreAffiches && (
        <button
          type="button"
          className="bouton bouton--plein plus"
          onClick={() => setNombreAffiches((n) => n + TAILLE_PAGE)}
        >
          Afficher {Math.min(TAILLE_PAGE, resultats.length - nombreAffiches)} de plus
        </button>
      )}
    </>
  );
}

export default VueOuTrouver;
