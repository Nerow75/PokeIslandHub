// src/types/cobblemon.ts

/**
 * Condition d'évolution Cobblemon ("requirement"), conservée telle quelle :
 * `variant` en donne la nature (level, friendship, biome, held_item...),
 * les autres champs ses paramètres. La traduction se fait à l'affichage.
 */
export interface ConditionCobblemon {
  variant: string;
  [parametre: string]: string | number | boolean;
}

export interface EvolutionCobblemon {
  /** Slug PokeAPI de l'espèce obtenue. */
  vers: string;
  /** Aspect de la forme obtenue, ex. "alolan". */
  aspectObtenu?: string;
  /** Aspect requis de la forme de départ, ex. "galarian" pour Miaouss de Galar. */
  aspectDepart?: string;
  /** level_up, item_interact (objet utilisé), trade (échange). */
  mode: string;
  /** Objet à utiliser (item_interact) ou espèce contre laquelle échanger (trade). */
  contexte?: string;
  conditions: ConditionCobblemon[];
}

export interface EspeceCobblemon {
  /** Présente et jouable dans cette version de Cobblemon. */
  implementee: boolean;
  /** Étiquettes Cobblemon : legendary, starter, paradox, gen1... */
  etiquettes: string[];
  evolutions: EvolutionCobblemon[];
}

export interface CobblemonGenere {
  versionCobblemon: string;
  genereLe: string;
  /** Slug d'espèce PokeAPI -> données Cobblemon. */
  parEspece: Record<string, EspeceCobblemon>;
  /** Identifiant d'objet Cobblemon (ex. "cobblemon:thunder_stone") -> nom français. */
  objets: Record<string, string>;
  /** Identifiant de capacité Cobblemon (ex. "ancientpower") -> nom français. */
  capacites: Record<string, string>;
}
