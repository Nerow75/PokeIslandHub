// src/types/pokedex.ts

/** Statistiques sur lesquelles un Pokémon vaincu rapporte des EV. */
export type StatEv =
  | "pv"
  | "attaque"
  | "defense"
  | "attaqueSpeciale"
  | "defenseSpeciale"
  | "vitesse";

export type EvRapportes = Record<StatEv, number>;

/**
 * Une condition d'évolution telle que décrite par PokeAPI.
 * Les identifiants (objet, capacité, lieu...) restent des slugs PokeAPI ;
 * seuls les objets sont traduits, via `PokedexGenere.objets`.
 */
export interface ConditionEvolution {
  declencheur: string;
  niveauMin?: number;
  objet?: string;
  objetTenu?: string;
  bonheurMin?: number;
  affectionMin?: number;
  beauteMin?: number;
  momentDeLaJournee?: string;
  capaciteConnue?: string;
  typeCapaciteConnue?: string;
  lieu?: string;
  sexe?: number;
  especeEchange?: string;
  especeEquipe?: string;
  typeEquipe?: string;
  statsPhysiquesRelatives?: number;
  pluieRequise?: boolean;
  consoleRetournee?: boolean;
}

export interface Evolution {
  /** Slug de l'espèce obtenue. */
  vers: string;
  conditions: ConditionEvolution[];
}

export interface EspecePokemon {
  /** Numéro national. */
  id: number;
  /** Slug d'espèce PokeAPI : identifiant canonique. */
  slug: string;
  nomFr: string;
  nomEn: string;
  generation: number;
  types: string[];
  evRapportes: EvRapportes;
  /** Slug de l'espèce dont celle-ci évolue, ou null. */
  evolueDe: string | null;
  evolutions: Evolution[];
  estLegendaire: boolean;
  estFabuleux: boolean;
}

export interface PokedexGenere {
  genereLe: string;
  especes: EspecePokemon[];
  /** Slug d'objet PokeAPI -> nom français. */
  objets: Record<string, string>;
}
