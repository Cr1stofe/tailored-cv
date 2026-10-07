"use client";

import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  FileCheck,
  Check,
  X,
  Target,
} from "lucide-react";
import { JobAnalysisDto } from "@tailored-cv/types";
import styles from "../application-detail.module.scss";

interface JobAnalysisTabProps {
  analysis?: JobAnalysisDto | null;
  hasTailoredResume: boolean;
  isAnalyzing: boolean;
  isTailoring: boolean;
  onAnalyze: () => void;
  onTailor: () => void;
}

export function JobAnalysisTab({
  analysis,
  hasTailoredResume,
  isAnalyzing,
  isTailoring,
  onAnalyze,
  onTailor,
}: JobAnalysisTabProps) {
  if (!analysis) {
    return (
      <div className={`${styles.emptyTabCard} no-print`}>
        <p>Esta vaga ainda não foi analisada pela inteligência artificial.</p>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.primary}`}
          onClick={onAnalyze}
          disabled={isAnalyzing}
        >
          <Sparkles size={16} />
          <span>
            {isAnalyzing ? "Processando..." : "Iniciar Análise Semântica"}
          </span>
        </button>
      </div>
    );
  }

  const score = Math.min(100, Math.max(0, analysis.matchScore || 0));
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const strokeColor =
    score >= 80
      ? "#10b981"
      : score >= 60
        ? "#3b82f6"
        : score >= 40
          ? "#f59e0b"
          : "#ef4444";

  const badgeClass =
    score >= 80
      ? styles.matchHigh
      : score >= 60
        ? styles.matchMedium
        : styles.matchLow;

  const badgeText =
    score >= 80
      ? "Alta Compatibilidade"
      : score >= 60
        ? "Boa Aderência"
        : "Requer Atenção Estratégica";

  const totalTrackedSkills =
    (analysis.matchingSkills?.length || 0) +
    (analysis.missingSkills?.length || 0);

  return (
    <div className="no-print">
      <div className={styles.analysisContainer}>
        <div className={styles.analysisHero}>
          <div className={styles.radialGaugeWrapper}>
            <svg
              className={styles.radialSvg}
              viewBox="0 0 150 150"
              aria-label={`Score de compatibilidade: ${score}%`}
            >
              <circle className={styles.gaugeBg} cx="75" cy="75" r={radius} />
              <circle
                className={styles.gaugeProgress}
                cx="75"
                cy="75"
                r={radius}
                stroke={strokeColor}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className={styles.gaugeTextCenter}>
              <div className={styles.gaugeNumber}>
                {score}
                <span className={styles.gaugePercent}>%</span>
              </div>
              <span className={styles.gaugeCaption}>Match ATS</span>
            </div>
          </div>

          <div className={styles.heroContent}>
            <div className={styles.heroHeader}>
              <h2 className={styles.heroTitle}>
                Aderência do Perfil à Oportunidade
              </h2>
              <span className={`${styles.compatibilityBadge} ${badgeClass}`}>
                {badgeText}
              </span>
            </div>
            <p className={styles.heroSubtitle}>
              {analysis.summary ||
                "Diagnóstico preditivo computado com base no cruzamento semântico entre o Master Profile e os critérios da vaga."}
            </p>

            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiValue}>
                  {analysis.matchingSkills?.length || 0}
                  {totalTrackedSkills > 0 ? ` / ${totalTrackedSkills}` : ""}
                </span>
                <span className={styles.kpiLabel}>Requisitos Atendidos</span>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiValue}>
                  {analysis.missingSkills?.length || 0}
                </span>
                <span className={styles.kpiLabel}>Gaps Detectados</span>
              </div>

              <div className={styles.kpiCard}>
                <span className={styles.kpiValue}>
                  {analysis.seniorityLevel || "N/D"}
                </span>
                <span className={styles.kpiLabel}>Nível de Senioridade</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.comparisonGrid}>
          <div className={`${styles.comparisonCol} ${styles.matchingCol}`}>
            <div className={styles.colHeader}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <CheckCircle2 size={18} className={styles.iconGreen} />
                <h3 className={styles.colTitle}>Competências em Destaque</h3>
              </div>
              <span className={styles.badgeCountSuccess}>
                {analysis.matchingSkills?.length || 0}
              </span>
            </div>
            <p className={styles.colSubtitle}>
              Pontos fortes já validados no seu histórico que serão enfatizados.
            </p>

            <div className={styles.pillsList}>
              {analysis.matchingSkills && analysis.matchingSkills.length > 0 ? (
                analysis.matchingSkills.map((skill, idx) => (
                  <span key={idx} className={styles.pillMatching}>
                    <Check size={12} />
                    {skill}
                  </span>
                ))
              ) : (
                <p className={styles.emptyColText}>
                  Nenhuma competência direta mapeada.
                </p>
              )}
            </div>
          </div>

          <div className={`${styles.comparisonCol} ${styles.missingCol}`}>
            <div className={styles.colHeader}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <AlertCircle size={18} className={styles.iconAmber} />
                <h3 className={styles.colTitle}>Requisitos Não Localizados</h3>
              </div>
              <span className={styles.badgeCountMissing}>
                {analysis.missingSkills?.length || 0}
              </span>
            </div>
            <p className={styles.colSubtitle}>
              Critérios da oportunidade ausentes ou não descritos no seu perfil.
            </p>

            <div className={styles.ethicalNotice}>
              <Target
                size={14}
                style={{ flexShrink: 0, marginTop: "0.15rem" }}
              />
              <span>
                <strong>Salvaguarda Anti-Alucinação:</strong> Em respeito ao
                princípio &ldquo;Never invent. Only reframe&rdquo;, estas
                competências não serão atribuídas falsamente ao seu currículo
                gerado.
              </span>
            </div>

            <div className={styles.pillsList}>
              {analysis.missingSkills && analysis.missingSkills.length > 0 ? (
                analysis.missingSkills.map((skill, idx) => (
                  <span key={idx} className={styles.pillMissing}>
                    <X size={12} />
                    {skill}
                  </span>
                ))
              ) : (
                <p className={styles.emptyColText}>
                  Nenhum gap crítico identificado nesta oportunidade.
                </p>
              )}
            </div>
          </div>
        </div>

        {analysis.keywords && analysis.keywords.length > 0 && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <Sparkles size={18} className={styles.iconBlue} />
              <span>Palavras-chave Estratégicas para Rastreamento ATS</span>
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#94a3b8",
                marginBottom: "1rem",
              }}
            >
              Termos cruciais priorizados pelos filtros de triagem automática e
              parsers de RH.
            </p>
            <div className={styles.skillPills}>
              {analysis.keywords.map((k, idx) => (
                <span key={idx} className={styles.keywordPill}>
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.strategicRecommendations &&
          analysis.strategicRecommendations.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>
                <Lightbulb size={18} className={styles.iconBlue} />
                <span>Diretrizes e Recomendações Estratégicas</span>
              </h3>
              <div className={styles.recGrid}>
                {analysis.strategicRecommendations.map((rec, idx) => (
                  <div key={idx} className={styles.recCard}>
                    <span className={styles.recIndex}>
                      {(idx + 1).toString().padStart(2, "0")}
                    </span>
                    <p className={styles.recText}>{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        {!hasTailoredResume && (
          <div className={styles.ctaActionBanner}>
            <div className={styles.ctaText}>
              <h4>Pronto para gerar o currículo adaptado a esta vaga?</h4>
              <p>
                A IA irá refazer o headline, sumário e realizações profissionais
                focando nas competências validadas e termos-chave ATS.
              </p>
            </div>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.ctaButton}`}
              onClick={onTailor}
              disabled={isTailoring}
            >
              <FileCheck size={16} />
              <span>
                {isTailoring
                  ? "Adaptando CV..."
                  : "Gerar Currículo Adaptado Agora"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
