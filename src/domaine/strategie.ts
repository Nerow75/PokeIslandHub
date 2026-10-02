// src/domaine/strategie.ts

import type { StatEv } from "../types/pokedex.ts";
import type { Repartition, SetRecommande, StatCombat } from "../types/strategie.ts";

/* Présentation des builds : libellés, IV conseillés, export au format Showdown. */

export const STATS_COMBAT: readonly StatCombat[] = ["hp", "atk", "def", "spa", "spd", "spe"];

export const LIBELLES_STAT: Readonly<Record<StatCombat, string>> = {
  hp: "PV",
  atk: "Attaque",
  def: "Défense",
  spa: "Atq. Spé.",
  spd: "Déf. Spé.",
  spe: "Vitesse",
};

/** Abréviations attendues par l'import d'équipe de Showdown. */
const ABREVIATIONS_SHOWDOWN: Readonly<Record<StatCombat, string>> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

/** Correspondance avec les statistiques de la table des EV rapportés. */
export const STAT_EV: Readonly<Record<StatCombat, StatEv>> = {
  hp: "pv",
  atk: "attaque",
  def: "defense",
  spa: "attaqueSpeciale",
  spd: "defenseSpeciale",
  spe: "vitesse",
};

export const EV_MAX_PAR_STAT = 252;
export const IV_PAR_DEFAUT = 31;

const LIBELLES_FORMAT: Readonly<Record<string, string>> = {
  ubers: "Uber",
  ou: "OU",
  ubersuu: "Uber UU",
  uu: "UU",
  ru: "RU",
  nu: "NU",
  pu: "PU",
  zu: "ZU",
  nfe: "NFE",
  lc: "Little Cup",
  nationaldexubers: "National Dex Uber",
  nationaldex: "National Dex",
  nationaldexuu: "National Dex UU",
  nationaldexru: "National Dex RU",
  anythinggoes: "Anything Goes",
  "1v1": "1v1",
  battlestadiumsingles: "Battle Stadium solo",
  battlespotsingles: "Battle Spot solo",
  monotype: "Monotype",
  nationaldexmonotype: "National Dex Monotype",
};

/** "nationaldex", 9 -> "National Dex, gen 9". */
export function libelleFormat(format: string, generation: number): string {
  return `${LIBELLES_FORMAT[format] ?? format}, gen ${generation}`;
}

/** Nom français si connu, sinon le nom anglais tel quel. */
export function traduire(table: Readonly<Record<string, string>>, nom: string): string {
  return table[nom] ?? nom;
}

export interface ConseilIv {
  stat: StatCombat;
  valeur: number;
  raison: string;
}

const RAISONS_IV: Partial<Record<StatCombat, string>> = {
  atk: "moins de dégâts subis par la confusion et par Tricherie, inutile sans attaque physique",
  spe: "le plus lent possible, pour Distorsion ou Gyroballe",
};

/** IV différents de 31 conseillés par le set, avec leur raison. Vide : 31 partout. */
export function conseilsIv(ivs: Repartition): ConseilIv[] {
  return STATS_COMBAT.flatMap((stat) => {
    const valeur = ivs[stat];
    if (valeur === undefined || valeur === IV_PAR_DEFAUT) return [];
    return [{ stat, valeur, raison: RAISONS_IV[stat] ?? "valeur fixée par l'analyse Smogon" }];
  });
}

function ligneRepartition(repartition: Repartition, neutre: number): string {
  return STATS_COMBAT.filter((stat) => (repartition[stat] ?? neutre) !== neutre)
    .map((stat) => `${repartition[stat]} ${ABREVIATIONS_SHOWDOWN[stat]}`)
    .join(" / ");
}

/**
 * Set au format d'import Showdown (premier choix à chaque alternative),
 * pour le copier dans un calculateur de dégâts ou un simulateur.
 */
export function texteShowdown(nomEspece: string, set: SetRecommande): string {
  const [objet] = set.objets;
  const lignes = [objet ? `${nomEspece} @ ${objet}` : nomEspece];
  const [talent] = set.talents;
  if (talent) lignes.push(`Ability: ${talent}`);
  const [tera] = set.teras;
  if (tera) lignes.push(`Tera Type: ${tera}`);
  const evs = ligneRepartition(set.evs, 0);
  if (evs) lignes.push(`EVs: ${evs}`);
  const [nature] = set.natures;
  if (nature) lignes.push(`${nature} Nature`);
  const ivs = ligneRepartition(set.ivs, IV_PAR_DEFAUT);
  if (ivs) lignes.push(`IVs: ${ivs}`);
  for (const choix of set.capacites) {
    const [capacite] = choix;
    if (capacite) lignes.push(`- ${capacite}`);
  }
  return lignes.join("\n");
}
