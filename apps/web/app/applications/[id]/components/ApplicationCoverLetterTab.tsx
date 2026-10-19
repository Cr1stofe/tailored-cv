"use client";

import { useEffect, useState } from "react";
import { Copy, Download, FileSignature, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type {
  CoverLetterFocus,
  CoverLetterGenerationDto,
  JobApplicationDto,
  MasterProfileDto,
  TailoredResumeDto,
} from "@tailored-cv/types";
import styles from "../application-detail.module.scss";
import {
  copyCoverLetter,
  createCoverLetter,
  getCoverLetterTitle,
  resolveCoverLetterLanguage,
} from "./cover-letter-draft";

interface ApplicationCoverLetterTabProps {
  application: JobApplicationDto;
  profile: MasterProfileDto | null;
  tailoredResume: TailoredResumeDto | null;
  focus: CoverLetterFocus;
  generation: CoverLetterGenerationDto | null;
  onFocusChange: (focus: CoverLetterFocus) => void;
  onGenerateWithAi: () => void;
}

export function ApplicationCoverLetterTab({
  application,
  profile,
  tailoredResume,
  focus,
  generation,
  onFocusChange,
  onGenerateWithAi,
}: ApplicationCoverLetterTabProps) {
  const language = resolveCoverLetterLanguage(application, tailoredResume);
  const [body, setBody] = useState(() =>
    createCoverLetter(
      application,
      profile,
      tailoredResume,
      language,
      "frontend",
    ),
  );

  useEffect(() => {
    setBody(
      createCoverLetter(
        application,
        profile,
        tailoredResume,
        resolveCoverLetterLanguage(application, tailoredResume),
        focus,
      ),
    );
  }, [application, profile, tailoredResume, focus]);

  useEffect(() => {
    if (generation?.status === "COMPLETED" && generation.content) {
      setBody(generation.content);
    }
  }, [generation]);

  const title = getCoverLetterTitle(language, focus);

  const copyLetter = async () => {
    const copied = await copyCoverLetter(navigator.clipboard, body);
    if (copied) {
      toast.success("Carta de apresentação copiada.");
    } else {
      toast.error("Não foi possível copiar a carta de apresentação.");
    }
  };

  const downloadLetter = () => {
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cover-letter-${application.company || "candidatura"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Carta de apresentação baixada.");
  };

  const isGenerating =
    generation?.status === "QUEUED" || generation?.status === "PROCESSING";

  return (
    <div className={`${styles.card} ${styles.emailCard}`}>
      <div className={styles.emailHeader}>
        <div>
          <h2 className={styles.cardTitle}>
            <FileSignature size={18} className={styles.iconBlue} />
            <span>{title}</span>
          </h2>
          <p className={styles.emailIntro}>
            Revise e personalize a carta antes de anexá-la à sua candidatura. O
            texto usa apenas informações do seu perfil e currículo adaptado.
          </p>
        </div>
      </div>

      <div className={styles.emailForm}>
        {isGenerating && (
          <div
            className={`${styles.generationStatus} ${styles.emailBodyField}`}
            role="status"
            aria-live="polite"
          >
            <span className={styles.loadingSpinner} aria-hidden="true" />
            <span>
              {generation?.status === "QUEUED"
                ? "Carta na fila..."
                : "Gerando carta com IA..."}
            </span>
            <small>Você pode continuar navegando enquanto processamos.</small>
          </div>
        )}

        <label className={styles.emailField}>
          <span>Ênfase profissional</span>
          <select
            value={focus}
            onChange={(event) =>
              onFocusChange(event.target.value as CoverLetterFocus)
            }
          >
            <option value="frontend">Front-end</option>
            <option value="fullstack">Full Stack</option>
          </select>
        </label>

        <label className={`${styles.emailField} ${styles.emailBodyField}`}>
          <span>Conteúdo da carta</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={18}
          />
        </label>
      </div>

      <div className={styles.emailActions}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.primary}`}
          onClick={onGenerateWithAi}
          disabled={isGenerating}
        >
          <Sparkles size={16} />
          {isGenerating ? "Gerando com IA..." : "Gerar com IA"}
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.secondary}`}
          onClick={copyLetter}
        >
          <Copy size={16} />
          Copiar carta
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.primary}`}
          onClick={downloadLetter}
        >
          <Download size={16} />
          Baixar .txt
        </button>
      </div>
    </div>
  );
}
