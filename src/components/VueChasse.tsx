// src/components/VueChasse.tsx

import { memo, useEffect, useState, type FC, type FormEvent } from "react";
import {
  ESPECE_PAR_NOM_NORMALISE,
  ESPECES,
  ESPECES_PAR_SLUG,
  NOMS_TYPES,
  normaliserRecherche,
} from "../donnees.ts";
import {
  libelleBiome,
  LIBELLES_RARETE,
  meilleureRarete,
  TAG_PARTOUT,
} from "../domaine/apparitions.ts";
import {
  classerBiomesDeChasse,
  chasseVide,
  debutPourTempsRestant,
  DUREE_CHASSE_MS,
  especesPresentesPartout,
  formaterDuree,
  lireDuree,
  NOMBRE_POKEMON_CHASSE,
  tempsRestant,
  type Chasse,
} from "../domaine/chasse.ts";
import { chaineEspeces, resoudreNoms } from "../domaine/pokefinder.ts";
import { LIBELLES_STATUT, type StatutEnregistre, type StatutPokemon } from "../domaine/statut.ts";
import { useApparitions } from "../hooks/useApparitions.ts";
import type { EspecePokemon } from "../types/pokedex.ts";
import { BlocApparition, SansApparition } from "./BlocApparition.tsx";
import ChampACopier from "./ChampACopier.tsx";
import SpritePokemon from "./SpritePokemon.tsx";

interface VueChasseProps {
  chasse: Chasse;
  statuts: Readonly<Record<string, StatutEnregistre>>;
  onChasseChange: (modifier: (chasse: Chasse) => Chasse) => void;
  onStatutChange: (slug: string, statut: StatutPokemon) => void;
}

const ID_LISTE_NOMS = "chasse-noms-pokemon";
const NOMBRE_BIOMES_AFFICHES = 8;

/* Liste de suggestions des noms français : 1025 options, rendue une seule fois. */
const SuggestionsNoms = memo(function SuggestionsNoms() {
  return (
    <datalist id={ID_LISTE_NOMS}>
      {ESPECES.map((espece) => (
        <option key={espece.slug} value={espece.nomFr} />
      ))}
    </datalist>
  );
});

/**
 * Minuteur de chasse. Réglable à la main : le temps affiché en jeu et celui du hub
 * peuvent dériver (lancement décalé, pause).
 */
function Chrono({
  debut,
  onDebutChange,
}: {
  debut: string | null;
  onDebutChange: (debut: string) => void;
}) {
  const [maintenant, setMaintenant] = useState(() => new Date());
  const [saisie, setSaisie] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!debut) return;
    const minuteur = setInterval(() => setMaintenant(new Date()), 1000);
    return () => clearInterval(minuteur);
  }, [debut]);

  const restant = debut ? tempsRestant(debut, maintenant) : DUREE_CHASSE_MS;

  const regler = (restantMs: number): void => {
    const instant = new Date();
    setMaintenant(instant);
    onDebutChange(debutPourTempsRestant(restantMs, instant));
  };

  const handleSaisie = (evenement: FormEvent): void => {
    evenement.preventDefault();
    const duree = lireDuree(saisie ?? "");
    if (duree === null) {
      setErreur("Format attendu : minutes:secondes, 60:00 maximum.");
      return;
    }
    regler(duree);
    setSaisie(null);
    setErreur(null);
  };

  if (saisie !== null) {
    return (
      <form className="chrono-reglage" onSubmit={handleSaisie}>
        <label>
          Temps restant (mm:ss)
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            aria-describedby={erreur ? "chrono-erreur" : undefined}
          />
        </label>
        <button type="submit" className="bouton bouton--plein">
          Valider
        </button>
        <button type="button" className="bouton" onClick={() => setSaisie(null)}>
          Annuler
        </button>
        {erreur && (
          <p id="chrono-erreur" className="message-erreur" role="alert">
            {erreur}
          </p>
        )}
      </form>
    );
  }

  if (!debut) {
    return (
      <div className="chrono-groupe">
        <button
          type="button"
          className="bouton bouton--plein"
          onClick={() => regler(DUREE_CHASSE_MS)}
        >
          Lancer le chrono (1 h)
        </button>
        <button type="button" className="bouton" onClick={() => setSaisie("60:00")}>
          Lancer à…
        </button>
      </div>
    );
  }

  return (
    <div className="chrono-groupe">
      <p className={`chrono${restant === 0 ? " chrono--fini" : ""}`} role="timer" aria-live="off">
        {restant === 0 ? "Temps écoulé" : formaterDuree(restant)}
      </p>
      <button
        type="button"
        className="bouton"
        aria-label="Retirer une minute"
        onClick={() => regler(restant - 60_000)}
      >
        −1 min
      </button>
      <button
        type="button"
        className="bouton"
        aria-label="Ajouter une minute"
        onClick={() => regler(restant + 60_000)}
      >
        +1 min
      </button>
      <button type="button" className="bouton" onClick={() => setSaisie(formaterDuree(restant))}>
        Régler
      </button>
    </div>
  );
}

/**
 * Chasse du serveur : six Pokémon à capturer en une heure, avec les biomes
 * où en croiser le plus à la fois.
 */
const VueChasse: FC<VueChasseProps> = ({ chasse, statuts, onChasseChange, onStatutChange }) => {
  const [saisie, setSaisie] = useState("");
  const [erreurSaisie, setErreurSaisie] = useState<string | null>(null);
  const chargement = useApparitions();

  const especes = chasse.especes
    .map((slug) => ESPECES_PAR_SLUG.get(slug))
    .filter((e): e is EspecePokemon => e !== undefined);
  const restantes = especes.filter((e) => !chasse.capturees.includes(e.slug));
  const placesLibres = NOMBRE_POKEMON_CHASSE - especes.length;

  const handleAjout = (evenement: FormEvent): void => {
    evenement.preventDefault();
    const { especes: trouvees, inconnus } = resoudreNoms(
      saisie,
      ESPECE_PAR_NOM_NORMALISE,
      normaliserRecherche,
    );
    const nouvelles = trouvees.filter((e) => !chasse.especes.includes(e.slug));
    const ajoutees = nouvelles.slice(0, placesLibres);
    if (ajoutees.length > 0) {
      onChasseChange((c) => ({ ...c, especes: [...c.especes, ...ajoutees.map((e) => e.slug)] }));
    }
    const problemes: string[] = [];
    if (inconnus.length > 0) problemes.push(`Introuvable : ${inconnus.join(", ")}`);
    if (nouvelles.length > ajoutees.length) {
      problemes.push(`Chasse limitée à ${NOMBRE_POKEMON_CHASSE} Pokémon`);
    }
    setErreurSaisie(problemes.length > 0 ? `${problemes.join(". ")}.` : null);
    setSaisie(inconnus.join(", "));
  };

  const handleRetirer = (slug: string): void => {
    onChasseChange((c) => ({
      ...c,
      especes: c.especes.filter((s) => s !== slug),
      capturees: c.capturees.filter((s) => s !== slug),
    }));
  };

  /* Capturer pendant la chasse enregistre aussi l'espèce comme capturée au Pokédex. */
  const handleCapture = (slug: string, estCapturee: boolean): void => {
    onChasseChange((c) => ({
      ...c,
      capturees: estCapturee ? [...c.capturees, slug] : c.capturees.filter((s) => s !== slug),
    }));
    if (estCapturee) onStatutChange(slug, "capture");
  };

  const handleNouvelleChasse = (): void => {
    if (especes.length === 0 || window.confirm("Effacer la chasse en cours ?")) {
      onChasseChange(() => chasseVide());
      setErreurSaisie(null);
    }
  };

  const apparitions = chargement.etat === "pret" ? chargement.donnees.parEspece : {};
  const slugsRestants = restantes.map((e) => e.slug);
  const biomes = classerBiomesDeChasse(slugsRestants, apparitions).slice(0, NOMBRE_BIOMES_AFFICHES);
  const partout = especesPresentesPartout(slugsRestants, apparitions);

  return (
    <section aria-labelledby="titre-chasse" className="vue">
      <div className="chasse__entete">
        <div className="vue__entete">
          <h2 id="titre-chasse">Chasse</h2>
          <p className="texte-discret">
            Six Pokémon à capturer en une heure. La chasse reste enregistrée jusqu'à la suivante.
          </p>
        </div>
        <div className="chasse__actions">
          <Chrono
            debut={chasse.debut}
            onDebutChange={(nouveauDebut) => onChasseChange((c) => ({ ...c, debut: nouveauDebut }))}
          />
          <button type="button" className="bouton" onClick={handleNouvelleChasse}>
            Nouvelle chasse
          </button>
        </div>
      </div>

      {placesLibres > 0 && (
        <form className="chasse__saisie" onSubmit={handleAjout}>
          <label className="filtres__recherche">
            Ajouter des Pokémon (nom français ou anglais, plusieurs séparés par des virgules)
            <input
              type="search"
              list={ID_LISTE_NOMS}
              placeholder={`Encore ${placesLibres} à ajouter`}
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
            />
          </label>
          <button type="submit" className="bouton bouton--plein" disabled={!saisie.trim()}>
            Ajouter
          </button>
          <SuggestionsNoms />
        </form>
      )}
      {erreurSaisie && (
        <p className="message-erreur" role="alert">
          {erreurSaisie}
        </p>
      )}

      {especes.length === 0 ? (
        <p className="vide">Ajoute les six Pokémon de ta chasse pour voir où les trouver.</p>
      ) : (
        <ul className="chasse__grille">
          {especes.map((espece) => {
            const estCapturee = chasse.capturees.includes(espece.slug);
            const statut = statuts[espece.slug] ?? "non-vu";
            return (
              <li
                key={espece.slug}
                className={`cible${estCapturee ? " cible--capturee" : ""}`}
                data-type={espece.types[0]}
              >
                <button
                  type="button"
                  className="cible__retirer"
                  aria-label={`Retirer ${espece.nomFr} de la chasse`}
                  onClick={() => handleRetirer(espece.slug)}
                >
                  Retirer
                </button>
                <SpritePokemon espece={espece} taille={96} className="cible__sprite" />
                <p className="cible__nom">{espece.nomFr}</p>
                <p className="texte-discret">{espece.nomEn}</p>
                <span className="carte__types">
                  {espece.types.map((type) => (
                    <span key={type} className="type" data-type={type}>
                      {NOMS_TYPES[type] ?? type}
                    </span>
                  ))}
                </span>
                <span className={`etiquette etiquette--${statut}`}>
                  Pokédex : {LIBELLES_STATUT[statut]}
                </span>
                <label className="case-a-cocher cible__capture">
                  <input
                    type="checkbox"
                    checked={estCapturee}
                    onChange={(e) => handleCapture(espece.slug, e.target.checked)}
                  />
                  Capturé
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {restantes.length > 0 && (
        <div className="panneau">
          <h3>PokéFinder</h3>
          <ChampACopier libelle="Espèce (Pokémon restants)" valeur={chaineEspeces(restantes)} />
        </div>
      )}

      {restantes.length > 0 && chargement.etat === "pret" && (
        <div className="panneau">
          <h3>Où chasser</h3>
          <p className="texte-discret">
            Biomes où croiser le plus de Pokémon restants, les plus courants d'abord.
          </p>
          {biomes.length === 0 ? (
            <p className="texte-discret">Aucun biome commun connu pour ces Pokémon.</p>
          ) : (
            <ol className="biomes-chasse">
              {biomes.map(({ biome, presences }) => (
                <li key={biome} className="biome-chasse">
                  <p className="biome-chasse__nom">
                    {libelleBiome(biome)}
                    <span className="biome-chasse__compte">
                      {presences.length} / {restantes.length}
                    </span>
                  </p>
                  <ul className="biome-chasse__presences">
                    {presences.map(({ slug, rarete }) => {
                      const espece = ESPECES_PAR_SLUG.get(slug);
                      if (!espece) return null;
                      return (
                        <li key={slug} className="presence">
                          <SpritePokemon espece={espece} taille={40} />
                          <span>{espece.nomFr}</span>
                          <span className={`rarete rarete--${rarete}`}>
                            {LIBELLES_RARETE[rarete]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}
          {partout.length > 0 && (
            <p className="texte-discret">
              Visibles dans tous les biomes de Surface :{" "}
              {partout
                .map((slug) => {
                  const nom = ESPECES_PAR_SLUG.get(slug)?.nomFr ?? slug;
                  const rarete = meilleureRarete(
                    (apparitions[slug] ?? []).filter((a) => a.biomes.includes(TAG_PARTOUT)),
                  );
                  return rarete ? `${nom} (${LIBELLES_RARETE[rarete].toLowerCase()})` : nom;
                })
                .join(", ")}
              .
            </p>
          )}
        </div>
      )}

      {restantes.length > 0 && chargement.etat === "pret" && (
        <div className="chasse__details">
          {restantes.map((espece) => {
            const liste = apparitions[espece.slug] ?? [];
            return (
              <details key={espece.slug} className="panneau">
                <summary className="chasse__resume">
                  <SpritePokemon espece={espece} taille={40} />
                  Détail des apparitions de {espece.nomFr}
                </summary>
                {liste.length > 0 ? (
                  <ul className="fiche-apparition__liste">
                    {liste.map((apparition) => (
                      <BlocApparition key={JSON.stringify(apparition)} apparition={apparition} />
                    ))}
                  </ul>
                ) : (
                  <SansApparition espece={espece} />
                )}
              </details>
            );
          })}
        </div>
      )}
      {chargement.etat === "erreur" && (
        <p className="message-erreur" role="alert">
          {chargement.message}
        </p>
      )}
    </section>
  );
};

export default VueChasse;
