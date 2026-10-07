"use client";

import { FileText, Printer, Sparkles } from "lucide-react";
import styles from "../profile.module.scss";

interface MasterResumeBannerProps {
  onOpen: () => void;
  onPrint: () => void;
  onSync: () => void;
}

export function MasterResumeBanner({
  onOpen,
  onPrint,
  onSync,
}: MasterResumeBannerProps) {
  return (
    <div className={`${styles.masterResumeCard} no-print`}>
      <div className={styles.masterResumeInfo}>
        <div className={styles.badge}>Documento Consolidado</div>
        <h3>Currículo Master Abrangente</h3>
        <p>
          Versão executiva completa baseada no seu perfil, estruturada com os
          pontos mais importantes e formatação limpa 100% pronta para triagem
          ATS.
        </p>
      </div>
      <div className={styles.masterResumeActions}>
        <button
          type="button"
          className={styles.viewResumeButton}
          onClick={onOpen}
        >
          <FileText size={16} />
          <span>Visualizar Currículo Master</span>
        </button>
        <button
          type="button"
          className={styles.downloadResumeButton}
          onClick={onPrint}
        >
          <Printer size={16} />
          <span>Baixar / PDF</span>
        </button>
        <button
          type="button"
          className={styles.syncResumeButton}
          onClick={onSync}
        >
          <Sparkles size={16} />
          <span>Gerar Novamente</span>
        </button>
      </div>
    </div>
  );
}
