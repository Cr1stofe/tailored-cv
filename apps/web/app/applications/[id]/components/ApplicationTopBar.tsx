"use client";

import {
  Sparkles,
  FileCheck,
  Printer,
  ExternalLink,
  MapPin,
  Edit3,
  Save,
  X,
  Trash2,
} from "lucide-react";
import { JobApplicationDto } from "@tailored-cv/types";
import type { SupportedLanguage } from "@tailored-cv/types";
import styles from "../application-detail.module.scss";

interface ApplicationTopBarProps {
  application: JobApplicationDto;
  isEditingResume: boolean;
  isSavingResume: boolean;
  isAnalyzing: boolean;
  isTailoring: boolean;
  hasTailoredResume: boolean;
  tailorLanguage: "PT" | "EN";
  savedLanguages: SupportedLanguage[];
  onTailorLanguageChange: (lang: "PT" | "EN") => void;
  onSaveResume?: () => void;
  onCancelEditing: () => void;
  onAnalyze: () => void;
  onTailor: () => void;
  onStartEditing: () => void;
  onPrint: () => void;
  onOpenDeleteModal: () => void;
}

export function ApplicationTopBar({
  application,
  isEditingResume,
  isSavingResume,
  isAnalyzing,
  isTailoring,
  hasTailoredResume,
  tailorLanguage,
  savedLanguages,
  onTailorLanguageChange,
  onSaveResume,
  onCancelEditing,
  onAnalyze,
  onTailor,
  onStartEditing,
  onPrint,
  onOpenDeleteModal,
}: ApplicationTopBarProps) {
  return (
    <div className={`${styles.topBar} no-print`}>
      <div>
        <h1 className={styles.positionTitle}>{application.position}</h1>
        <div className={styles.companyRow}>
          <span>{application.company}</span>
          <span
            className={`${styles.langBadge} ${application.targetLanguage === "EN" ? styles.en : ""}`}
          >
            {application.targetLanguage === "EN"
              ? "🇺🇸 Vaga em Inglês"
              : "🇧🇷 Vaga em Português"}
          </span>
          {application.location && (
            <>
              <span>•</span>
              <MapPin size={14} />
              <span>{application.location}</span>
            </>
          )}
          {application.url && (
            <a
              href={application.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#94a3b8" }}
              title="Acessar link da vaga"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      <div className={styles.headerActions}>
        {isEditingResume ? (
          <>
            <button
              type="submit"
              form="tailored-resume-form"
              className={`${styles.actionButton} ${styles.primary}`}
              onClick={onSaveResume}
              disabled={isSavingResume}
            >
              <Save size={16} />
              <span>
                {isSavingResume ? "Salvando..." : "Salvar Alterações"}
              </span>
            </button>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.topBarCancelButton}`}
              onClick={onCancelEditing}
              disabled={isSavingResume}
            >
              <X size={16} />
              <span>Descartar Edição</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.secondary}`}
              onClick={onAnalyze}
              disabled={isAnalyzing}
            >
              <Sparkles size={16} />
              <span>{isAnalyzing ? "Analisando..." : "Reanalisar Vaga"}</span>
            </button>

            <div className={styles.languageControl}>
              <div
                className={styles.tailorLangToggle}
                title="Idioma do currículo"
                aria-label="Idioma do currículo"
              >
                <button
                  type="button"
                  className={tailorLanguage === "PT" ? styles.active : ""}
                  onClick={() => onTailorLanguageChange("PT")}
                  disabled={isTailoring}
                  title={
                    savedLanguages.includes("PT")
                      ? "Versão PT salva"
                      : "Gerar versão PT"
                  }
                >
                  PT
                </button>
                <button
                  type="button"
                  className={tailorLanguage === "EN" ? styles.active : ""}
                  onClick={() => onTailorLanguageChange("EN")}
                  disabled={isTailoring}
                  title={
                    savedLanguages.includes("EN")
                      ? "Versão EN salva"
                      : "Gerar versão EN"
                  }
                >
                  EN
                </button>
              </div>

              <span className={styles.languageStatus} aria-live="polite">
                {savedLanguages.includes(tailorLanguage)
                  ? "✓ salva"
                  : "não gerada"}
              </span>
            </div>

            <button
              type="button"
              className={`${styles.actionButton} ${styles.secondary}`}
              onClick={onTailor}
              disabled={isTailoring}
            >
              <FileCheck size={16} />
              <span>
                {isTailoring
                  ? `Adaptando (${tailorLanguage})...`
                  : hasTailoredResume
                    ? `Reescrever (${tailorLanguage})`
                    : `Gerar CV (${tailorLanguage})`}
              </span>
            </button>

            {hasTailoredResume && (
              <>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.primary}`}
                  onClick={onStartEditing}
                >
                  <Edit3 size={16} />
                  <span>Editar Conteúdo</span>
                </button>

                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.secondary}`}
                  onClick={onPrint}
                >
                  <Printer size={16} />
                  <span>Imprimir / PDF</span>
                </button>
              </>
            )}

            <button
              type="button"
              className={`${styles.actionButton} ${styles.dangerButton}`}
              onClick={onOpenDeleteModal}
              title="Excluir candidatura"
            >
              <Trash2 size={16} />
              <span>Excluir</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
