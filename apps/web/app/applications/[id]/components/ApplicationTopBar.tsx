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
import styles from "../application-detail.module.scss";

interface ApplicationTopBarProps {
  application: JobApplicationDto;
  isEditingResume: boolean;
  isSavingResume: boolean;
  isAnalyzing: boolean;
  isTailoring: boolean;
  hasTailoredResume: boolean;
  onSaveResume: () => void;
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
              type="button"
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

            <button
              type="button"
              className={`${styles.actionButton} ${styles.secondary}`}
              onClick={onTailor}
              disabled={isTailoring}
            >
              <FileCheck size={16} />
              <span>
                {isTailoring
                  ? "Adaptando CV..."
                  : hasTailoredResume
                    ? "Reescrever com IA"
                    : "Gerar Currículo Adaptado"}
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
