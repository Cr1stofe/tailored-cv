"use client";

import { useState } from "react";
import { FileText, Printer, Sparkles, Loader2, Globe, CheckCircle2 } from "lucide-react";
import styles from "../profile.module.scss";

interface MasterResumeBannerProps {
  onOpen: (language?: "PT" | "EN") => void;
  onPrint: (language?: "PT" | "EN") => void;
  onSync: () => void;
  onGenerateEnglish: () => Promise<void>;
  isGeneratingEnglish: boolean;
  hasEnglishCv: boolean;
  englishCvUpdatedAt?: string | null;
}

export function MasterResumeBanner({
  onOpen,
  onPrint,
  onSync,
  onGenerateEnglish,
  isGeneratingEnglish,
  hasEnglishCv,
  englishCvUpdatedAt,
}: MasterResumeBannerProps) {
  const [selectedLang, setSelectedLang] = useState<"PT" | "EN">("PT");

  const formattedEnDate = englishCvUpdatedAt
    ? new Date(englishCvUpdatedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className={`${styles.masterResumeCard} no-print`}>
      <div className={styles.masterResumeInfo}>
        <div className={styles.langSelector}>
          <button
            type="button"
            className={`${styles.langOption} ${selectedLang === "PT" ? styles.active : ""}`}
            onClick={() => setSelectedLang("PT")}
          >
            <span>🇧🇷 Português (Padrão)</span>
          </button>
          <button
            type="button"
            className={`${styles.langOption} ${selectedLang === "EN" ? styles.active : ""}`}
            onClick={() => setSelectedLang("EN")}
          >
            <span>🇺🇸 English (IA ATS)</span>
            {hasEnglishCv && (
              <CheckCircle2 size={13} style={{ color: "#34d399", marginLeft: "2px" }} />
            )}
          </button>
        </div>

        {selectedLang === "PT" ? (
          <>
            <div className={styles.badge}>Documento Consolidado • PT-BR</div>
            <h3>Currículo Master Abrangente</h3>
            <p>
              Versão executiva completa baseada no seu perfil, estruturada com os
              pontos mais importantes e formatação limpa 100% pronta para triagem
              ATS.
            </p>
          </>
        ) : (
          <>
            <div
              className={styles.badge}
              style={{
                background: hasEnglishCv ? "rgba(16, 185, 129, 0.15)" : "rgba(168, 85, 247, 0.15)",
                color: hasEnglishCv ? "#34d399" : "#c084fc",
                borderColor: hasEnglishCv ? "rgba(16, 185, 129, 0.35)" : "rgba(168, 85, 247, 0.35)",
              }}
            >
              {hasEnglishCv
                ? `Salvo no Banco • Gerado em ${formattedEnDate}`
                : "Versão Internacional Pendente"}
            </div>
            <h3>Master Resume — English Version</h3>
            <p>
              {hasEnglishCv
                ? "Versão traduzida e refinada pela IA para vagas internacionais. Salva no banco de dados e sempre disponível para exportação ou regeração."
                : "Gere a versão internacional do seu perfil em inglês fluente com verbos de ação para triagem ATS. Uma vez gerada, ficará salva no banco."}
            </p>
          </>
        )}
      </div>

      <div className={styles.masterResumeActions}>
        {selectedLang === "PT" ? (
          <>
            <button
              type="button"
              className={styles.viewResumeButton}
              onClick={() => onOpen("PT")}
            >
              <FileText size={16} />
              <span>Visualizar Currículo Master</span>
            </button>
            <button
              type="button"
              className={styles.downloadResumeButton}
              onClick={() => onPrint("PT")}
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
              <span>Sincronizar Perfil</span>
            </button>
            {!hasEnglishCv && (
              <button
                type="button"
                className={`${styles.syncResumeButton} ${styles.generateEnButton}`}
                onClick={onGenerateEnglish}
                disabled={isGeneratingEnglish}
              >
                {isGeneratingEnglish ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Globe size={16} />
                )}
                <span>
                  {isGeneratingEnglish
                    ? "Gerando em Inglês..."
                    : "Gerar CV em Inglês"}
                </span>
              </button>
            )}
          </>
        ) : (
          <>
            {hasEnglishCv ? (
              <>
                <button
                  type="button"
                  className={styles.viewResumeButton}
                  onClick={() => onOpen("EN")}
                >
                  <FileText size={16} />
                  <span>Visualizar em Inglês</span>
                </button>
                <button
                  type="button"
                  className={styles.downloadResumeButton}
                  onClick={() => onPrint("EN")}
                >
                  <Printer size={16} />
                  <span>Baixar / PDF (EN)</span>
                </button>
                <button
                  type="button"
                  className={`${styles.syncResumeButton} ${styles.generateEnButton}`}
                  onClick={onGenerateEnglish}
                  disabled={isGeneratingEnglish}
                  title="Atualizar versão em inglês com os dados atuais do perfil"
                >
                  {isGeneratingEnglish ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  <span>
                    {isGeneratingEnglish ? "Regerando..." : "Regerar em Inglês"}
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className={`${styles.viewResumeButton} ${styles.generateEnButton}`}
                onClick={onGenerateEnglish}
                disabled={isGeneratingEnglish}
              >
                {isGeneratingEnglish ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                <span>
                  {isGeneratingEnglish
                    ? "Gerando versão em Inglês..."
                    : "Gerar Master CV em Inglês com IA"}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

