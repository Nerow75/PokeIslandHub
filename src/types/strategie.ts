// src/types/strategie.ts

/*
 * Données de stratégie (tiers Smogon, builds recommandés, statistiques d'usage),
 * générées par scripts/generate-strategie.ts. Les noms de capacités, objets, talents,
 * natures et types restent en anglais (format Showdown) ; la traduction se fait à l'affichage.
 */

/** Statistiques au sens Showdown : PV, Attaque, Défense, Attaque Spéciale, Défense Spéciale, Vitesse. */
export type StatCombat = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

/** Répartition d'EV ou d'IV ; une stat absente vaut 0 (EV) ou 31 (IV). */
export type Repartition = Partial<Record<StatCombat, number>>;

/** Set recommandé par une analyse Smogon. */
export interface SetRecommande {
  nom: string;
  /** Format Smogon d'origine, ex. "ou", "nationaldex". */
  format: string;
  /** Génération de l'analyse. */
  generation: number;
  /** Une case par capacité ; plusieurs noms quand l'analyse laisse le choix. */
  capacites: string[][];
  talents: string[];
  objets: string[];
  natures: string[];
  evs: Repartition;
  /** IV différents de 31 conseillés par l'analyse (ex. 0 en Attaque). */
  ivs: Repartition;
  teras: string[];
}

/** Part d'usage d'un élément (capacité, objet...) en pourcentage des équipes. */
export interface PartUsage {
  nom: string;
  pourcentage: number;
}

export interface SpreadJoue {
  nature: string;
  evs: Repartition;
  pourcentage: number;
}

/** Statistiques d'usage Showdown gen 9 relevées par Coup Critique. */
export interface UsageEspece {
  /** Tier dont proviennent les statistiques, ex. "OU". */
  tier: string;
  rang: number;
  /** Pourcentage des équipes du tier qui jouent ce Pokémon. */
  pourcentage: number;
  capacites: PartUsage[];
  objets: PartUsage[];
  talents: PartUsage[];
  teras: PartUsage[];
  spreads: SpreadJoue[];
}

export interface StrategieEspece {
  /** Identifiant de la fiche Coup Critique (génération 9), pour le lien vers le site. */
  idCoupCritique: number | null;
  /** Tier Smogon (Uber, OU, UUBL...), ou null si aucun n'est connu. */
  tier: string | null;
  /** Génération dont provient le tier. */
  generationTier: number | null;
  usage: UsageEspece | null;
  sets: SetRecommande[];
}

export interface NatureStrategie {
  nomFr: string;
  hausse: StatCombat | null;
  baisse: StatCombat | null;
}

export interface StrategieGeneree {
  genereLe: string;
  /** Slug d'espèce PokeAPI -> stratégie. */
  parEspece: Record<string, StrategieEspece>;
  /** Type attaquant -> type défenseur -> multiplicateur (slugs anglais en minuscules). */
  efficacites: Record<string, Record<string, number>>;
  /** Capacité offensive (nom anglais) -> son type ; les capacités de statut sont absentes. */
  typesCapacites: Record<string, string>;
  /** Nom anglais -> nom français. */
  traductions: {
    capacites: Record<string, string>;
    objets: Record<string, string>;
    talents: Record<string, string>;
    types: Record<string, string>;
  };
  /** Nom anglais de nature -> nom français et stats modifiées. */
  natures: Record<string, NatureStrategie>;
}
