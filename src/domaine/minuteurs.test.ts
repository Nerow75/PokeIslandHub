// src/domaine/minuteurs.test.ts

import { describe, expect, it } from "vitest";
import {
  attenteAvantPassage,
  estDisponible,
  formaterAttente,
  minuteursParDefaut,
  normaliserUrl,
  nouveauMinuteur,
  prochainPassage,
  type Minuteur,
} from "./minuteurs.ts";

const vote2h: Minuteur = {
  id: "vote-2h",
  nom: "Vote 2 h",
  categorie: "vote",
  url: null,
  delaiMinutes: 120,
  dernier: "2026-10-01T18:00:00.000Z",
};

describe("minuteurs", () => {
  it("propose les votes, les dresseurs (4 h) et les PokéStops des huit lieux du serveur (1 h)", () => {
    const parDefaut = minuteursParDefaut();
    expect(parDefaut.map((m) => [m.categorie, m.delaiMinutes])).toEqual([
      ["vote", 120],
      ["vote", 1440],
      ["dresseur", 240],
      ["dresseur", 240],
      ["pokestop", 60],
      ...Array.from({ length: 7 }, () => ["pokestop", 60]),
    ]);
    expect(new Set(parDefaut.map((m) => m.id)).size).toBe(parDefaut.length);
  });

  it("calcule le prochain passage à partir du dernier", () => {
    expect(prochainPassage(vote2h)?.toISOString()).toBe("2026-10-01T20:00:00.000Z");
    expect(prochainPassage({ ...vote2h, dernier: null })).toBeNull();
  });

  it("décompte le temps avant de pouvoir refaire l'action", () => {
    const maintenant = new Date("2026-10-01T18:17:53.000Z");
    expect(formaterAttente(attenteAvantPassage(vote2h, maintenant))).toBe("1:42:07");
    expect(estDisponible(vote2h, maintenant)).toBe(false);
  });

  it("devient disponible une fois le délai écoulé ou sans passage enregistré", () => {
    expect(estDisponible(vote2h, new Date("2026-10-01T20:00:00.000Z"))).toBe(true);
    expect(estDisponible({ ...vote2h, dernier: null }, new Date())).toBe(true);
  });

  it("affiche minutes et secondes sous une heure", () => {
    expect(formaterAttente(42 * 60_000 + 7_000)).toBe("42:07");
  });

  it("crée un nouveau dresseur avec le délai de sa catégorie", () => {
    const dresseur = nouveauMinuteur("dresseur", new Date("2026-10-04T12:00:00.000Z"));
    expect(dresseur).toMatchObject({ categorie: "dresseur", delaiMinutes: 240, dernier: null });
    expect(dresseur.id.startsWith("dresseur-")).toBe(true);
  });
});

describe("normaliserUrl", () => {
  it("accepte un lien http(s) et complète le protocole", () => {
    expect(normaliserUrl("serveurs-minecraft.org/vote/1234")).toBe(
      "https://serveurs-minecraft.org/vote/1234",
    );
    expect(normaliserUrl("http://exemple.fr")).toBe("http://exemple.fr/");
  });

  it("refuse les liens dangereux ou vides", () => {
    expect(normaliserUrl("javascript:alert(1)")).toBeNull();
    expect(normaliserUrl("   ")).toBeNull();
  });
});
