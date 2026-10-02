// src/domaine/stockageFichierClient.ts

import { lireSauvegarde, serialiserSauvegarde, type Sauvegarde } from "./sauvegarde.ts";

/* Côté navigateur : dialogue avec le plugin Vite qui lit / écrit donnees/sauvegarde.json. */

const ROUTE_SAUVEGARDE = "/api/sauvegarde";

export type ChargementFichier =
  | { etat: "trouvee"; sauvegarde: Sauvegarde }
  | { etat: "absente"; avertissement: string | null }
  /** Pas de serveur de dev (build statique) ou réponse inattendue. */
  | { etat: "indisponible" };

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null;
}

/** Page ouverte comme fichier (version portable) : aucun serveur à interroger. */
function estOuverteCommeFichier(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "file:";
}

export async function chargerSauvegardeFichier(): Promise<ChargementFichier> {
  if (estOuverteCommeFichier()) return { etat: "indisponible" };
  let corps: unknown;
  try {
    const reponse = await fetch(ROUTE_SAUVEGARDE, { cache: "no-store" });
    if (!reponse.ok || !reponse.headers.get("Content-Type")?.includes("application/json")) {
      return { etat: "indisponible" };
    }
    corps = await reponse.json();
  } catch {
    return { etat: "indisponible" };
  }
  if (!estObjet(corps)) {
    return { etat: "indisponible" };
  }
  if (corps["etat"] === "trouvee") {
    /* Revalidé ici aussi : le client ne fait pas confiance à une réponse non vérifiée. */
    const resultat = lireSauvegarde(corps["sauvegarde"]);
    return resultat.succes
      ? { etat: "trouvee", sauvegarde: resultat.sauvegarde }
      : { etat: "indisponible" };
  }
  if (corps["etat"] === "illisible") {
    return {
      etat: "absente",
      avertissement: `Fichier de sauvegarde illisible, mis de côté sous donnees/${String(corps["copie"])}. La progression du navigateur le remplace.`,
    };
  }
  if (corps["etat"] === "absente") {
    return { etat: "absente", avertissement: null };
  }
  return { etat: "indisponible" };
}

/** Envoie la sauvegarde au fichier. `keepalive` permet l'envoi pendant la fermeture de l'onglet. */
export async function enregistrerSauvegardeFichier(
  sauvegarde: Sauvegarde,
  options: { keepalive?: boolean } = {},
): Promise<boolean> {
  try {
    const reponse = await fetch(ROUTE_SAUVEGARDE, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: serialiserSauvegarde(sauvegarde),
      keepalive: options.keepalive ?? false,
    });
    return reponse.ok;
  } catch {
    return false;
  }
}
