// src/data/plantesVanilla.ts

/*
 * Cultures de Minecraft sans mod, pour l'onglet Plantations. Ce ne sont pas des
 * données Pokémon : la liste se maintient à la main, noms de la traduction française
 * du jeu. Noigrumes et baies, eux, viennent de cobblemon.json (script de génération).
 *
 * L'identifiant ne change jamais : il sert de clé dans les sauvegardes.
 */

import type { PlanteCobblemon } from "../types/cobblemon.ts";

export const PLANTES_VANILLA: readonly PlanteCobblemon[] = [
  { id: "minecraft:wheat", nomFr: "Blé" },
  { id: "minecraft:carrot", nomFr: "Carotte" },
  { id: "minecraft:potato", nomFr: "Pomme de terre" },
  { id: "minecraft:beetroot", nomFr: "Betterave" },
  { id: "minecraft:melon", nomFr: "Pastèque" },
  { id: "minecraft:pumpkin", nomFr: "Citrouille" },
  { id: "minecraft:sugar_cane", nomFr: "Canne à sucre" },
  { id: "minecraft:bamboo", nomFr: "Bambou" },
  { id: "minecraft:cactus", nomFr: "Cactus" },
  { id: "minecraft:cocoa_beans", nomFr: "Fèves de cacao" },
  { id: "minecraft:sweet_berries", nomFr: "Baies sucrées" },
  { id: "minecraft:glow_berries", nomFr: "Baies lumineuses" },
  { id: "minecraft:nether_wart", nomFr: "Verrues du Nether" },
];
