// serveur/pluginSauvegarde.ts

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";
import { creerStockageFichier } from "./stockageFichier.ts";

export const ROUTE_SAUVEGARDE = "/api/sauvegarde";
const TAILLE_MAX_OCTETS = 5 * 1024 * 1024;

function lireCorps(requete: IncomingMessage): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    let taille = 0;
    const morceaux: Buffer[] = [];
    requete.on("data", (morceau: Buffer) => {
      taille += morceau.length;
      if (taille > TAILLE_MAX_OCTETS) {
        rejeter(new Error("Sauvegarde trop volumineuse."));
        requete.destroy();
        return;
      }
      morceaux.push(morceau);
    });
    requete.on("end", () => resoudre(Buffer.concat(morceaux).toString("utf8")));
    requete.on("error", rejeter);
  });
}

function repondreJson(reponse: ServerResponse, statut: number, corps: unknown): void {
  reponse.statusCode = statut;
  reponse.setHeader("Content-Type", "application/json; charset=utf-8");
  reponse.end(JSON.stringify(corps));
}

/**
 * Expose GET / PUT /api/sauvegarde pendant `npm run dev` et `npm run preview` :
 * la progression est lue et écrite dans `dossier`/sauvegarde.json.
 */
export function pluginSauvegarde(dossier: string): Plugin {
  const stockage = creerStockageFichier(dossier);

  /* Écritures sérialisées : deux requêtes rapprochées ne s'entremêlent jamais. */
  let fileEcritures: Promise<unknown> = Promise.resolve();

  const middleware: Connect.NextHandleFunction = (requete, reponse, suivant) => {
    if (requete.url?.split("?")[0] !== ROUTE_SAUVEGARDE) {
      suivant();
      return;
    }
    const traiter = async (): Promise<void> => {
      if (requete.method === "GET") {
        repondreJson(reponse, 200, await stockage.lire());
        return;
      }
      if (requete.method === "PUT") {
        let donnees: unknown;
        try {
          donnees = JSON.parse(await lireCorps(requete));
        } catch {
          repondreJson(reponse, 400, { succes: false, erreur: "Corps JSON invalide." });
          return;
        }
        const ecriture = fileEcritures.then(() => stockage.ecrire(donnees));
        fileEcritures = ecriture.catch(() => undefined);
        const resultat = await ecriture;
        repondreJson(reponse, resultat.succes ? 200 : 400, resultat);
        return;
      }
      repondreJson(reponse, 405, { succes: false, erreur: "Méthode non prise en charge." });
    };
    traiter().catch((erreur: unknown) => {
      repondreJson(reponse, 500, {
        succes: false,
        erreur: erreur instanceof Error ? erreur.message : "Erreur d'écriture.",
      });
    });
  };

  return {
    name: "pokeislandhub-sauvegarde",
    configureServer(serveur) {
      serveur.middlewares.use(middleware);
    },
    configurePreviewServer(serveur) {
      serveur.middlewares.use(middleware);
    },
  };
}
