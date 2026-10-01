// src/domaine/pokefinder.test.ts

import { describe, expect, it } from "vitest";
import { ESPECE_PAR_NOM_NORMALISE, ESPECES_PAR_SLUG, normaliserRecherche } from "../donnees.ts";
import { chaineEspeces, decouperEnLots, estNomAVerifier, resoudreNoms } from "./pokefinder.ts";

const resoudre = (saisie: string) =>
  resoudreNoms(saisie, ESPECE_PAR_NOM_NORMALISE, normaliserRecherche);

describe("resoudreNoms", () => {
  it("traduit les noms français vers le format du champ Espèce", () => {
    const { especes, inconnus } = resoudre("Pashmilla, Mushana, Fulgudog");
    expect(chaineEspeces(especes)).toBe("Cinccino, Musharna, Boltund");
    expect(inconnus).toEqual([]);
  });

  it("tolère accents absents, casse et retours à la ligne", () => {
    const { especes } = resoudre("evoli\nSALAMECHE; m. mime");
    expect(especes.map((e) => e.slug)).toEqual(["eevee", "charmander", "mr-mime"]);
  });

  it("accepte aussi les noms anglais et ignore les doublons", () => {
    const { especes } = resoudre("Eevee, Évoli");
    expect(especes.map((e) => e.slug)).toEqual(["eevee"]);
  });

  it("distingue les deux Nidoran", () => {
    const { especes } = resoudre("Nidoran♀, Nidoran♂");
    expect(especes.map((e) => e.slug)).toEqual(["nidoran-f", "nidoran-m"]);
  });

  it("signale les noms introuvables", () => {
    expect(resoudre("Pikachu, Pikachou").inconnus).toEqual(["Pikachou"]);
  });
});

describe("estNomAVerifier", () => {
  it("signale les noms anglais avec ponctuation ou symbole", () => {
    expect(estNomAVerifier(ESPECES_PAR_SLUG.get("mr-mime")!)).toBe(true);
    expect(estNomAVerifier(ESPECES_PAR_SLUG.get("pikachu")!)).toBe(false);
  });
});

describe("decouperEnLots", () => {
  it("découpe en lots de taille fixe", () => {
    expect(decouperEnLots([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
