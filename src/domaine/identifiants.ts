// src/domaine/identifiants.ts

/** Identifiant comparable entre Cobblemon ("mrmime") et PokeAPI ("mr-mime"). */
export function cleEspece(identifiant: string): string {
  return identifiant.toLowerCase().replace(/[^a-z0-9]/g, "");
}
