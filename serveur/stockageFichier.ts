// serveur/stockageFichier.ts

import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  lireSauvegarde,
  serialiserSauvegarde,
  type Sauvegarde,
} from "../src/domaine/sauvegarde.ts";

/*
 * Sauvegarde du joueur dans un fichier JSON du projet (dossier gitignoré).
 * Écriture atomique (fichier temporaire puis renommage) et copie quotidienne
 * dans historique/ : une écriture ratée ou un mauvais import ne détruit rien.
 */

export const NOM_FICHIER = "sauvegarde.json";
const DOSSIER_HISTORIQUE = "historique";
const COPIES_CONSERVEES = 30;

export type LectureFichier =
  | { etat: "trouvee"; sauvegarde: Sauvegarde }
  | { etat: "absente" }
  | { etat: "illisible"; copie: string; erreur: string };

export type EcritureFichier = { succes: true } | { succes: false; erreur: string };

function horodatage(date: Date): string {
  return date
    .toISOString()
    .replaceAll(":", "-")
    .replace(/\.\d+Z$/, "Z");
}

export function creerStockageFichier(dossier: string) {
  const chemin = join(dossier, NOM_FICHIER);
  const dossierHistorique = join(dossier, DOSSIER_HISTORIQUE);

  async function lire(): Promise<LectureFichier> {
    let texte: string;
    try {
      texte = await readFile(chemin, "utf8");
    } catch {
      return { etat: "absente" };
    }
    let donnees: unknown;
    try {
      donnees = JSON.parse(texte);
    } catch {
      donnees = undefined;
    }
    const resultat = lireSauvegarde(donnees);
    if (resultat.succes) {
      return { etat: "trouvee", sauvegarde: resultat.sauvegarde };
    }
    /* Fichier illisible : mis de côté, jamais écrasé. */
    const copie = `sauvegarde.illisible-${horodatage(new Date())}.json`;
    await rename(chemin, join(dossier, copie));
    return { etat: "illisible", copie, erreur: resultat.erreur };
  }

  /** Copie le fichier actuel dans historique/, une fois par jour, et purge les plus anciennes. */
  async function archiverDuJour(): Promise<void> {
    await mkdir(dossierHistorique, { recursive: true });
    const nom = `sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    const existantes = await readdir(dossierHistorique);
    if (!existantes.includes(nom)) {
      try {
        await copyFile(chemin, join(dossierHistorique, nom));
      } catch {
        /* Aucun fichier à archiver encore : premier enregistrement. */
      }
    }
    const archives = (await readdir(dossierHistorique))
      .filter((f) => f.startsWith("sauvegarde-"))
      .sort();
    for (const ancienne of archives.slice(0, Math.max(0, archives.length - COPIES_CONSERVEES))) {
      await rm(join(dossierHistorique, ancienne));
    }
  }

  async function ecrire(donnees: unknown): Promise<EcritureFichier> {
    const resultat = lireSauvegarde(donnees);
    if (!resultat.succes) {
      return resultat;
    }
    await mkdir(dossier, { recursive: true });
    await archiverDuJour();
    const temporaire = `${chemin}.tmp`;
    await writeFile(temporaire, serialiserSauvegarde(resultat.sauvegarde));
    await rename(temporaire, chemin);
    return { succes: true };
  }

  return { lire, ecrire };
}
