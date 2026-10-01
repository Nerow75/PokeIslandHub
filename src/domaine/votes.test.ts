// src/domaine/votes.test.ts

import { describe, expect, it } from "vitest";
import {
  attenteAvantVote,
  estVoteDisponible,
  formaterAttente,
  normaliserUrlVote,
  prochainVote,
  votesParDefaut,
  type Vote,
} from "./votes.ts";

const vote2h: Vote = {
  id: "vote-2h",
  nom: "Vote 2 h",
  url: null,
  delaiMinutes: 120,
  dernierVote: "2026-10-01T18:00:00.000Z",
};

describe("votes", () => {
  it("propose par défaut un vote de 2 h et un de 24 h", () => {
    expect(votesParDefaut().map((v) => v.delaiMinutes)).toEqual([120, 1440]);
  });

  it("calcule le prochain vote à partir du dernier", () => {
    expect(prochainVote(vote2h)?.toISOString()).toBe("2026-10-01T20:00:00.000Z");
    expect(prochainVote({ ...vote2h, dernierVote: null })).toBeNull();
  });

  it("décompte le temps avant de revoter", () => {
    const maintenant = new Date("2026-10-01T18:17:53.000Z");
    expect(formaterAttente(attenteAvantVote(vote2h, maintenant))).toBe("1:42:07");
    expect(estVoteDisponible(vote2h, maintenant)).toBe(false);
  });

  it("devient disponible une fois le délai écoulé ou sans vote enregistré", () => {
    expect(estVoteDisponible(vote2h, new Date("2026-10-01T20:00:00.000Z"))).toBe(true);
    expect(estVoteDisponible({ ...vote2h, dernierVote: null }, new Date())).toBe(true);
  });

  it("affiche minutes et secondes sous une heure", () => {
    expect(formaterAttente(42 * 60_000 + 7_000)).toBe("42:07");
  });
});

describe("normaliserUrlVote", () => {
  it("accepte un lien http(s) et complète le protocole", () => {
    expect(normaliserUrlVote("serveurs-minecraft.org/vote/1234")).toBe(
      "https://serveurs-minecraft.org/vote/1234",
    );
    expect(normaliserUrlVote("http://exemple.fr")).toBe("http://exemple.fr/");
  });

  it("refuse les liens dangereux ou vides", () => {
    expect(normaliserUrlVote("javascript:alert(1)")).toBeNull();
    expect(normaliserUrlVote("   ")).toBeNull();
  });
});
