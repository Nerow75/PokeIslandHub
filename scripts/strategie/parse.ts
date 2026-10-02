// scripts/strategie/parse.ts

import { z } from "zod";
import type {
  PartUsage,
  Repartition,
  SetRecommande,
  StatCombat,
  UsageEspece,
} from "../../src/types/strategie.ts";
import { cleEspece } from "../cobblemon/parse.ts";

/*
 * Lecture des données de stratégie :
 * - API Coup Critique (tiers Smogon par génération, statistiques d'usage Showdown, traductions) ;
 * - sets Smogon publiés par pkmn (https://github.com/pkmn/smogon), toutes générations.
 */

/** Tier sans valeur stratégique : Pokémon absent de la génération ou non classé. */
export const TIER_NON_CLASSE = "Untiered";

/* Tiers dont les statistiques d'usage décrivent un format solo 6v6 Smogon. */
const TIERS_USAGE_SOLO = new Set(["AG", "Uber", "OU", "UU", "RU", "NU", "PU", "ZU", "LC"]);

/* Un Pokémon "BL" est trop fort pour son tier : ses statistiques sont celles du tier supérieur. */
const TIER_USAGE_PAR_TIER: Readonly<Record<string, string>> = {
  UUBL: "OU",
  RUBL: "UU",
  NUBL: "RU",
  PUBL: "NU",
  ZUBL: "PU",
};

/* Format Smogon correspondant à chaque tier, consulté en premier pour les sets. */
const FORMAT_PAR_TIER: Readonly<Record<string, string>> = {
  AG: "anythinggoes",
  Uber: "ubers",
  OU: "ou",
  UUBL: "ou",
  UU: "uu",
  RUBL: "uu",
  RU: "ru",
  NUBL: "ru",
  NU: "nu",
  PUBL: "nu",
  PU: "pu",
  ZUBL: "pu",
  ZU: "zu",
  NFE: "nfe",
  LC: "lc",
};

/*
 * Formats solo retenus pour les sets, du plus pertinent au moins pertinent.
 * Les formats à règles spéciales (Hackmons, STABmons, CAP, doubles, VGC...) sont ignorés.
 */
export const FORMATS_SOLO: readonly string[] = [
  "ubers",
  "ou",
  "ubersuu",
  "uu",
  "ru",
  "nu",
  "pu",
  "zu",
  "nfe",
  "lc",
  "nationaldexubers",
  "nationaldex",
  "nationaldexuu",
  "nationaldexru",
  "anythinggoes",
  "1v1",
  "battlestadiumsingles",
  "battlespotsingles",
  "monotype",
  "nationaldexmonotype",
];

export const NOMBRE_SETS_MAX = 3;

/* ---------- Coup Critique ---------- */

const schemaNomTraduit = z.object({ name: z.string(), nom: z.string().nullable() });

export const schemaListePokemonCoupCritique = z.object({
  pokemons: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      tier: z.object({ shortName: z.string() }).nullable(),
      requiredItem: z.object({ name: z.string() }).nullable().optional(),
    }),
  ),
});
export type PokemonCoupCritique = z.infer<typeof schemaListePokemonCoupCritique>["pokemons"][number];

const schemaRepartitionCoupCritique = z.object({
  hp: z.number(),
  atk: z.number(),
  def: z.number(),
  spa: z.number(),
  spd: z.number(),
  spe: z.number(),
});

export const schemaDetailCoupCritique = z.object({
  usages: z.array(
    z.object({
      provider: z.string(),
      tier: z.object({ shortName: z.string() }),
      rank: z.number().nullable(),
      percent: z.number().nullable(),
      usageAbilities: z.array(z.object({ ability: schemaNomTraduit, percent: z.number() })),
      usageItems: z.array(z.object({ item: schemaNomTraduit, percent: z.number() })),
      usageTeras: z.array(z.object({ type: schemaNomTraduit, percent: z.number() })),
      usageMoves: z.array(z.object({ move: schemaNomTraduit, percent: z.number() })),
      usageSpreads: z.array(
        z.object({
          nature: schemaNomTraduit,
          evs: schemaRepartitionCoupCritique,
          percent: z.number(),
        }),
      ),
    }),
  ),
});
export type DetailCoupCritique = z.infer<typeof schemaDetailCoupCritique>;

export const schemaListeTraduite = (cle: "moves" | "items" | "abilities") =>
  z.object({ [cle]: z.array(schemaNomTraduit) });

export const schemaNaturesCoupCritique = z.object({
  natures: z.array(
    schemaNomTraduit.extend({
      atk: z.number().nullable(),
      def: z.number().nullable(),
      spa: z.number().nullable(),
      spd: z.number().nullable(),
      spe: z.number().nullable(),
    }),
  ),
});

export const schemaTypesCoupCritique = z.object({
  types: z.array(
    schemaNomTraduit.extend({
      weaknesses: z.array(
        z.object({ type_attacker: schemaNomTraduit, ratio: z.number() }),
      ),
    }),
  ),
});

/* Formes déclenchées en combat par un objet (Méga-Évolution, Primo-Résurgence). */
const FORME_MEGA_OU_PRIMO = /-(Mega|Primal)\b/;

/**
 * Objets qui n'agissent que sur une forme spéciale de combat : Méga-Gemmes, Orbes Primo
 * et cristaux Z. Un set qui en dépend ne décrit pas la forme de base du Pokémon.
 */
export function objetsDeFormeSpeciale(
  listes: readonly (readonly PokemonCoupCritique[])[],
  objets: readonly string[],
): Set<string> {
  const interdits = new Set(objets.filter((nom) => nom.endsWith(" Z")));
  for (const liste of listes) {
    for (const pokemon of liste) {
      if (pokemon.requiredItem && FORME_MEGA_OU_PRIMO.test(pokemon.name)) {
        interdits.add(pokemon.requiredItem.name);
      }
    }
  }
  return interdits;
}

export interface TierRetenu {
  tier: string;
  generation: number;
  /** Identifiant Coup Critique de l'espèce dans cette génération. */
  idCoupCritique: number;
}

/**
 * Tier de chaque espèce : celui de la génération la plus récente où elle est classée.
 * `listesParGeneration` va de la génération la plus récente à la plus ancienne.
 */
export function choisirTiers(
  listesParGeneration: readonly { generation: number; pokemons: PokemonCoupCritique[] }[],
  slugParCle: ReadonlyMap<string, string>,
): Map<string, TierRetenu> {
  const tiers = new Map<string, TierRetenu>();
  for (const { generation, pokemons } of listesParGeneration) {
    for (const pokemon of pokemons) {
      const slug = slugParCle.get(cleEspece(pokemon.name));
      const tier = pokemon.tier?.shortName;
      if (!slug || !tier || tier === TIER_NON_CLASSE || tiers.has(slug)) continue;
      tiers.set(slug, { tier, generation, idCoupCritique: pokemon.id });
    }
  }
  return tiers;
}

function partsUsage(
  elements: readonly { nom: string; pourcentage: number }[],
  maximum: number,
): PartUsage[] {
  return elements
    .filter((e) => e.pourcentage >= 1)
    .slice(0, maximum)
    .map((e) => ({ nom: e.nom, pourcentage: Math.round(e.pourcentage * 10) / 10 }));
}

function repartitionNonNulle(valeurs: Record<StatCombat, number>, neutre: number): Repartition {
  const repartition: Repartition = {};
  for (const [stat, valeur] of Object.entries(valeurs) as [StatCombat, number][]) {
    if (valeur !== neutre) repartition[stat] = valeur;
  }
  return repartition;
}

/**
 * Statistiques d'usage Showdown retenues pour une espèce : celles de son tier
 * (ou du tier supérieur pour un "BL"), sinon celles du tier solo où elle est la plus jouée.
 */
export function convertirUsage(detail: DetailCoupCritique, tier: string): UsageEspece | null {
  const solo = detail.usages.filter(
    (u): u is typeof u & { percent: number } =>
      u.provider === "showdown" && TIERS_USAGE_SOLO.has(u.tier.shortName) && u.percent !== null,
  );
  const tierVise = TIER_USAGE_PAR_TIER[tier] ?? tier;
  const usage =
    solo.find((u) => u.tier.shortName === tierVise) ??
    [...solo].sort((a, b) => b.percent - a.percent)[0];
  if (!usage || usage.rank === null) return null;
  return {
    tier: usage.tier.shortName,
    rang: usage.rank,
    pourcentage: Math.round(usage.percent * 100) / 100,
    capacites: partsUsage(
      usage.usageMoves.map((m) => ({ nom: m.move.name, pourcentage: m.percent })),
      8,
    ),
    objets: partsUsage(
      usage.usageItems.map((i) => ({ nom: i.item.name, pourcentage: i.percent })),
      3,
    ),
    talents: partsUsage(
      usage.usageAbilities.map((a) => ({ nom: a.ability.name, pourcentage: a.percent })),
      2,
    ),
    teras: partsUsage(
      usage.usageTeras.map((t) => ({ nom: t.type.name, pourcentage: t.percent })),
      3,
    ),
    spreads: usage.usageSpreads.slice(0, 3).map((s) => ({
      nature: s.nature.name,
      evs: repartitionNonNulle(s.evs, 0),
      pourcentage: Math.round(s.percent * 10) / 10,
    })),
  };
}

/* ---------- Sets Smogon ---------- */

const schemaUnOuPlusieurs = z.union([z.string(), z.array(z.string())]);
const schemaRepartitionSmogon = z.record(z.string(), z.number());

const schemaSetSmogon = z.object({
  moves: z.array(schemaUnOuPlusieurs),
  ability: schemaUnOuPlusieurs.optional(),
  item: schemaUnOuPlusieurs.optional(),
  nature: schemaUnOuPlusieurs.optional(),
  /* Certaines analyses proposent plusieurs répartitions : la première est retenue. */
  evs: z.union([schemaRepartitionSmogon, z.array(schemaRepartitionSmogon)]).optional(),
  ivs: z.union([schemaRepartitionSmogon, z.array(schemaRepartitionSmogon)]).optional(),
  teratypes: schemaUnOuPlusieurs.optional(),
});

/** Fichier gen<N>.json : espèce (nom Showdown) -> format -> nom du set -> set. */
export const schemaFichierSetsSmogon = z.record(
  z.string(),
  z.record(z.string(), z.record(z.string(), z.unknown())),
);
export type FichierSetsSmogon = z.infer<typeof schemaFichierSetsSmogon>;

const STATS: readonly StatCombat[] = ["hp", "atk", "def", "spa", "spd", "spe"];

function enListe(valeur: string | string[] | undefined): string[] {
  if (valeur === undefined) return [];
  return Array.isArray(valeur) ? valeur : [valeur];
}

function repartitionSmogon(
  valeur: Record<string, number> | Record<string, number>[] | undefined,
): Repartition {
  const premiere = Array.isArray(valeur) ? valeur[0] : valeur;
  const repartition: Repartition = {};
  for (const stat of STATS) {
    const nombre = premiere?.[stat];
    if (typeof nombre === "number") repartition[stat] = nombre;
  }
  return repartition;
}

/**
 * Convertit un set Smogon ; null s'il ne respecte pas le format attendu
 * ou s'il n'a de sens qu'avec un objet de forme spéciale (Méga-Gemme, cristal Z).
 */
export function convertirSet(
  nom: string,
  format: string,
  generation: number,
  brut: unknown,
  objetsInterdits: ReadonlySet<string> = new Set(),
): SetRecommande | null {
  const resultat = schemaSetSmogon.safeParse(brut);
  if (!resultat.success) return null;
  const set = resultat.data;
  const objetsProposes = enListe(set.item);
  const objets = objetsProposes.filter((objet) => !objetsInterdits.has(objet));
  if (objetsProposes.length > 0 && objets.length === 0) return null;
  return {
    nom,
    format,
    generation,
    capacites: set.moves.map(enListe),
    talents: enListe(set.ability),
    objets,
    natures: enListe(set.nature),
    evs: repartitionSmogon(set.evs),
    ivs: repartitionSmogon(set.ivs),
    teras: enListe(set.teratypes),
  };
}

/** Formats à consulter pour une espèce : celui de son tier d'abord, puis les formats solo. */
export function ordreFormats(tier: string | null): string[] {
  const prioritaire = tier ? FORMAT_PAR_TIER[tier] : undefined;
  return prioritaire
    ? [prioritaire, ...FORMATS_SOLO.filter((f) => f !== prioritaire)]
    : [...FORMATS_SOLO];
}

/**
 * Sets recommandés de chaque espèce, pris dans la génération la plus récente qui en propose.
 * `fichiersParGeneration` va de la génération la plus récente à la plus ancienne.
 */
export function choisirSets(
  fichiersParGeneration: readonly { generation: number; sets: FichierSetsSmogon }[],
  slugParCle: ReadonlyMap<string, string>,
  tierDe: (slug: string) => string | null,
  objetsInterdits: ReadonlySet<string> = new Set(),
): Map<string, SetRecommande[]> {
  const resultat = new Map<string, SetRecommande[]>();
  for (const { generation, sets } of fichiersParGeneration) {
    for (const [nomEspece, parFormat] of Object.entries(sets)) {
      const slug = slugParCle.get(cleEspece(nomEspece));
      if (!slug || resultat.has(slug)) continue;
      const retenus: SetRecommande[] = [];
      for (const format of ordreFormats(tierDe(slug))) {
        for (const [nomSet, brut] of Object.entries(parFormat[format] ?? {})) {
          if (retenus.length >= NOMBRE_SETS_MAX) break;
          const set = convertirSet(nomSet, format, generation, brut, objetsInterdits);
          if (set) retenus.push(set);
        }
      }
      if (retenus.length > 0) resultat.set(slug, retenus);
    }
  }
  return resultat;
}

/* ---------- Traductions et types ---------- */

/** Fusionne des listes Coup Critique (plus récente d'abord) en une table anglais -> français. */
export function tableTraductions(
  listes: readonly (readonly { name: string; nom: string | null }[])[],
): Record<string, string> {
  const table: Record<string, string> = {};
  for (const liste of listes) {
    for (const { name, nom } of liste) {
      if (nom && !(name in table)) table[name] = nom;
    }
  }
  return table;
}

/* Type propre à la Téracristallisation Stellaire, jamais porté par une espèce. */
const TYPE_STELLAIRE = "stellar";

/** Table d'efficacité : type attaquant -> type défenseur -> multiplicateur. */
export function tableEfficacites(
  types: z.infer<typeof schemaTypesCoupCritique>["types"],
): Record<string, Record<string, number>> {
  const table: Record<string, Record<string, number>> = {};
  for (const defenseur of types) {
    if (defenseur.name.toLowerCase() === TYPE_STELLAIRE) continue;
    for (const { type_attacker: attaquant, ratio } of defenseur.weaknesses) {
      if (attaquant.name.toLowerCase() === TYPE_STELLAIRE) continue;
      const ligne = (table[attaquant.name.toLowerCase()] ??= {});
      ligne[defenseur.name.toLowerCase()] = ratio;
    }
  }
  return table;
}
