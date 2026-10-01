// src/components/VuePokeFinder.tsx

import { useMemo, useState, type FC } from "react";
import { ESPECE_PAR_NOM_NORMALISE, ESPECES, GENERATIONS, normaliserRecherche } from "../donnees.ts";
import {
  chaineEspeces,
  decouperEnLots,
  estNomAVerifier,
  resoudreNoms,
} from "../domaine/pokefinder.ts";
import type { StatutEnregistre } from "../domaine/statut.ts";
import type { EspecePokemon } from "../types/pokedex.ts";
import ChampACopier from "./ChampACopier.tsx";

interface VuePokeFinderProps {
  statuts: Readonly<Record<string, StatutEnregistre>>;
}

type CritereManquant = "non-capture" | "non-vu";

const TAILLE_LOT_PAR_DEFAUT = 10;

function AvertissementNoms({ especes }: { especes: readonly EspecePokemon[] }) {
  const aVerifier = especes.filter(estNomAVerifier);
  if (aVerifier.length === 0) {
    return null;
  }
  return (
    <p className="texte-discret">
      Écriture Cobblemon à confirmer pour : {aVerifier.map((e) => e.nomEn).join(", ")}.
    </p>
  );
}

/**
 * Génère le contenu du champ "Espèce" du PokéFinder : Pokémon du jour saisis
 * en français, ou Pokémon manquants du Pokédex.
 */
const VuePokeFinder: FC<VuePokeFinderProps> = ({ statuts }) => {
  const [saisieDuJour, setSaisieDuJour] = useState("");
  const [critere, setCritere] = useState<CritereManquant>("non-capture");
  const [generation, setGeneration] = useState<number | null>(null);
  const [tailleLot, setTailleLot] = useState(TAILLE_LOT_PAR_DEFAUT);

  const resolution = resoudreNoms(saisieDuJour, ESPECE_PAR_NOM_NORMALISE, normaliserRecherche);

  const manquants = useMemo(
    () =>
      ESPECES.filter((espece) => {
        if (generation !== null && espece.generation !== generation) {
          return false;
        }
        const statut = statuts[espece.slug];
        return critere === "non-vu" ? statut === undefined : statut !== "capture";
      }),
    [statuts, critere, generation],
  );
  const lots = decouperEnLots(manquants, tailleLot);

  return (
    <section aria-labelledby="titre-pokefinder" className="vue">
      <div className="vue__entete">
        <h2 id="titre-pokefinder">PokéFinder</h2>
        <p className="texte-discret">
          Contenu du champ Espèce : noms anglais séparés par une virgule. Les champs Aspect et
          Étiquette se remplissent à la main en jeu.
        </p>
      </div>

      <div className="panneau">
        <h3>Pokémon du jour</h3>
        <label>
          Noms en français (ou en anglais), séparés par des virgules ou des retours à la ligne
          <textarea
            rows={3}
            placeholder="Pashmilla, Mushana, Fulgudog"
            value={saisieDuJour}
            onChange={(e) => setSaisieDuJour(e.target.value)}
          />
        </label>
        {resolution.inconnus.length > 0 && (
          <p className="message-erreur" role="alert">
            Introuvable : {resolution.inconnus.join(", ")}
          </p>
        )}
        <ChampACopier libelle="Espèce" valeur={chaineEspeces(resolution.especes)} />
        <AvertissementNoms especes={resolution.especes} />
      </div>

      <div className="panneau">
        <h3>Pokémon manquants</h3>
        <div className="filtres">
          <label>
            Manquant si
            <select value={critere} onChange={(e) => setCritere(e.target.value as CritereManquant)}>
              <option value="non-capture">non capturé</option>
              <option value="non-vu">jamais vu</option>
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
          <label>
            Pokémon par chaîne
            <input
              type="number"
              min={1}
              max={1025}
              value={tailleLot}
              onChange={(e) => {
                const taille = Number(e.target.value);
                if (Number.isInteger(taille) && taille > 0) setTailleLot(taille);
              }}
            />
          </label>
          <p className="filtres__compte">{manquants.length} manquants</p>
        </div>
        <p className="texte-discret">
          Longueur maximale du champ en jeu inconnue : réduire le nombre par chaîne si le texte est
          coupé.
        </p>
        <AvertissementNoms especes={manquants} />
        <ol className="liste-lots">
          {lots.map((lot) => (
            <li key={lot[0]?.slug}>
              <ChampACopier
                libelle={`Espèce (${lot[0]?.nomFr} à ${lot[lot.length - 1]?.nomFr})`}
                valeur={chaineEspeces(lot)}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default VuePokeFinder;
