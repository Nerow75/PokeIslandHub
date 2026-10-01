// src/domaine/preferences.ts

/* Préférences propres à ce navigateur (hors sauvegarde) : les notifications dépendent de ses autorisations. */
const CLE_NOTIFICATIONS = "pokeislandhub:notifier-votes";

export function lirePreferenceNotifications(): boolean {
  try {
    return localStorage.getItem(CLE_NOTIFICATIONS) === "1";
  } catch {
    return false;
  }
}

export function enregistrerPreferenceNotifications(estActive: boolean): void {
  try {
    localStorage.setItem(CLE_NOTIFICATIONS, estActive ? "1" : "0");
  } catch {
    /* Préférence non mémorisée : sans conséquence. */
  }
}

export function notificationsDisponibles(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}
