// src/domaine/apparitions.ts

import type { Apparition, Rarete } from "../types/apparitions.ts";

/*
 * Libellés français des identifiants Cobblemon / Minecraft.
 * Vocabulaire d'affichage : un identifiant absent de ces tables est rendu lisible
 * automatiquement (voir libelleIdentifiant), jamais masqué.
 */

export const TAG_PARTOUT = "#cobblemon:is_overworld";

const BIOMES: Record<string, string> = {
  "#cobblemon:is_overworld": "Partout (Surface)",
  "#cobblemon:is_arid": "Arides",
  "#cobblemon:is_badlands": "Badlands",
  "#cobblemon:is_bamboo": "Bambouseraie",
  "#cobblemon:is_beach": "Plage",
  "#cobblemon:is_cherry_blossom": "Cerisiers",
  "#cobblemon:is_coast": "Côte",
  "#cobblemon:is_cold": "Froids",
  "#cobblemon:is_cold_ocean": "Océan froid",
  "#cobblemon:is_deep_dark": "Profondeurs sombres",
  "#cobblemon:is_deep_ocean": "Océan profond",
  "#cobblemon:is_desert": "Désert",
  "#cobblemon:is_dripstone": "Grottes de spéléothèmes",
  "#cobblemon:is_end": "End",
  "#cobblemon:is_floral": "Fleuris",
  "#cobblemon:is_forest": "Forêt",
  "#cobblemon:is_freezing": "Glacials",
  "#cobblemon:is_freshwater": "Eau douce",
  "#cobblemon:is_frozen_ocean": "Océan gelé",
  "#cobblemon:is_glacial": "Glaciers",
  "#cobblemon:is_grassland": "Prairies",
  "#cobblemon:is_highlands": "Hautes terres",
  "#cobblemon:is_hills": "Collines",
  "#cobblemon:is_island": "Île",
  "#cobblemon:is_jungle": "Jungle",
  "#cobblemon:is_lukewarm_ocean": "Océan tiède",
  "#cobblemon:is_lush": "Grottes luxuriantes",
  "#cobblemon:is_magical": "Magiques",
  "#cobblemon:is_mountain": "Montagne",
  "#cobblemon:is_mushroom": "Champignons",
  "#cobblemon:is_ocean": "Océan",
  "#cobblemon:is_peak": "Sommets",
  "#cobblemon:is_plains": "Plaines",
  "#cobblemon:is_plateau": "Plateau",
  "#cobblemon:is_river": "Rivière",
  "#cobblemon:is_sandy": "Sableux",
  "#cobblemon:is_savanna": "Savane",
  "#cobblemon:is_shrubland": "Maquis",
  "#cobblemon:is_sky": "Ciel",
  "#cobblemon:is_snowy": "Enneigés",
  "#cobblemon:is_snowy_forest": "Forêt enneigée",
  "#cobblemon:is_snowy_taiga": "Taïga enneigée",
  "#cobblemon:is_spooky": "Lugubres",
  "#cobblemon:is_swamp": "Marais",
  "#cobblemon:is_taiga": "Taïga",
  "#cobblemon:is_temperate": "Tempérés",
  "#cobblemon:is_temperate_ocean": "Océan tempéré",
  "#cobblemon:is_thermal": "Thermaux",
  "#cobblemon:is_tropical_island": "Île tropicale",
  "#cobblemon:is_tundra": "Toundra",
  "#cobblemon:is_volcanic": "Volcaniques",
  "#cobblemon:is_warm_ocean": "Océan chaud",
  "#cobblemon:has_block/mud": "Avec de la boue",
  "#minecraft:is_nether": "Nether",
  "#cobblemon:nether/is_basalt": "Nether : deltas de basalte",
  "#cobblemon:nether/is_crimson": "Nether : forêt carmin",
  "#cobblemon:nether/is_desert": "Nether : désert",
  "#cobblemon:nether/is_forest": "Nether : forêt",
  "#cobblemon:nether/is_frozen": "Nether : gelé",
  "#cobblemon:nether/is_fungus": "Nether : champignons",
  "#cobblemon:nether/is_mountain": "Nether : montagne",
  "#cobblemon:nether/is_overgrowth": "Nether : végétation",
  "#cobblemon:nether/is_quartz": "Nether : quartz",
  "#cobblemon:nether/is_soul_fire": "Nether : feu des âmes",
  "#cobblemon:nether/is_soul_sand": "Nether : vallée des âmes",
  "#cobblemon:nether/is_toxic": "Nether : toxique",
  "#cobblemon:nether/is_warped": "Nether : forêt biscornue",
  "#cobblemon:nether/is_wasteland": "Nether : désolation",
  "minecraft:frozen_river": "Rivière gelée",
  "minecraft:mushroom_fields": "Champs de champignons",
  "minecraft:snowy_beach": "Plage enneigée",
  "minecraft:sunflower_plains": "Plaine de tournesols",
};

export const LIBELLES_RARETE: Record<Rarete, string> = {
  common: "Commun",
  uncommon: "Peu commun",
  rare: "Rare",
  "ultra-rare": "Ultra-rare",
};

const POSITIONS: Record<string, string> = {
  grounded: "Au sol",
  submerged: "Sous l'eau",
  surface: "À la surface de l'eau",
  seafloor: "Au fond de l'eau",
  fishing: "À la pêche",
  lava: "Dans la lave",
};

const MOMENTS: Record<string, string> = {
  day: "le jour",
  night: "la nuit",
  dusk: "au crépuscule",
};

const CONTEXTES: Record<string, string> = {
  natural: "nature",
  water: "eau",
  wild: "nature sauvage",
  urban: "près des villages",
  treetop: "cimes des arbres",
  foliage: "feuillage",
  derelict: "ruines abandonnées",
  mansion: "manoir",
  mansion_bedrooms: "chambres de manoir",
  mansion_dining: "salle à manger de manoir",
  trail_ruins: "ruines de sentier",
  ocean_ruins: "ruines sous-marines",
  ocean_monument: "monument sous-marin",
  jungle_pyramid: "temple de la jungle",
  desert_pyramid: "temple du désert",
  ancient_city: "cité antique",
  end_city: "cité de l'End",
  stronghold: "fort",
  pillager_outpost: "avant-poste de pillards",
  illager_structures: "structures d'illageois",
  ruined_portal: "portail en ruine",
  nether_structures: "structures du Nether",
  nether_fossil: "fossiles du Nether",
  redstone: "redstone",
  webs: "toiles d'araignée",
  lava: "lave",
  salt: "sel",
};

const STRUCTURES: Record<string, string> = {
  "#minecraft:village": "village",
  "#minecraft:shipwreck": "épave",
  "#cobblemon:shipwreck_cove": "crique d'épave",
  "#cobblemon:ruin": "ruines Cobblemon",
  "minecraft:monument": "monument sous-marin",
  "minecraft:igloo": "igloo",
  "minecraft:swamp_hut": "cabane de sorcière",
  "minecraft:desert_well": "puits du désert",
};

const PHASES_LUNE: Record<string, string> = {
  "0": "pleine lune",
  "4": "nouvelle lune",
  "0,4": "pleine ou nouvelle lune",
  "1-3": "lune décroissante",
  "5-7": "lune croissante",
};

/** "#cobblemon:nether/is_soul_sand" -> "nether soul sand". */
export function libelleIdentifiant(identifiant: string): string {
  return identifiant
    .replace(/^#/, "")
    .replace(/^[a-z_]+:/, "")
    .replace(/(^|\/)(is_|has_block\/)/g, "$1")
    .replaceAll("/", " ")
    .replaceAll("_", " ");
}

/** Biome de Minecraft ou de Cobblemon, par opposition aux biomes de mods tiers (Aether...). */
export function estBiomeDeBase(tag: string): boolean {
  return /^#?(minecraft|cobblemon):/.test(tag);
}

export function libelleBiome(tag: string): string {
  const libelle = BIOMES[tag] ?? libelleIdentifiant(tag);
  return estBiomeDeBase(tag) ? libelle : `${libelle} (mod)`;
}

export function libellePosition(position: string): string {
  return POSITIONS[position] ?? libelleIdentifiant(position);
}

/** Conditions complémentaires d'une apparition, en français, hors biomes et rareté. */
export function conditionsApparition(apparition: Apparition): string[] {
  const conditions: string[] = [];
  if (apparition.moment) conditions.push(MOMENTS[apparition.moment] ?? apparition.moment);
  if (apparition.pluie === true) conditions.push("sous la pluie");
  if (apparition.pluie === false) conditions.push("par temps sec");
  if (apparition.orage) conditions.push("pendant un orage");
  if (apparition.cielVisible === true) conditions.push("à ciel ouvert");
  if (apparition.cielVisible === false) conditions.push("à couvert ou sous terre");
  if (apparition.phaseLune !== undefined) {
    conditions.push(PHASES_LUNE[apparition.phaseLune] ?? `phase de lune ${apparition.phaseLune}`);
  }
  if (apparition.yMin !== undefined && apparition.yMax !== undefined) {
    conditions.push(`entre Y ${apparition.yMin} et Y ${apparition.yMax}`);
  } else if (apparition.yMin !== undefined) {
    conditions.push(`au-dessus de Y ${apparition.yMin}`);
  } else if (apparition.yMax !== undefined) {
    conditions.push(`en dessous de Y ${apparition.yMax}`);
  }
  if (apparition.structures.length > 0) {
    conditions.push(
      `dans : ${apparition.structures.map((s) => STRUCTURES[s] ?? libelleIdentifiant(s)).join(", ")}`,
    );
  }
  const contextesNotables = apparition.contextes.filter((c) => !["natural", "water"].includes(c));
  if (contextesNotables.length > 0) {
    conditions.push(contextesNotables.map((c) => CONTEXTES[c] ?? libelleIdentifiant(c)).join(", "));
  }
  if (apparition.blocsProches.length > 0) {
    conditions.push(`près de : ${apparition.blocsProches.map(libelleIdentifiant).join(", ")}`);
  }
  if (apparition.leurreMin !== undefined) conditions.push(`leurre niveau ${apparition.leurreMin}+`);
  return conditions;
}

/**
 * Vrai si l'apparition peut avoir lieu dans le biome demandé. Avec
 * `inclurePartout`, les apparitions valables dans toute la Surface comptent aussi.
 */
export function apparaitDansBiome(
  apparition: Apparition,
  tag: string,
  inclurePartout: boolean,
): boolean {
  if (apparition.biomesExclus.includes(tag)) {
    return false;
  }
  return (
    apparition.biomes.includes(tag) || (inclurePartout && apparition.biomes.includes(TAG_PARTOUT))
  );
}

/** Rareté la plus favorable d'une liste d'apparitions, pour trier les espèces. */
export function meilleureRarete(apparitions: readonly Apparition[]): Rarete | null {
  const ordre: Rarete[] = ["common", "uncommon", "rare", "ultra-rare"];
  return ordre.find((rarete) => apparitions.some((a) => a.rarete === rarete)) ?? null;
}

const ASPECTS: Record<string, string> = {
  alolan: "Forme d'Alola",
  galarian: "Forme de Galar",
  hisuian: "Forme de Hisui",
  paldean: "Forme de Paldea",
  valencian: "Forme de Valencia",
  female: "Femelle",
  male: "Mâle",
};

export function libelleAspect(aspect: string): string {
  return ASPECTS[aspect] ?? libelleIdentifiant(aspect);
}
