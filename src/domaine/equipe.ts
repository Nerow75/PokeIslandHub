// src/domaine/equipe.ts

/*
 * Classement des Pokémon capturés par tier Smogon et proposition d'équipes de six :
 * force des membres, faiblesses partagées et couverture offensive.
 * Fonctions pures : les données viennent de strategie.json.
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

export type TierSmogon = (typeof ORDRE_TIERS)[number];

/** Signification de chaque tier Smogon, du plus fort au plus faible. */
export const DESCRIPTIONS_TIERS: Record<TierSmogon, { nom: string; description: string }> = {
  AG: { nom: "Anything Goes", description: "tout est permis : les plus forts de tous" },
  Uber: { nom: "Uber", description: "légendaires et monstres trop puissants pour l'OU" },
  OU: { nom: "OverUsed", description: "les meilleurs du jeu standard, les plus joués" },
  UUBL: { nom: "UU BorderLine", description: "trop forts pour l'UU, juste sous l'OU" },
  UU: { nom: "UnderUsed", description: "solides, un cran sous l'OU" },
  RUBL: { nom: "RU BorderLine", description: "trop forts pour le RU, juste sous l'UU" },
  RU: { nom: "RarelyUsed", description: "corrects, un cran sous l'UU" },
  NUBL: { nom: "NU BorderLine", description: "trop forts pour le NU, juste sous le RU" },
  NU: { nom: "NeverUsed", description: "moyens, un cran sous le RU" },
  PUBL: { nom: "PU BorderLine", description: "trop forts pour le PU, juste sous le NU" },
  PU: { nom: "PU", description: "faibles, un cran sous le NU" },
  ZUBL: { nom: "ZU BorderLine", description: "trop forts pour le ZU, juste sous le PU" },
  ZU: { nom: "ZeroUsed", description: "les plus faibles des Pokémon évolués" },
  NFE: { nom: "Not Fully Evolved", description: "peut encore évoluer" },
  LC: { nom: "Little Cup", description: "premier stade d'évolution" },
};

/** "OU : OverUsed, les meilleurs du jeu standard (3e sur 15)" ; null si tier inconnu. */
export function expliquerTier(tier: string | null): string | null {
  const rang = rangTier(tier);
  const cle = ORDRE_TIERS[rang];
  if (!cle) return null;
  const { nom, description } = DESCRIPTIONS_TIERS[cle];
  return `${cle} : ${nom}, ${description} (${rang + 1}e sur ${ORDRE_TIERS.length}, du plus fort au plus faible)`;
}

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
  /** Types des capacités offensives du build conseillé (à défaut, les types du Pokémon). */
  typesAttaque: readonly string[];
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

/** Meilleur multiplicateur infligé à un Pokémon de type pur, parmi les types d'attaque donnés. */
export function multiplicateurInflige(
  typesAttaque: readonly string[],
  typeDefenseur: string,
  efficacites: TableEfficacites,
): number {
  if (typesAttaque.length === 0) return 1;
  return Math.max(...typesAttaque.map((type) => efficacites[type]?.[typeDefenseur] ?? 1));
}

/** Tous les types connus de la table, attaquants comme défenseurs, triés. */
function tousLesTypes(efficacites: TableEfficacites): string[] {
  const types = new Set(Object.keys(efficacites));
  for (const ligne of Object.values(efficacites)) Object.keys(ligne).forEach((t) => types.add(t));
  return [...types].sort();
}

/** Classe les candidats du plus fort au plus faible : tier, puis usage. */
export function classerParForce<T extends Pick<CandidatEquipe, "tier" | "pourcentageUsage">>(
  candidats: readonly T[],
): T[] {
  return [...candidats].sort(
    (a, b) => rangTier(a.tier) - rangTier(b.tier) || b.pourcentageUsage - a.pourcentageUsage,
  );
}

/*
 * Barème du score d'une équipe. Un tier d'écart vaut 4 points par membre ;
 * l'usage départage au sein d'un tier. En défense, chaque type qui touche plus de membres
 * qu'il n'en trouve pour résister coûte, davantage s'il en touche trois ou plus.
 * En attaque, chaque type touché en super efficace rapporte, chaque type mal couvert coûte :
 * les arènes, souvent d'un seul type, punissent une équipe qui ne sait pas les frapper.
 */
const POINTS_PAR_TIER = 4;
const PENALITE_FAIBLESSE_NETTE = 3;
const PENALITE_FAIBLESSE_EMPILEE = 4;
const PENALITE_DOUBLE_FAIBLESSE = 2;
const BONUS_TYPE_COUVERT = 3;
const PENALITE_TYPE_NEUTRE = 2;
const PENALITE_TYPE_RESISTE = 4;

function force(candidat: CandidatEquipe): number {
  return (
    (ORDRE_TIERS.length - rangTier(candidat.tier)) * POINTS_PAR_TIER +
    Math.min(candidat.pourcentageUsage, 50) / 25
  );
}

export interface EvaluationEquipe {
  score: number;
  /** Types d'attaque qui touchent au moins deux membres, et plus de membres qu'ils n'en trouvent pour résister. */
  faiblessesPartagees: string[];
  /** Types qu'aucun membre ne touche en super efficace. */
  typesNonCouverts: string[];
}

/** Profil précalculé d'un candidat : multiplicateurs subis et infligés, type par type. */
interface Profil {
  candidat: CandidatEquipe;
  force: number;
  subis: number[];
  inflige: number[];
}

function profil(
  candidat: CandidatEquipe,
  types: readonly string[],
  efficacites: TableEfficacites,
): Profil {
  return {
    candidat,
    force: force(candidat),
    subis: types.map((t) => multiplicateurSubi(candidat.types, t, efficacites)),
    inflige: types.map((t) => multiplicateurInflige(candidat.typesAttaque, t, efficacites)),
  };
}

function evaluerProfils(membres: readonly Profil[], types: readonly string[]): EvaluationEquipe {
  let score = 0;
  const faiblessesPartagees: string[] = [];
  const typesNonCouverts: string[] = [];
  for (const membre of membres) score += membre.force;
  types.forEach((type, index) => {
    let faibles = 0;
    let resistants = 0;
    let doubles = 0;
    let meilleur = 0;
    for (const membre of membres) {
      const subi = membre.subis[index] ?? 1;
      if (subi > 1) faibles++;
      if (subi >= 4) doubles++;
      if (subi < 1) resistants++;
      meilleur = Math.max(meilleur, membre.inflige[index] ?? 1);
    }
    score -= PENALITE_FAIBLESSE_NETTE * Math.max(0, faibles - resistants);
    score -= PENALITE_FAIBLESSE_EMPILEE * Math.max(0, faibles - 2);
    score -= PENALITE_DOUBLE_FAIBLESSE * doubles;
    if (faibles >= 2 && faibles > resistants) faiblessesPartagees.push(type);
    if (meilleur >= 2) {
      score += BONUS_TYPE_COUVERT;
    } else {
      score -= meilleur < 1 ? PENALITE_TYPE_RESISTE : PENALITE_TYPE_NEUTRE;
      typesNonCouverts.push(type);
    }
  });
  return { score, faiblessesPartagees, typesNonCouverts };
}

/** Évalue une équipe : force des membres, faiblesses partagées et couverture offensive. */
export function evaluerEquipe(
  membres: readonly CandidatEquipe[],
  efficacites: TableEfficacites,
): EvaluationEquipe {
  const types = tousLesTypes(efficacites);
  return evaluerProfils(
    membres.map((m) => profil(m, types, efficacites)),
    types,
  );
}

export interface EquipeProposee {
  membres: CandidatEquipe[];
  evaluation: EvaluationEquipe;
}

function cleEquipe(membres: readonly Profil[]): string {
  return membres
    .map((m) => m.candidat.slug)
    .sort()
    .join("|");
}

/** Ajout glouton jusqu'à six membres, un par famille. */
function completer(
  depart: readonly Profil[],
  disponibles: readonly Profil[],
  types: readonly string[],
): Profil[] {
  const equipe = [...depart];
  while (equipe.length < TAILLE_EQUIPE) {
    const familles = new Set(equipe.map((m) => m.candidat.famille));
    let meilleur: { profil: Profil; score: number } | null = null;
    for (const candidat of disponibles) {
      if (familles.has(candidat.candidat.famille)) continue;
      const score = evaluerProfils([...equipe, candidat], types).score;
      if (!meilleur || score > meilleur.score) meilleur = { profil: candidat, score };
    }
    if (!meilleur) break;
    equipe.push(meilleur.profil);
  }
  return equipe;
}

/**
 * Recherche locale : remplace un membre non épinglé par un autre candidat tant que
 * l'échange améliore le score. Le meilleur échange est appliqué à chaque passe.
 */
function ameliorer(
  depart: readonly Profil[],
  nombreEpingles: number,
  disponibles: readonly Profil[],
  types: readonly string[],
): Profil[] {
  let equipe = [...depart];
  let scoreCourant = evaluerProfils(equipe, types).score;
  for (;;) {
    let meilleur: { equipe: Profil[]; score: number } | null = null;
    for (let index = nombreEpingles; index < equipe.length; index++) {
      const familles = new Set(equipe.filter((_, i) => i !== index).map((m) => m.candidat.famille));
      for (const candidat of disponibles) {
        if (familles.has(candidat.candidat.famille) || equipe.includes(candidat)) continue;
        const essai = equipe.map((m, i) => (i === index ? candidat : m));
        const score = evaluerProfils(essai, types).score;
        if (score > scoreCourant && (!meilleur || score > meilleur.score)) {
          meilleur = { equipe: essai, score };
        }
      }
    }
    if (!meilleur) return equipe;
    equipe = meilleur.equipe;
    scoreCourant = meilleur.score;
  }
}

/**
 * Propose jusqu'à `nombre` équipes parmi les candidats (les Pokémon capturés), de la meilleure
 * à la moins bonne. Les épinglés sont gardés, les autres places sont optimisées (force,
 * faiblesses partagées, couverture offensive). Un seul membre par famille ; les non évolués
 * et les exclus ne sont pas proposés. Les variantes s'obtiennent en écartant tour à tour
 * un membre de la meilleure équipe.
 */
export function proposerEquipes(
  candidats: readonly CandidatEquipe[],
  choix: ChoixEquipe,
  efficacites: TableEfficacites,
  nombre = 3,
): EquipeProposee[] {
  const types = tousLesTypes(efficacites);
  const parSlug = new Map(candidats.map((c) => [c.slug, profil(c, types, efficacites)]));
  const epingles: Profil[] = [];
  for (const slug of choix.epingles) {
    const p = parSlug.get(slug);
    if (p && epingles.length < TAILLE_EQUIPE && !epingles.includes(p)) epingles.push(p);
  }
  const exclus = new Set(choix.exclus);
  const disponibles = [...parSlug.values()].filter(
    (p) =>
      p.candidat.tier !== null &&
      !estNonEvolue(p.candidat.tier) &&
      !exclus.has(p.candidat.slug) &&
      !epingles.includes(p),
  );

  const optimiser = (pool: readonly Profil[]): Profil[] =>
    ameliorer(completer(epingles, pool, types), epingles.length, pool, types);

  const meilleure = optimiser(disponibles);
  const equipes = new Map<string, Profil[]>([[cleEquipe(meilleure), meilleure]]);
  for (const membre of meilleure.slice(epingles.length)) {
    const variante = optimiser(disponibles.filter((p) => p !== membre));
    equipes.set(cleEquipe(variante), variante);
  }
  return [...equipes.values()]
    .filter((membres) => membres.length > 0)
    .map((membres) => ({
      membres: membres.map((m) => m.candidat),
      evaluation: evaluerProfils(membres, types),
    }))
    .sort((a, b) => b.evaluation.score - a.evaluation.score)
    .slice(0, nombre);
}

export interface SuggestionCapture {
  candidat: CandidatEquipe;
  /** Slug du membre à remplacer. */
  remplace: string;
  gain: number;
  /** Faiblesses partagées que l'échange fait disparaître. */
  faiblessesComblees: string[];
  /** Types que l'échange permet de toucher en super efficace. */
  typesCouverts: string[];
}

/**
 * Pokémon à capturer pour améliorer une équipe : pour chaque candidat, meilleur échange
 * avec un membre non épinglé. Sont retenus les échanges qui améliorent le score sans
 * ajouter de trou (faiblesse partagée ou type mal couvert) : soit ils en comblent un,
 * soit ils apportent un Pokémon plus fort.
 */
export function suggererCaptures(
  equipe: EquipeProposee,
  nombreEpingles: number,
  aCapturer: readonly CandidatEquipe[],
  efficacites: TableEfficacites,
  nombre = 6,
): SuggestionCapture[] {
  const { membres, evaluation: avant } = equipe;
  const types = tousLesTypes(efficacites);
  const profils = membres.map((m) => profil(m, types, efficacites));
  const suggestions: SuggestionCapture[] = [];
  for (const candidat of aCapturer) {
    if (candidat.tier === null || estNonEvolue(candidat.tier)) continue;
    const profilCandidat = profil(candidat, types, efficacites);
    let meilleure: SuggestionCapture | null = null;
    for (let index = nombreEpingles; index < membres.length; index++) {
      const autres = membres.filter((_, i) => i !== index);
      if (autres.some((m) => m.famille === candidat.famille)) continue;
      const apres = evaluerProfils(
        profils.map((p, i) => (i === index ? profilCandidat : p)),
        types,
      );
      const gain = apres.score - avant.score;
      const faiblessesComblees = avant.faiblessesPartagees.filter(
        (t) => !apres.faiblessesPartagees.includes(t),
      );
      const typesCouverts = avant.typesNonCouverts.filter(
        (t) => !apres.typesNonCouverts.includes(t),
      );
      const trousAvant = avant.faiblessesPartagees.length + avant.typesNonCouverts.length;
      const trousApres = apres.faiblessesPartagees.length + apres.typesNonCouverts.length;
      if (gain <= 0 || trousApres > trousAvant) continue;
      if (!meilleure || gain > meilleure.gain) {
        meilleure = {
          candidat,
          remplace: membres[index]?.slug ?? "",
          gain,
          faiblessesComblees,
          typesCouverts,
        };
      }
    }
    if (meilleure) suggestions.push(meilleure);
  }
  return suggestions.sort((a, b) => b.gain - a.gain).slice(0, nombre);
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
  return tousLesTypes(efficacites).map((typeAttaquant) => {
    const multiplicateurs = equipe.map((m) =>
      multiplicateurSubi(m.types, typeAttaquant, efficacites),
    );
    return {
      typeAttaquant,
      multiplicateurs,
      faibles: multiplicateurs.filter((m) => m > 1).length,
      resistants: multiplicateurs.filter((m) => m < 1).length,
    };
  });
}

export interface CouvertureType {
  typeDefenseur: string;
  /** Meilleur multiplicateur infligé par chaque membre, dans l'ordre de l'équipe. */
  multiplicateurs: number[];
  meilleur: number;
}

/** Couverture offensive de l'équipe contre chaque type pur. */
export function bilanOffensif(
  equipe: readonly Pick<CandidatEquipe, "typesAttaque">[],
  efficacites: TableEfficacites,
): CouvertureType[] {
  return tousLesTypes(efficacites).map((typeDefenseur) => {
    const multiplicateurs = equipe.map((m) =>
      multiplicateurInflige(m.typesAttaque, typeDefenseur, efficacites),
    );
    return {
      typeDefenseur,
      multiplicateurs,
      meilleur: multiplicateurs.length > 0 ? Math.max(...multiplicateurs) : 1,
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
