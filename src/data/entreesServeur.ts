// src/data/entreesServeur.ts

/*
 * Entrées du Pokédex propres au serveur PokeIsland, absentes de PokeAPI.
 * Seule exception à la règle "aucune donnée Pokémon saisie à la main" : ce fichier
 * se maintient à la main, d'après ce qu'affiche le Pokédex en jeu.
 *
 * Pour nommer une entrée identifiée en jeu : renseigner nomFr / nomEn.
 * Le slug ne change jamais, il sert de clé dans les sauvegardes.
 */

export interface EntreeServeur {
  numero: number;
  nomFr: string | null;
  nomEn: string | null;
}

export const ENTREES_SERVEUR: readonly EntreeServeur[] = [
  ...Array.from({ length: 18 }, (_, i) => ({ numero: 9001 + i, nomFr: null, nomEn: null })),
  { numero: 9100, nomFr: null, nomEn: null },
];
