// src/domaine/equipe.ts

/*
 * Classement des Pokémon capturés par tier Smogon et proposition d'une équipe de six,
 * équilibrée défensivement. Fonctions pures : les données viennent de strategie.json.
 */

export const TAILLE_EQUIPE = 6;

/** Choix du joueur sur l'équipe proposée, conservés dans la sauvegarde. */
export interface ChoixEquipe {
  /** Slugs imposés dans l'équipe, dans l'ordre d'ajout. */
  epingles: string[];
  /** Slugs à ne jamais proposer. */
  exclus: string[];
}

export function choixEquipeVide(): ChoixEquipe {
  return { epingles: [], exclus: [] };
}

/** Tiers Smogon du plus fort au plus faible ; un tier "BL" se place entre ses deux voisins. */
export const ORDRE_TIERS = [
  "AG",
  "Uber",
  "OU",
  "UUBL",
  "UU",
  "RUBL",
  "RU",
  "NUBL",
  "NU",
  "PUBL",
  "PU",
  "ZUBL",
  "ZU",
  "NFE",
  "LC",
] as const;

/** Tiers des Pokémon qui peuvent encore évoluer. */
const TIERS_NON_EVOLUES = new Set(["NFE", "LC"]);

/** Position du tier dans ORDRE_TIERS ; un tier inconnu ou absent passe après tous les autres. */
export function rangTier(tier: string | null): number {
  const index = tier === null ? -1 : (ORDRE_TIERS as readonly string[]).indexOf(tier);
  return index === -1 ? ORDRE_TIERS.length : index;
}

export function estNonEvolue(tier: string | null): boolean {
  return tier !== null && TIERS_NON_EVOLUES.has(tier);
}

export interface CandidatEquipe {
  slug: string;
  tier: string | null;
  /** Pourcentage d'usage Showdown, 0 si inconnu. */
  pourcentageUsage: number;
  /** Types en slugs anglais minuscules ("dragon", "ground"). */
  types: readonly string[];
  /** Forme de base de la famille d'évolution. */
  famille: string;
}

export type TableEfficacites = Readonly<Record<string, Readonly<Record<string, number>>>>;

/** Multiplicateur subi par un Pokémon de ces types face à une attaque du type donné. */
export function multiplicateurSubi(
  typesDefenseur: readonly string[],
  typeAttaquant: string,
  efficacites: TableEfficacites,
): number {
  return typesDefenseur.reduce(
    (produit, type) => produit * (efficacites[typeAttaquant]?.[type] ?? 1),
    1,
  );
}

/** Classe les candidats du plus fort au plus faible : tier, puis usage. */
export function classerParForce<T extends Pick<CandidatEquipe, "tier" | "pourcentageUsage">>(
  candidats: readonly T[],
): T[] {
  return [...candidats].sort(
    (a, b) => rangTier(a.tier) - rangTier(b.tier) || b.pourcentageUsage - a.pourcentageUsage,
  );
}

/* Un tier d'écart vaut 4 points ; l'usage départage au sein d'un tier (2 points au plus). */
function force(candidat: CandidatEquipe): number {
  return (ORDRE_TIERS.length - rangTier(candidat.tier)) * 4 + Math.min(candidat.pourcentageUsage, 50) / 25;
}

/**
 * Apport défensif d'un candidat à l'équipe en cours : pénalité pour chaque faiblesse,
 * d'autant plus forte que l'équipe la partage déjà ; bonus s'il résiste à une faiblesse
 * que l'équipe couvre mal.
 */
function equilibre(
  candidat: CandidatEquipe,
  equipe: readonly CandidatEquipe[],
  efficacites: TableEfficacites,
): number {
  let score = 0;
  for (const typeAttaquant of Object.keys(efficacites)) {
    const subi = multiplicateurSubi(candidat.types, typeAttaquant, efficacites);
    const multiplicateurs = equipe.map((m) => multiplicateurSubi(m.types, typeAttaquant, efficacites));
    const faibles = multiplicateurs.filter((m) => m > 1).length;
    const resistants = multiplicateurs.filter((m) => m < 1).length;
    if (subi > 1) score -= 1 + 2 * faibles;
    else if (subi < 1 && faibles > resistants) score += 2;
  }
  return score;
}

/**
 * Propose une équipe parmi les candidats (les Pokémon capturés) : les épinglés d'abord,
 * puis, tour par tour, le candidat qui maximise force + équilibre défensif.
 * Un seul membre par famille d'évolution ; les non évolués et les exclus ne sont pas proposés.
 */
export function proposerEquipe(
  candidats: readonly CandidatEquipe[],
  choix: ChoixEquipe,
  efficacites: TableEfficacites,
): CandidatEquipe[] {
  const parSlug = new Map(candidats.map((c) => [c.slug, c]));
  const equipe: CandidatEquipe[] = [];
  const familles = new Set<string>();
  for (const slug of choix.epingles) {
    const candidat = parSlug.get(slug);
    if (!candidat || equipe.length >= TAILLE_EQUIPE || equipe.includes(candidat)) continue;
    equipe.push(candidat);
    familles.add(candidat.famille);
  }

  const exclus = new Set(choix.exclus);
  const disponibles = candidats.filter(
    (c) => c.tier !== null && !estNonEvolue(c.tier) && !exclus.has(c.slug),
  );
  while (equipe.length < TAILLE_EQUIPE) {
    let meilleur: { candidat: CandidatEquipe; score: number } | null = null;
    for (const candidat of disponibles) {
      if (familles.has(candidat.famille) || equipe.includes(candidat)) continue;
      const score = force(candidat) + equilibre(candidat, equipe, efficacites);
      if (!meilleur || score > meilleur.score) meilleur = { candidat, score };
    }
    if (!meilleur) break;
    equipe.push(meilleur.candidat);
    familles.add(meilleur.candidat.famille);
  }
  return equipe;
}

export interface BilanType {
  typeAttaquant: string;
  /** Multiplicateur subi par chaque membre, dans l'ordre de l'équipe. */
  multiplicateurs: number[];
  faibles: number;
  resistants: number;
}

/** Faiblesses et résistances de l'équipe, type par type. */
export function bilanDefensif(
  equipe: readonly Pick<CandidatEquipe, "types">[],
  efficacites: TableEfficacites,
): BilanType[] {
  return Object.keys(efficacites)
    .sort()
    .map((typeAttaquant) => {
      const multiplicateurs = equipe.map((m) => multiplicateurSubi(m.types, typeAttaquant, efficacites));
      return {
        typeAttaquant,
        multiplicateurs,
        faibles: multiplicateurs.filter((m) => m > 1).length,
        resistants: multiplicateurs.filter((m) => m < 1).length,
      };
    });
}

/** Épingle un Pokémon (et le retire des exclus), ou le désépingle. */
export function basculerEpingle(choix: ChoixEquipe, slug: string): ChoixEquipe {
  if (choix.epingles.includes(slug)) {
    return { ...choix, epingles: choix.epingles.filter((s) => s !== slug) };
  }
  if (choix.epingles.length >= TAILLE_EQUIPE) return choix;
  return {
    epingles: [...choix.epingles, slug],
    exclus: choix.exclus.filter((s) => s !== slug),
  };
}

/** Exclut un Pokémon des propositions (et le désépingle), ou lève l'exclusion. */
export function basculerExclusion(choix: ChoixEquipe, slug: string): ChoixEquipe {
  if (choix.exclus.includes(slug)) {
    return { ...choix, exclus: choix.exclus.filter((s) => s !== slug) };
  }
  return {
    epingles: choix.epingles.filter((s) => s !== slug),
    exclus: [...choix.exclus, slug],
  };
}
