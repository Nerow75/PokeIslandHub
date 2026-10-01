// src/domaine/evolutionsCobblemon.ts

import type { ConditionCobblemon, EvolutionCobblemon } from "../types/cobblemon.ts";
import { libelleBiome, libelleIdentifiant } from "./apparitions.ts";

/* Traduction en français des évolutions telles que Cobblemon les définit. */

export interface TraductionsCobblemon {
  /** "cobblemon:thunder_stone" -> "Pierre Foudre". */
  objets: Readonly<Record<string, string>>;
  /** "ancientpower" -> "Pouvoir Antique". */
  capacites: Readonly<Record<string, string>>;
  /** "fairy" -> "Fée". */
  types: Readonly<Record<string, string>>;
  /** Slug ou identifiant Cobblemon d'espèce -> nom français. */
  especes: (identifiant: string) => string;
}

const MOMENTS: Record<string, string> = {
  day: "le jour",
  night: "la nuit",
  dusk: "au crépuscule",
  dawn: "à l'aube",
  morning: "le matin",
  noon: "à midi",
  afternoon: "l'après-midi",
  midnight: "à minuit",
};

const STATS: Record<string, string> = {
  attack: "Attaque",
  defence: "Défense",
  defense: "Défense",
  special_attack: "Atq. Spé.",
  special_defence: "Déf. Spé.",
  speed: "Vitesse",
  hp: "PV",
};

const PHASES_LUNE: Record<string, string> = {
  FULL_MOON: "pleine lune",
  NEW_MOON: "nouvelle lune",
};

const REGIONS: Record<string, string> = {
  alola: "Alola",
  kanto: "Kanto",
  johto: "Johto",
  hoenn: "Hoenn",
  sinnoh: "Sinnoh",
  unova: "Unys",
  kalos: "Kalos",
  galar: "Galar",
  hisui: "Hisui",
  paldea: "Paldea",
};

/* Objets Minecraft utilisés par certaines évolutions (pousses d'arbre...). */
const OBJETS_MINECRAFT: Record<string, string> = {
  "minecraft:oak_sapling": "Pousse de chêne",
  "minecraft:birch_sapling": "Pousse de bouleau",
  "minecraft:dark_oak_sapling": "Pousse de chêne noir",
  "minecraft:acacia_sapling": "Pousse d'acacia",
  "minecraft:jungle_sapling": "Pousse d'arbre de la jungle",
  "minecraft:spruce_sapling": "Pousse de sapin",
  "minecraft:mangrove_propagule": "Propagule de palétuvier",
  "minecraft:cherry_sapling": "Pousse de cerisier",
  "#cobblemon:azalea_tree": "Azalée",
};

function texte(condition: ConditionCobblemon, cle: string): string | undefined {
  const valeur = condition[cle];
  return typeof valeur === "string" ? valeur : undefined;
}

function nombre(condition: ConditionCobblemon, cle: string): number | undefined {
  const valeur = condition[cle];
  return typeof valeur === "number" ? valeur : undefined;
}

export function nomObjetCobblemon(identifiant: string, traductions: TraductionsCobblemon): string {
  return (
    traductions.objets[identifiant] ??
    OBJETS_MINECRAFT[identifiant] ??
    libelleIdentifiant(identifiant)
  );
}

/** Biomes propres aux évolutions régionales : "...regional/cubone_alolabiome" -> "biomes d'Alola". */
function libelleBiomeEvolution(tag: string): string {
  if (tag === "#cobblemon:is_overworld") return "la Surface";
  const regional = /regional\/[a-z]+_([a-z]+)biome$/.exec(tag);
  const region = regional?.[1] ? REGIONS[regional[1]] : undefined;
  if (region) return `biomes de type ${region}`;
  const vivillon = /vivillon\/([a-z_]+?)(_anti)?$/.exec(tag);
  if (vivillon?.[1]) return `zone du motif ${libelleIdentifiant(vivillon[1])}`;
  return libelleBiome(tag);
}

/** "gender=male" -> "mâle" ; "toxel nature=hardy" -> "nature hardy". */
function libelleProprietes(cible: string): string {
  const proprietes = cible
    .split(/\s+/)
    .filter((morceau) => morceau.includes("="))
    .map((morceau) => {
      const [cle = "", valeur = ""] = morceau.split("=");
      if (cle === "gender") return valeur === "male" ? "mâle" : "femelle";
      if (cle === "nature") return `nature ${valeur}`;
      if (cle === "nickname") return `surnommé « ${valeur} »`;
      if (cle === "cocoon_species") return "selon sa personnalité (aléatoire)";
      if (cle.endsWith("_coins")) return `avec ${valeur} pièces`;
      /* Variante cosmétique (netherite de Mordudor) : sans effet sur l'évolution. */
      if (cle.endsWith("_netherite")) return "";
      return `${libelleIdentifiant(cle)} ${valeur}`;
    });
  return proprietes.filter(Boolean).join(", ");
}

/** Une condition Cobblemon en français, ou null si elle n'apporte rien à afficher. */
export function decrireConditionCobblemon(
  condition: ConditionCobblemon,
  traductions: TraductionsCobblemon,
): string | null {
  switch (condition.variant) {
    case "level": {
      const niveau = nombre(condition, "minLevel");
      return niveau !== undefined ? `Niveau ${niveau}` : null;
    }
    case "friendship":
      return `Bonheur ≥ ${nombre(condition, "amount") ?? "?"}`;
    case "time_range": {
      const plage = texte(condition, "range") ?? "";
      return MOMENTS[plage] ?? plage;
    }
    case "biome": {
      const dans = texte(condition, "biomeCondition");
      const hors = texte(condition, "biomeAnticondition");
      if (dans) return `dans : ${libelleBiomeEvolution(dans)}`;
      if (hors) return `hors : ${libelleBiomeEvolution(hors)}`;
      return null;
    }
    case "has_move_type": {
      const type = texte(condition, "type") ?? "";
      return `en connaissant une capacité ${traductions.types[type] ?? type}`;
    }
    case "held_item":
      return `en tenant ${nomObjetCobblemon(texte(condition, "itemCondition") ?? "", traductions)}`;
    case "has_move": {
      const capacite = texte(condition, "move") ?? "";
      return `en connaissant ${traductions.capacites[capacite] ?? capacite}`;
    }
    case "use_move": {
      const capacite = texte(condition, "move") ?? "";
      return `après avoir utilisé ${traductions.capacites[capacite] ?? capacite} ${nombre(condition, "amount") ?? ""} fois`;
    }
    case "stat_compare": {
      const haute = STATS[texte(condition, "highStat") ?? ""] ?? texte(condition, "highStat");
      const basse = STATS[texte(condition, "lowStat") ?? ""] ?? texte(condition, "lowStat");
      return `${haute} > ${basse}`;
    }
    case "stat_equal": {
      const une = STATS[texte(condition, "statOne") ?? ""] ?? texte(condition, "statOne");
      const autre = STATS[texte(condition, "statTwo") ?? ""] ?? texte(condition, "statTwo");
      return `${une} = ${autre}`;
    }
    case "moon_phase": {
      const phase = texte(condition, "moonPhase") ?? "";
      return PHASES_LUNE[phase] ?? `phase de lune ${phase.toLowerCase()}`;
    }
    case "properties":
      return libelleProprietes(texte(condition, "target") ?? "") || null;
    case "party_member": {
      const cible = texte(condition, "target") ?? "";
      const type = /type=([a-z]+)/.exec(cible)?.[1];
      const espece = type
        ? `un Pokémon ${traductions.types[type] ?? type}`
        : traductions.especes(cible);
      return condition["contains"] === false
        ? `sans ${espece} dans l'équipe`
        : `avec ${espece} dans l'équipe`;
    }
    case "defeat": {
      const cible = (texte(condition, "target") ?? "").split(/\s+/)[0] ?? "";
      return `après avoir vaincu ${nombre(condition, "amount") ?? ""} ${traductions.especes(cible)}`;
    }
    case "weather":
      if (condition["isThundering"] === true) return "pendant un orage";
      if (condition["isRaining"] === true) return "sous la pluie";
      return null;
    case "structure": {
      const pres = texte(condition, "structureCondition");
      const loin = texte(condition, "structureAnticondition");
      if (pres) return `près de : ${libelleIdentifiant(pres)}`;
      if (loin) return `loin de : ${libelleIdentifiant(loin)}`;
      return null;
    }
    case "advancement":
      return `succès « ${libelleIdentifiant(texte(condition, "requiredAdvancement") ?? "")} »`;
    case "blocks_traveled":
      return `après avoir parcouru ${nombre(condition, "amount") ?? ""} blocs`;
    case "property_range":
      /* Variantes cosmétiques (taux de netherite de Mordudor...) : sans effet sur l'évolution. */
      return null;
    default:
      return libelleIdentifiant(condition.variant);
  }
}

/** Une évolution Cobblemon complète en français, ex. "Utiliser : Pierre Foudre". */
export function decrireEvolutionCobblemon(
  evolution: EvolutionCobblemon,
  traductions: TraductionsCobblemon,
): string {
  const parties: string[] = [];
  if (evolution.mode === "item_interact") {
    parties.push(`Utiliser : ${nomObjetCobblemon(evolution.contexte ?? "", traductions)}`);
  } else if (evolution.mode === "trade") {
    parties.push(
      evolution.contexte ? `Échange contre ${traductions.especes(evolution.contexte)}` : "Échange",
    );
  }
  for (const condition of evolution.conditions) {
    const description = decrireConditionCobblemon(condition, traductions);
    if (description) parties.push(description);
  }
  if (parties.length === 0) parties.push("Montée de niveau");
  return parties.join(", ");
}

/** Niveau minimal requis, ou null si l'évolution ne dépend pas du niveau. */
export function niveauEvolutionCobblemon(evolution: EvolutionCobblemon): number | null {
  for (const condition of evolution.conditions) {
    if (condition.variant === "level") {
      const niveau = nombre(condition, "minLevel");
      if (niveau !== undefined) return niveau;
    }
  }
  return null;
}
