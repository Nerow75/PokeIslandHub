// scripts/cobblemon/plantes.test.ts

import { describe, expect, it } from "vitest";
import { listerPlantesCobblemon } from "./plantes.ts";

describe("listerPlantesCobblemon", () => {
  const traductions = {
    "item.cobblemon.red_apricorn": "Noigrume Rouge",
    "item.cobblemon.black_apricorn": "Noigrume Noir",
    "item.cobblemon.red_apricorn_seed": "Graine de Noigrume Rouge",
    "block.cobblemon.red_apricorn": "Noigrume Rouge",
    "item.cobblemon.oran_berry": "Baie Oran",
    "item.cobblemon.aguav_berry": "Baie Gowav",
  };

  it("garde les seuls noigrumes et les baies plantables, triés par nom français", () => {
    const { noigrumes, baies, sansNom } = listerPlantesCobblemon(traductions, [
      "oran_berry",
      "aguav_berry",
    ]);
    expect(noigrumes).toEqual([
      { id: "cobblemon:black_apricorn", nomFr: "Noigrume Noir" },
      { id: "cobblemon:red_apricorn", nomFr: "Noigrume Rouge" },
    ]);
    expect(baies).toEqual([
      { id: "cobblemon:aguav_berry", nomFr: "Baie Gowav" },
      { id: "cobblemon:oran_berry", nomFr: "Baie Oran" },
    ]);
    expect(sansNom).toEqual([]);
  });

  it("signale une baie sans traduction au lieu d'inventer son nom", () => {
    const { baies, sansNom } = listerPlantesCobblemon(traductions, ["hopo_berry"]);
    expect(baies).toEqual([]);
    expect(sansNom).toEqual(["hopo_berry"]);
  });
});
