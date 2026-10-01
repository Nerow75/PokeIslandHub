// scripts/pokeapi/parse.ts

import { z } from "zod";
import type {
  ConditionEvolution,
  EspecePokemon,
  EvRapportes,
  Evolution,
  StatEv,
} from "../../src/types/pokedex.ts";

/* Schémas des réponses PokeAPI, limités aux champs utilisés. */

const ressourceNommee = z.object({ name: z.string(), url: z.string() });

export const schemaEspeceApi = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  is_legendary: z.boolean(),
  is_mythical: z.boolean(),
  generation: ressourceNommee,
  evolves_from_species: ressourceNommee.nullable(),
  evolution_chain: z.object({ url: z.string() }).nullable(),
  names: z.array(z.object({ name: z.string(), language: ressourceNommee })),
  varieties: z.array(z.object({ is_default: z.boolean(), pokemon: ressourceNommee })),
});
export type EspeceApi = z.infer<typeof schemaEspeceApi>;

export const schemaPokemonApi = z.object({
  stats: z.array(z.object({ effort: z.number().int(), stat: ressourceNommee })),
  types: z.array(z.object({ slot: z.number(), type: ressourceNommee })),
});
export type PokemonApi = z.infer<typeof schemaPokemonApi>;

const schemaDetailEvolutionApi = z.object({
  trigger: ressourceNommee,
  gender: z.number().nullish(),
  min_level: z.number().nullish(),
  item: ressourceNommee.nullish(),
  held_item: ressourceNommee.nullish(),
  min_happiness: z.number().nullish(),
  min_affection: z.number().nullish(),
  min_beauty: z.number().nullish(),
  time_of_day: z.string().nullish(),
  known_move: ressourceNommee.nullish(),
  known_move_type: ressourceNommee.nullish(),
  location: ressourceNommee.nullish(),
  trade_species: ressourceNommee.nullish(),
  party_species: ressourceNommee.nullish(),
  party_type: ressourceNommee.nullish(),
  relative_physical_stats: z.number().nullish(),
  needs_overworld_rain: z.boolean().nullish(),
  turn_upside_down: z.boolean().nullish(),
});
type DetailEvolutionApi = z.infer<typeof schemaDetailEvolutionApi>;

export interface MaillonChaineApi {
  species: { name: string; url: string };
  evolution_details: DetailEvolutionApi[];
  evolves_to: MaillonChaineApi[];
}

const schemaMaillonChaineApi: z.ZodType<MaillonChaineApi> = z.lazy(() =>
  z.object({
    species: ressourceNommee,
    evolution_details: z.array(schemaDetailEvolutionApi),
    evolves_to: z.array(schemaMaillonChaineApi),
  }),
);

export const schemaChaineEvolutionApi = z.object({
  id: z.number().int(),
  chain: schemaMaillonChaineApi,
});
export type ChaineEvolutionApi = z.infer<typeof schemaChaineEvolutionApi>;

export const schemaObjetApi = z.object({
  name: z.string(),
  names: z.array(z.object({ name: z.string(), language: ressourceNommee })),
});
export type ObjetApi = z.infer<typeof schemaObjetApi>;

/* Conversions vers le modèle du projet. */

const STAT_API_VERS_STAT_EV: Record<string, StatEv> = {
  hp: "pv",
  attack: "attaque",
  defense: "defense",
  "special-attack": "attaqueSpeciale",
  "special-defense": "defenseSpeciale",
  speed: "vitesse",
};

/** Extrait le dernier segment numérique d'une URL PokeAPI (ex. `.../generation/4/` -> 4). */
export function idDepuisUrl(url: string): number {
  const correspondance = /\/(\d+)\/?$/.exec(url);
  if (!correspondance?.[1]) {
    throw new Error(`URL PokeAPI sans identifiant numérique : ${url}`);
  }
  return Number(correspondance[1]);
}

export function nomDansLangue(
  noms: { name: string; language: { name: string } }[],
  langue: string,
): string | undefined {
  return noms.find((nom) => nom.language.name === langue)?.name;
}

export function slugVarieteParDefaut(espece: EspeceApi): string {
  const variete = espece.varieties.find((v) => v.is_default) ?? espece.varieties[0];
  if (!variete) {
    throw new Error(`Espèce sans variété : ${espece.name}`);
  }
  return variete.pokemon.name;
}

export function extraireEvRapportes(pokemon: PokemonApi): EvRapportes {
  const ev: EvRapportes = {
    pv: 0,
    attaque: 0,
    defense: 0,
    attaqueSpeciale: 0,
    defenseSpeciale: 0,
    vitesse: 0,
  };
  for (const { stat, effort } of pokemon.stats) {
    const cle = STAT_API_VERS_STAT_EV[stat.name];
    if (cle) {
      ev[cle] = effort;
    }
  }
  return ev;
}

export function extraireTypes(pokemon: PokemonApi): string[] {
  return [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name);
}

function convertirDetail(detail: DetailEvolutionApi): ConditionEvolution {
  const condition: ConditionEvolution = { declencheur: detail.trigger.name };
  if (detail.min_level != null) condition.niveauMin = detail.min_level;
  if (detail.item) condition.objet = detail.item.name;
  if (detail.held_item) condition.objetTenu = detail.held_item.name;
  if (detail.min_happiness != null) condition.bonheurMin = detail.min_happiness;
  if (detail.min_affection != null) condition.affectionMin = detail.min_affection;
  if (detail.min_beauty != null) condition.beauteMin = detail.min_beauty;
  if (detail.time_of_day) condition.momentDeLaJournee = detail.time_of_day;
  if (detail.known_move) condition.capaciteConnue = detail.known_move.name;
  if (detail.known_move_type) condition.typeCapaciteConnue = detail.known_move_type.name;
  if (detail.location) condition.lieu = detail.location.name;
  if (detail.gender != null) condition.sexe = detail.gender;
  if (detail.trade_species) condition.especeEchange = detail.trade_species.name;
  if (detail.party_species) condition.especeEquipe = detail.party_species.name;
  if (detail.party_type) condition.typeEquipe = detail.party_type.name;
  if (detail.relative_physical_stats != null) {
    condition.statsPhysiquesRelatives = detail.relative_physical_stats;
  }
  if (detail.needs_overworld_rain) condition.pluieRequise = true;
  if (detail.turn_upside_down) condition.consoleRetournee = true;
  return condition;
}

/** Convertit les détails d'évolution en conditions, sans doublons entre versions de jeu. */
export function convertirConditions(details: DetailEvolutionApi[]): ConditionEvolution[] {
  const vues = new Set<string>();
  const conditions: ConditionEvolution[] = [];
  for (const detail of details) {
    const condition = convertirDetail(detail);
    const empreinte = JSON.stringify(condition);
    if (!vues.has(empreinte)) {
      vues.add(empreinte);
      conditions.push(condition);
    }
  }
  return conditions;
}

/** Parcourt une chaîne et retourne, pour chaque espèce, ses évolutions directes. */
export function evolutionsParEspece(chaine: ChaineEvolutionApi): Map<string, Evolution[]> {
  const resultat = new Map<string, Evolution[]>();
  const parcourir = (maillon: MaillonChaineApi): void => {
    resultat.set(
      maillon.species.name,
      maillon.evolves_to.map((enfant) => ({
        vers: enfant.species.name,
        conditions: convertirConditions(enfant.evolution_details),
      })),
    );
    maillon.evolves_to.forEach(parcourir);
  };
  parcourir(chaine.chain);
  return resultat;
}

/** Slugs de tous les objets intervenant dans une chaîne d'évolution. */
export function objetsDeLaChaine(chaine: ChaineEvolutionApi): Set<string> {
  const objets = new Set<string>();
  const parcourir = (maillon: MaillonChaineApi): void => {
    for (const detail of maillon.evolution_details) {
      if (detail.item) objets.add(detail.item.name);
      if (detail.held_item) objets.add(detail.held_item.name);
    }
    maillon.evolves_to.forEach(parcourir);
  };
  parcourir(chaine.chain);
  return objets;
}

export function construireEspece(
  espece: EspeceApi,
  pokemon: PokemonApi,
  evolutions: Evolution[],
): EspecePokemon {
  const nomEn = nomDansLangue(espece.names, "en");
  if (!nomEn) {
    throw new Error(`Nom anglais absent pour ${espece.name}`);
  }
  return {
    id: espece.id,
    slug: espece.name,
    nomFr: nomDansLangue(espece.names, "fr") ?? nomEn,
    nomEn,
    generation: idDepuisUrl(espece.generation.url),
    types: extraireTypes(pokemon),
    evRapportes: extraireEvRapportes(pokemon),
    evolueDe: espece.evolves_from_species?.name ?? null,
    evolutions,
    estLegendaire: espece.is_legendary,
    estFabuleux: espece.is_mythical,
  };
}
