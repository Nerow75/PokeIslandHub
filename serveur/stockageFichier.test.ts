// serveur/stockageFichier.test.ts

import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sauvegardeVide } from "../src/domaine/sauvegarde.ts";
import { creerStockageFichier, NOM_FICHIER } from "./stockageFichier.ts";

/* Tests sur un vrai dossier temporaire : aucune simulation du système de fichiers. */
let dossier: string;

beforeEach(async () => {
  dossier = await mkdtemp(join(tmpdir(), "pokeislandhub-"));
});

afterEach(async () => {
  await rm(dossier, { recursive: true, force: true });
});

const avecPikachu = () => ({ ...sauvegardeVide(), statuts: { pikachu: "capture" as const } });

describe("creerStockageFichier", () => {
  it("signale l'absence de fichier", async () => {
    expect(await creerStockageFichier(dossier).lire()).toEqual({ etat: "absente" });
  });

  it("écrit puis relit la sauvegarde", async () => {
    const stockage = creerStockageFichier(dossier);
    expect(await stockage.ecrire(avecPikachu())).toEqual({ succes: true });
    expect(await stockage.lire()).toEqual({ etat: "trouvee", sauvegarde: avecPikachu() });
  });

  it("refuse une sauvegarde invalide sans toucher au fichier existant", async () => {
    const stockage = creerStockageFichier(dossier);
    await stockage.ecrire(avecPikachu());
    const resultat = await stockage.ecrire({ version: 2, statuts: { pikachu: "shiny" } });
    expect(resultat.succes).toBe(false);
    expect(await stockage.lire()).toEqual({ etat: "trouvee", sauvegarde: avecPikachu() });
  });

  it("met de côté un fichier illisible au lieu de l'écraser", async () => {
    await writeFile(join(dossier, NOM_FICHIER), "{ pas du json");
    const lecture = await creerStockageFichier(dossier).lire();
    expect(lecture.etat).toBe("illisible");
    const fichiers = await readdir(dossier);
    expect(fichiers).not.toContain(NOM_FICHIER);
    const copie = fichiers.find((f) => f.startsWith("sauvegarde.illisible-"));
    expect(copie).toBeDefined();
    expect(await readFile(join(dossier, copie ?? ""), "utf8")).toBe("{ pas du json");
  });

  it("migre un fichier d'ancienne version à la lecture", async () => {
    await writeFile(
      join(dossier, NOM_FICHIER),
      JSON.stringify({
        version: 1,
        statuts: { eevee: "vu" },
        reglagesCompletion: { base: "capture", total: 1025, objectif: 20 },
      }),
    );
    const lecture = await creerStockageFichier(dossier).lire();
    expect(lecture.etat === "trouvee" && lecture.sauvegarde.version).toBe(2);
  });

  it("archive le fichier précédent dans l'historique du jour", async () => {
    const stockage = creerStockageFichier(dossier);
    await stockage.ecrire(sauvegardeVide());
    await stockage.ecrire(avecPikachu());
    const historique = await readdir(join(dossier, "historique"));
    expect(historique).toHaveLength(1);
    expect(historique[0]).toMatch(/^sauvegarde-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
