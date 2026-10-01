// src/domaine/etiquettes.ts

/*
 * Étiquettes Cobblemon ("labels") parlantes pour le joueur. Elles servent aussi
 * telles quelles dans le champ Étiquette du PokéFinder (ex. "legendary").
 * Les étiquettes de génération (gen1...) et de forme régionale sont omises.
 */
const ETIQUETTES: Record<string, string> = {
  legendary: "Légendaire",
  mythical: "Fabuleux",
  ultra_beast: "Ultra-Chimère",
  paradox: "Paradoxe",
  starter: "Starter",
  fossil: "Fossile",
  baby: "Bébé",
  restricted: "Restreint",
  powerhouse: "Pseudo-légendaire",
};

export function etiquettesAffichables(
  etiquettes: readonly string[],
): { id: string; libelle: string }[] {
  return etiquettes.flatMap((id) => {
    const libelle = ETIQUETTES[id];
    return libelle ? [{ id, libelle }] : [];
  });
}
