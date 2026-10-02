// src/components/BuildPokemon.tsx

import { useState, type FC } from "react";
import {
  conseilsIv,
  EV_MAX_PAR_STAT,
  LIBELLES_STAT,
  libelleFormat,
  STAT_EV,
  STATS_COMBAT,
  texteShowdown,
  traduire,
} from "../domaine/strategie.ts";
import type {
  PartUsage,
  SetRecommande,
  StrategieEspece,
  StrategieGeneree,
} from "../types/strategie.ts";

interface BuildPokemonProps {
  nomEn: string;
  strategie: StrategieEspece;
  donnees: StrategieGeneree;
}

const EV_RELIQUAT = 4;

function formaterPourcentage(valeur: number): string {
  return `${valeur.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

const BoutonCopierShowdown: FC<{ texte: string }> = ({ texte }) => {
  const [estCopie, setEstCopie] = useState(false);
  const handleCopier = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(texte);
      setEstCopie(true);
      setTimeout(() => setEstCopie(false), 1500);
    } catch {
      setEstCopie(false);
    }
  };
  return (
    <button type="button" className="bouton" onClick={() => void handleCopier()}>
      {estCopie ? "Copié" : "Copier pour Showdown"}
    </button>
  );
};

const SetDetaille: FC<{ set: SetRecommande; nomEn: string; donnees: StrategieGeneree }> = ({
  set,
  nomEn,
  donnees,
}) => {
  const { traductions, natures } = donnees;
  const ivs = conseilsIv(set.ivs);
  /* Les 4 EV de reliquat (510 - 2 x 252 - 2) ne valent pas une session de farm. */
  const statsAEntrainer = STATS_COMBAT.filter((stat) => (set.evs[stat] ?? 0) > EV_RELIQUAT);
  const liste = (noms: readonly string[], table: Readonly<Record<string, string>>): string =>
    noms.map((nom) => traduire(table, nom)).join(" ou ");

  return (
    <div className="build__set">
      <dl className="build__fiche">
        <div>
          <dt>Capacités</dt>
          <dd>
            <ol className="build__capacites">
              {set.capacites.map((choix) => (
                <li key={choix.join("|")}>{liste(choix, traductions.capacites)}</li>
              ))}
            </ol>
          </dd>
        </div>
        {set.talents.length > 0 && (
          <div>
            <dt>Talent</dt>
            <dd>{liste(set.talents, traductions.talents)}</dd>
          </div>
        )}
        {set.objets.length > 0 && (
          <div>
            <dt>Objet</dt>
            <dd>{liste(set.objets, traductions.objets)}</dd>
          </div>
        )}
        {set.natures.length > 0 && (
          <div>
            <dt>Nature</dt>
            <dd>
              {set.natures.map((nom, index) => {
                const nature = natures[nom];
                return (
                  <span key={nom}>
                    {index > 0 && " ou "}
                    {nature?.nomFr ?? nom}
                    {nature?.hausse && nature.baisse && (
                      <span className="texte-discret">
                        {" "}
                        (+{LIBELLES_STAT[nature.hausse]}, -{LIBELLES_STAT[nature.baisse]})
                      </span>
                    )}
                  </span>
                );
              })}
            </dd>
          </div>
        )}
        {set.teras.length > 0 && (
          <div>
            <dt>Téra</dt>
            <dd>{liste(set.teras, traductions.types)}</dd>
          </div>
        )}
        <div>
          <dt>IV</dt>
          <dd>
            {ivs.length === 0 ? (
              "31 partout"
            ) : (
              <>
                31 partout, sauf :
                <ul className="build__ivs">
                  {ivs.map(({ stat, valeur, raison }) => (
                    <li key={stat}>
                      <strong>
                        {LIBELLES_STAT[stat]} à {valeur}
                      </strong>{" "}
                      <span className="texte-discret">: {raison}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </dd>
        </div>
      </dl>

      <div className="build__evs">
        <p className="build__sous-titre">EV ({EV_MAX_PAR_STAT} max par stat, 510 au total)</p>
        <ul className="evs">
          {STATS_COMBAT.map((stat) => {
            const valeur = set.evs[stat] ?? 0;
            return (
              <li key={stat} className="evs__ligne">
                <span className="evs__stat">{LIBELLES_STAT[stat]}</span>
                <span className="evs__barre" aria-hidden="true">
                  <span style={{ width: `${(valeur / EV_MAX_PAR_STAT) * 100}%` }} />
                </span>
                <span className="evs__valeur">{valeur}</span>
              </li>
            );
          })}
        </ul>
        {statsAEntrainer.length > 0 && (
          <p className="build__farm">
            Où farmer :{" "}
            {statsAEntrainer.map((stat, index) => (
              <span key={stat}>
                {index > 0 && ", "}
                <a className="lien-fiche" href={`#ev/${STAT_EV[stat]}`}>
                  {LIBELLES_STAT[stat]}
                </a>
              </span>
            ))}
          </p>
        )}
        <BoutonCopierShowdown texte={texteShowdown(nomEn, set)} />
      </div>
    </div>
  );
};

const ListeUsage: FC<{ titre: string; parts: PartUsage[]; table: Readonly<Record<string, string>> }> =
  ({ titre, parts, table }) =>
    parts.length === 0 ? null : (
      <div>
        <p className="build__sous-titre">{titre}</p>
        <ul className="usage__liste">
          {parts.map((part) => (
            <li key={part.nom}>
              <span>{traduire(table, part.nom)}</span>
              <span className="usage__pourcentage">{formaterPourcentage(part.pourcentage)}</span>
            </li>
          ))}
        </ul>
      </div>
    );

/**
 * Builds d'un Pokémon : sets recommandés par Smogon (un onglet par set)
 * et, en gen 9, ce que jouent réellement les joueurs Showdown.
 */
const BuildPokemon: FC<BuildPokemonProps> = ({ nomEn, strategie, donnees }) => {
  const [indexSet, setIndexSet] = useState(0);
  const set = strategie.sets[indexSet] ?? strategie.sets[0];
  const { usage } = strategie;

  return (
    <div className="build">
      {set ? (
        <>
          <div className="build__sets" role="group" aria-label="Sets recommandés">
            {strategie.sets.map((s, index) => (
              <button
                key={`${s.format}-${s.nom}`}
                type="button"
                className="bouton bouton--petit"
                aria-pressed={index === indexSet}
                onClick={() => setIndexSet(index)}
              >
                {strategie.sets.filter((autre) => autre.nom === s.nom).length > 1
                  ? `${s.nom} (${libelleFormat(s.format, s.generation)})`
                  : s.nom}
              </button>
            ))}
            <span className="texte-discret">Smogon {libelleFormat(set.format, set.generation)}</span>
          </div>
          <SetDetaille set={set} nomEn={nomEn} donnees={donnees} />
        </>
      ) : (
        <p className="texte-discret">Aucun set publié par Smogon pour ce Pokémon.</p>
      )}

      {usage && (
        <details className="usage">
          <summary>
            Ce que jouent les joueurs : {formaterPourcentage(usage.pourcentage)} des équipes{" "}
            {usage.tier} (rang {usage.rang})
          </summary>
          <div className="usage__grille">
            <ListeUsage
              titre="Capacités"
              parts={usage.capacites}
              table={donnees.traductions.capacites}
            />
            <ListeUsage titre="Objets" parts={usage.objets} table={donnees.traductions.objets} />
            <ListeUsage titre="Talents" parts={usage.talents} table={donnees.traductions.talents} />
            <ListeUsage titre="Téra" parts={usage.teras} table={donnees.traductions.types} />
            {usage.spreads.length > 0 && (
              <div>
                <p className="build__sous-titre">Natures et EV</p>
                <ul className="usage__liste">
                  {usage.spreads.map((spread) => (
                    <li key={`${spread.nature}-${JSON.stringify(spread.evs)}`}>
                      <span>
                        {donnees.natures[spread.nature]?.nomFr ?? spread.nature}{" "}
                        <span className="texte-discret">
                          {STATS_COMBAT.filter((stat) => spread.evs[stat])
                            .map((stat) => `${spread.evs[stat]} ${LIBELLES_STAT[stat]}`)
                            .join(", ")}
                        </span>
                      </span>
                      <span className="usage__pourcentage">
                        {formaterPourcentage(spread.pourcentage)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
};

export default BuildPokemon;
