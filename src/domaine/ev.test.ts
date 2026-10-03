// src/domaine/ev.test.ts

import { describe, expect, it } from "vitest";
import { resumeEv } from "./ev.ts";

const aucun = { pv: 0, attaque: 0, defense: 0, attaqueSpeciale: 0, defenseSpeciale: 0, vitesse: 0 };

describe("resumeEv", () => {
  it("abrège les EV rapportés dans l'ordre des statistiques", () => {
    expect(resumeEv({ ...aucun, vitesse: 2 })).toBe("+2 Vit");
    expect(resumeEv({ ...aucun, defense: 1, pv: 1 })).toBe("+1 PV +1 Déf");
  });

  it("reste vide sans EV", () => {
    expect(resumeEv(aucun)).toBe("");
  });
});
