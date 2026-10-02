// scripts/strategie/parse.test.ts

import { describe, expect, it } from "vitest";
import { cleEspece } from "../cobblemon/parse.ts";
import {
  choisirSets,
  choisirTiers,
  convertirSet,
  convertirUsage,
  objetsDeFormeSpeciale,
  ordreFormats,
  schemaDetailCoupCritique,
  tableEfficacites,
  tableTraductions,
  typesCapacitesOffensives,
  type FichierSetsSmogon,
} from "./parse.ts";

const slugParCle = new Map(
  ["garchomp", "beedrill", "mr-mime", "venusaur"].map((slug) => [cleEspece(slug), slug]),
);

describe("choisirTiers", () => {
  const listes = [
    {
      generation: 9,
      pokemons: [
        { id: 7050, name: "Garchomp", tier: { shortName: "UUBL" } },
        { id: 7839, name: "Garchomp-Mega", tier: { shortName: "Untiered" } },
        { id: 7664, name: "Beedrill", tier: { shortName: "Untiered" } },
      ],
    },
    {
      generation: 7,
      pokemons: [
        { id: 3144, name: "Beedrill", tier: { shortName: "ZU" } },
        { id: 3000, name: "Garchomp", tier: { shortName: "OU" } },
        { id: 3001, name: "Mr. Mime", tier: { shortName: "PU" } },
      ],
    },
  ];
  const tiers = choisirTiers(listes, slugParCle);

  it("retient le tier de la génération la plus récente", () => {
    expect(tiers.get("garchomp")).toEqual({
      tier: "UUBL",
      generation: 9,
      idCoupCritique: 7050,
    });
  });

  it("remonte à une génération antérieure pour un Pokémon non classé", () => {
    expect(tiers.get("beedrill")).toEqual({
      tier: "ZU",
      generation: 7,
      idCoupCritique: 3144,
    });
  });

  it("rapproche les noms Showdown des slugs PokeAPI et ignore les formes", () => {
    expect(tiers.get("mr-mime")?.tier).toBe("PU");
    expect(tiers.size).toBe(3);
  });
});

describe("convertirSet", () => {
  it("normalise capacités, objets, EV et IV d'un set Smogon", () => {
    const set = convertirSet("Sun Sweeper", "uu", 9, {
      moves: ["Growth", ["Giga Drain", "Solar Beam"]],
      ability: "Chlorophyll",
      item: ["Life Orb", "Heat Rock"],
      nature: "Timid",
      ivs: { atk: 0 },
      evs: [{ spa: 252, spe: 252, def: 4 }, { hp: 252 }],
      teratypes: "Fire",
    });
    expect(set).toEqual({
      nom: "Sun Sweeper",
      format: "uu",
      generation: 9,
      capacites: [["Growth"], ["Giga Drain", "Solar Beam"]],
      talents: ["Chlorophyll"],
      objets: ["Life Orb", "Heat Rock"],
      natures: ["Timid"],
      evs: { def: 4, spa: 252, spe: 252 },
      ivs: { atk: 0 },
      teras: ["Fire"],
    });
  });

  it("écarte les sets qui exigent une Méga-Gemme ou un cristal Z", () => {
    const interdits = objetsDeFormeSpeciale(
      [
        [
          {
            id: 1,
            name: "Beedrill-Mega",
            tier: null,
            requiredItem: { name: "Beedrillite" },
          },
          {
            id: 2,
            name: "Zacian-Crowned",
            tier: null,
            requiredItem: { name: "Rusted Sword" },
          },
        ],
      ],
      ["Dragonium Z", "Leftovers"],
    );
    expect([...interdits].sort()).toEqual(["Beedrillite", "Dragonium Z"]);
    const brut = { moves: ["U-turn"], item: "Beedrillite" };
    expect(convertirSet("Méga", "ou", 9, brut, interdits)).toBeNull();
    const mixte = { moves: ["Earthquake"], item: ["Dragonium Z", "Leftovers"] };
    expect(convertirSet("Mixte", "ou", 7, mixte, interdits)?.objets).toEqual(["Leftovers"]);
  });

  it("rejette un set sans capacités", () => {
    expect(convertirSet("Vide", "ou", 9, { ability: "Levitate" })).toBeNull();
  });
});

describe("ordreFormats", () => {
  it("consulte d'abord le format du tier, puis les autres formats solo", () => {
    const ordre = ordreFormats("RU");
    expect(ordre[0]).toBe("ru");
    expect(ordre.filter((f) => f === "ru")).toHaveLength(1);
    expect(ordre).not.toContain("doublesou");
  });
});

describe("choisirSets", () => {
  const set = (nom: string) => ({ moves: [nom], ability: "Rough Skin" });
  const gen9: FichierSetsSmogon = {
    Garchomp: {
      ou: { TankChomp: set("Spikes") },
      vgc2025: { Doubles: set("Protect") },
      ubersuu: { "Scale Shot": set("Scale Shot") },
    },
    Venusaur: { stabmons: { Gadget: set("Growth") } },
  };
  const gen8: FichierSetsSmogon = {
    Garchomp: { ou: { Ancien: set("Outrage") } },
    Venusaur: { ou: { Soleil: set("Weather Ball") } },
    Beedrill: { zu: { Offensif: set("U-turn") } },
  };
  const sets = choisirSets(
    [
      { generation: 9, sets: gen9 },
      { generation: 8, sets: gen8 },
    ],
    slugParCle,
    (slug) => (slug === "garchomp" ? "OU" : null),
  );

  it("prend la génération la plus récente, format du tier en premier", () => {
    expect(sets.get("garchomp")?.map((s) => [s.nom, s.generation])).toEqual([
      ["TankChomp", 9],
      ["Scale Shot", 9],
    ]);
  });

  it("ignore les formats doubles et à règles spéciales", () => {
    expect(sets.get("garchomp")?.some((s) => s.nom === "Doubles")).toBe(false);
    expect(sets.get("venusaur")?.map((s) => s.nom)).toEqual(["Soleil"]);
  });

  it("garde les Pokémon qui n'existent que dans une génération ancienne", () => {
    expect(sets.get("beedrill")?.[0]?.generation).toBe(8);
  });
});

describe("convertirUsage", () => {
  const nom = (name: string) => ({ name, nom: null });
  const usage = (tier: string, provider: string, percent: number) => ({
    provider,
    tier: { shortName: tier },
    rank: 12,
    percent,
    usageAbilities: [{ ability: nom("Rough Skin"), percent: 100 }],
    usageItems: [
      { item: nom("Rocky Helmet"), percent: 62.26 },
      { item: nom("Rare"), percent: 0.4 },
    ],
    usageTeras: [],
    usageMoves: [{ move: nom("Earthquake"), percent: 98.22 }],
    usageSpreads: [
      {
        nature: nom("Impish"),
        evs: { hp: 248, atk: 0, def: 216, spa: 0, spd: 0, spe: 44 },
        percent: 21.36,
      },
    ],
  });
  const detail = schemaDetailCoupCritique.parse({
    usages: [
      usage("Champions Duo", "champions", 40),
      usage("Mono", "showdown", 30),
      usage("OU", "showdown", 5.369),
    ],
  });

  it("prend le tier supérieur pour un Pokémon BL et ignore les formats non solo", () => {
    expect(convertirUsage(detail, "UUBL")).toMatchObject({
      tier: "OU",
      rang: 12,
      pourcentage: 5.37,
      objets: [{ nom: "Rocky Helmet", pourcentage: 62.3 }],
      spreads: [
        {
          nature: "Impish",
          evs: { hp: 248, def: 216, spe: 44 },
          pourcentage: 21.4,
        },
      ],
    });
  });

  it("retourne null sans statistique solo", () => {
    expect(convertirUsage({ usages: [] }, "OU")).toBeNull();
  });
});

describe("tables", () => {
  it("garde la première traduction connue, de la génération la plus récente", () => {
    const table = tableTraductions([
      [
        { name: "Return", nom: "Retour" },
        { name: "Hidden Power Bug", nom: null },
      ],
      [
        { name: "Return", nom: "Ancien" },
        { name: "Hidden Power Bug", nom: "Puissance Cachée" },
      ],
    ]);
    expect(table).toEqual({
      Return: "Retour",
      "Hidden Power Bug": "Puissance Cachée",
    });
  });

  it("garde le type des seules capacités offensives utiles, génération récente d'abord", () => {
    const capacite = (name: string, category: "Physical" | "Special" | "Status", type: string) => ({
      name,
      category,
      type: { name: type },
    });
    const table = typesCapacitesOffensives(
      [
        [
          capacite("Earthquake", "Physical", "Ground"),
          capacite("Swords Dance", "Status", "Normal"),
        ],
        [
          capacite("Earthquake", "Physical", "Rock"),
          capacite("Hidden Power Fire", "Special", "Fire"),
        ],
      ],
      new Set(["Earthquake", "Swords Dance", "Hidden Power Fire"]),
    );
    expect(table).toEqual({
      Earthquake: "ground",
      "Hidden Power Fire": "fire",
    });
  });

  it("construit l'efficacité attaquant -> défenseur sans le type Stellaire", () => {
    const efficacites = tableEfficacites([
      {
        name: "Dragon",
        nom: "Dragon",
        weaknesses: [
          { type_attacker: { name: "Fairy", nom: "Fée" }, ratio: 2 },
          { type_attacker: { name: "Stellar", nom: "Stellaire" }, ratio: 1 },
        ],
      },
      { name: "Stellar", nom: "Stellaire", weaknesses: [] },
    ]);
    expect(efficacites).toEqual({ fairy: { dragon: 2 } });
  });
});
