// src/types/apparitions.ts

/** Rareté Cobblemon d'une apparition ("bucket"). */
export type Rarete = "common" | "uncommon" | "rare" | "ultra-rare";

/**
 * Une condition d'apparition sauvage, simplifiée depuis les fichiers
 * spawn_pool_world de Cobblemon. Les identifiants (biomes, structures, blocs)
 * restent ceux de Minecraft / Cobblemon ; la traduction se fait à l'affichage.
 */
export interface Apparition {
  rarete: Rarete;
  /** Plage de niveaux, ex. "5-33". */
  niveaux: string;
  /** grounded, submerged, fishing, surface, seafloor... */
  position: string;
  /** Contextes Cobblemon ("presets") : natural, water, urban, treetop... */
  contextes: string[];
  /** Tags ou identifiants de biome, ex. "#cobblemon:is_jungle". */
  biomes: string[];
  biomesExclus: string[];
  structures: string[];
  blocsProches: string[];
  /** Aspect de la forme qui apparaît, ex. "alolan", "galarian". */
  aspect?: string;
  /** day, night, dusk. */
  moment?: string;
  /** true : seulement sous la pluie ; false : seulement par temps sec. */
  pluie?: boolean;
  orage?: boolean;
  /** true : à ciel ouvert ; false : à couvert (grottes, intérieur). */
  cielVisible?: boolean;
  /** Phase(s) de lune Minecraft, ex. "0" (pleine lune) ou "5-7". */
  phaseLune?: string;
  yMin?: number;
  yMax?: number;
  /** Niveau minimal de leurre (canne à pêche). */
  leurreMin?: number;
}

export interface ApparitionsGenerees {
  /** Version de Cobblemon dont proviennent les données. */
  versionCobblemon: string;
  genereLe: string;
  /** Slug d'espèce PokeAPI -> apparitions sauvages. */
  parEspece: Record<string, Apparition[]>;
}
