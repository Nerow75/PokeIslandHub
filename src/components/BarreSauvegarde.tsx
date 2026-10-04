// src/components/BarreSauvegarde.tsx

import { useRef, useState, type FC } from "react";
import type { ModeStockage, ResultatImport } from "../hooks/useSauvegarde.ts";

const LIBELLES_MODE: Record<ModeStockage, { texte: string; detail: string }> = {
  synchronisation: { texte: "Synchro…", detail: "Lecture du fichier de sauvegarde." },
  fichier: { texte: "Sauvegardé", detail: "Progression enregistrée dans donnees/sauvegarde.json." },
  navigateur: {
    texte: "Navigateur",
    detail:
      "Serveur de dev absent : progression gardée dans ce navigateur uniquement. Pensez à exporter.",
  },
};

interface BarreSauvegardeProps {
  modeStockage: ModeStockage;
  onExporter: () => string;
  onImporter: (texte: string) => ResultatImport;
}

type Message = { type: "succes" | "erreur"; texte: string };

/**
 * État de la sauvegarde dans la barre ; un clic ouvre l'export et l'import JSON.
 */
const BarreSauvegarde: FC<BarreSauvegardeProps> = ({ modeStockage, onExporter, onImporter }) => {
  const champFichier = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const handleExporter = (): void => {
    const blob = new Blob([onExporter()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `pokeislandhub-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    lien.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "succes", texte: "Sauvegarde exportée." });
  };

  const handleFichierChoisi = async (fichier: File | undefined): Promise<void> => {
    if (!fichier) {
      return;
    }
    const resultat = onImporter(await fichier.text());
    setMessage(
      resultat.succes
        ? { type: "succes", texte: `Sauvegarde "${fichier.name}" importée.` }
        : { type: "erreur", texte: `Import refusé, progression inchangée. ${resultat.erreur}` },
    );
    if (champFichier.current) {
      champFichier.current.value = "";
    }
  };

  return (
    <details className="sauvegarde">
      <summary
        className={`repere stockage stockage--${modeStockage}`}
        role="status"
        title={LIBELLES_MODE[modeStockage].detail}
      >
        <span className="stockage__point" aria-hidden="true" />
        <span className="repere__libelle">{LIBELLES_MODE[modeStockage].texte}</span>
      </summary>
      <div className="sauvegarde__menu">
        <p className="sauvegarde__detail">{LIBELLES_MODE[modeStockage].detail}</p>
        <div className="sauvegarde__actions">
          <button type="button" className="bouton" onClick={handleExporter}>
            Exporter
          </button>
          <button type="button" className="bouton" onClick={() => champFichier.current?.click()}>
            Importer
          </button>
        </div>
        <input
          ref={champFichier}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void handleFichierChoisi(e.target.files?.[0])}
        />
        {message && (
          <p
            className={`sauvegarde__message sauvegarde__message--${message.type}`}
            role={message.type === "erreur" ? "alert" : "status"}
          >
            {message.texte}
          </p>
        )}
      </div>
    </details>
  );
};

export default BarreSauvegarde;
