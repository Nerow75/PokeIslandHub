// scripts/generate-apparitions.ts

/*
 * Génère src/data/apparitions.json depuis les fichiers spawn_pool_world de Cobblemon
 * (dépôt officiel GitLab). Les apparitions de groupe ("herds") ne sont pas reprises.
 *
 * Usage : npm run generate:apparitions
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ApparitionsGenerees } from "../src/types/apparitions.ts";
import type { PokedexGenere } from "../src/types/pokedex.ts";
import { fichiersJsonCobblemon, RACINE_PROJET, VERSION_COBBLEMON } from "./cobblemon/archive.ts";
import {
  cleEspece,
  regrouperParEspece,
  schemaFichierApparitions,
  type FichierApparitions,
} from "./cobblemon/parse.ts";

const FICHIER_POKEDEX = join(RACINE_PROJET, "src", "data", "pokedex.json");
const FICHIER_SORTIE = join(RACINE_PROJET, "src", "data", "apparitions.json");

async function generer(): Promise<void> {
  const chemins = (await fichiersJsonCobblemon("spawn_pool_world")).filter(
    (chemin) => !chemin.replaceAll("\\", "/").includes("/herds/"),
  );

  const fichiers: FichierApparitions[] = [];
  for (const chemin of chemins) {
    const resultat = schemaFichierApparitions.safeParse(JSON.parse(await readFile(chemin, "utf8")));
    if (!resultat.success) {
      throw new Error(`Fichier d'apparition inattendu : ${chemin}\n${resultat.error.message}`);
    }
    fichiers.push(resultat.data);
  }

  const pokedex = JSON.parse(await readFile(FICHIER_POKEDEX, "utf8")) as PokedexGenere;
  const slugParCle = new Map(pokedex.especes.map((e) => [cleEspece(e.slug), e.slug]));
  const { parEspece, inconnues } = regrouperParEspece(fichiers, slugParCle);

  if (inconnues.length > 0) {
    process.stdout.write(
      `Attention : espèces Cobblemon sans correspondance : ${inconnues.join(", ")}\n`,
    );
  }

  const sortie: ApparitionsGenerees = {
    versionCobblemon: VERSION_COBBLEMON,
    genereLe: new Date().toISOString(),
    parEspece,
  };
  await writeFile(FICHIER_SORTIE, `${JSON.stringify(sortie)}\n`);
  process.stdout.write(
    `${fichiers.length} fichiers lus, ${Object.keys(parEspece).length} espèces avec apparitions écrites dans src/data/apparitions.json\n`,
  );
}

await generer();
