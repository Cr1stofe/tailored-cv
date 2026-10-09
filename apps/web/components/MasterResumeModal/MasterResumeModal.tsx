"use client";

import { useEffect, useState } from "react";
import { Printer, X, Sparkles, Loader2 } from "lucide-react";
import { MasterProfileDto } from "@tailored-cv/types";
import { formatResumeDate, sanitizeHeadline } from "@tailored-cv/validation";
import { printResume } from "@/lib/print-resume";
import {
  getResumeProfile,
  localizeResumeProjectName,
  localizeResumeTerm,
} from "@/lib/resume-format";
import {
  ResumeHeader,
  ResumeSkillsSection,
  ResumeEducationSection,
} from "../Resume";
import styles from "./MasterResumeModal.module.scss";

interface MasterResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MasterProfileDto;
  initialLanguage?: "PT" | "EN";
  onGenerateEnglish?: () => Promise<void>;
  isGeneratingEnglish?: boolean;
}

export function MasterResumeModal({
  isOpen,
  onClose,
  profile,
  initialLanguage = "PT",
  onGenerateEnglish,
  isGeneratingEnglish = false,
}: MasterResumeModalProps) {
  const [currentLang, setCurrentLang] = useState<"PT" | "EN">(initialLanguage);
  const [viewMode, setViewMode] = useState<"compact" | "full">("compact");

  useEffect(() => {
    setCurrentLang(initialLanguage);
  }, [initialLanguage, isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEn = currentLang === "EN";
  const activeProfile = getResumeProfile(profile, isEn) || profile;
  const hasEnglishCv = Boolean(profile.englishCv);
  const isCompact = viewMode === "compact";

  const handlePrint = () => {
    printResume({
      fullName: activeProfile.fullName,
      language: currentLang,
      isMaster: true,
    });
  };

  const noiseSkills = new Set([
    "HTML",
    "CSS",
    "SQL",
    "Redux",
    "JWT",
    "WordPress",
  ]);

  const professionalSkills = activeProfile.skills
    .filter((s) => s.category === "PROFESSIONAL")
    .map((s) => s.name)
    .filter((name) => !isCompact || !noiseSkills.has(name));
  const handsOnSkills = activeProfile.skills
    .filter((s) => s.category === "HANDS_ON")
    .map((s) => s.name)
    .filter((name) => !isCompact || !noiseSkills.has(name));
  const familiarSkills = isCompact
    ? []
    : activeProfile.skills
        .filter((s) => s.category === "FAMILIAR")
        .map((s) => s.name);

  const primaryExperiences = isCompact
    ? activeProfile.experiences.slice(0, 2).map((exp) => ({
        ...exp,
        highlights: exp.highlights ? exp.highlights.slice(0, 3) : [],
      }))
    : activeProfile.experiences;

  const primaryProjects = isCompact
    ? activeProfile.projects.slice(0, 3).map((proj) => ({
        ...proj,
        highlights: proj.highlights ? proj.highlights.slice(0, 2) : [],
      }))
    : activeProfile.projects;

  const displaySummary = activeProfile.summary;
  const masterHeadline = sanitizeHeadline(
    `${activeProfile.experiences[0]?.position || (isEn ? "Software Developer" : "Desenvolvedor de Software")} | ${(
      activeProfile.experiences[0]?.technologies ||
      activeProfile.skills.slice(0, 4).map((skill) => skill.name)
    )
      .slice(0, 4)
      .map((technology) => localizeResumeTerm(technology, isEn))
      .join(" • ")}`,
  );

  return (
    <div className={styles.overlay}>
      <div className={`${styles.actionBar} no-print`}>
        <div className={styles.actionBarLeft}>
          <div className={styles.actionBarTitle}>
            <span className={styles.titleText}>
              {isEn ? "Master Resume" : "Currículo Master"}
            </span>
            <span className={styles.pageHint}>
              {isCompact
                ? isEn
                  ? "1-Page ATS"
                  : "1 Página (ATS)"
                : isEn
                  ? "Full CV"
                  : "Completo"}
            </span>
          </div>

          <div className={styles.togglesGroup}>
            <div className={styles.modeToggle}>
              <button
                type="button"
                className={`${styles.modeBtn} ${viewMode === "compact" ? styles.active : ""}`}
                onClick={() => setViewMode("compact")}
                title={
                  isEn
                    ? "Synthesized 1-page ATS layout"
                    : "Formato sintetizado em 1 página"
                }
              >
                📄 {isEn ? "1 Page" : "1 Página"}
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${viewMode === "full" ? styles.active : ""}`}
                onClick={() => setViewMode("full")}
                title={
                  isEn
                    ? "Full unabridged master profile"
                    : "Exibir todas as seções completas"
                }
              >
                📜 {isEn ? "Full" : "Completo"}
              </button>
            </div>

            <div className={styles.langToggle}>
              <button
                type="button"
                className={`${styles.langBtn} ${currentLang === "PT" ? styles.active : ""}`}
                onClick={() => setCurrentLang("PT")}
              >
                🇧🇷 PT
              </button>
              <button
                type="button"
                className={`${styles.langBtn} ${currentLang === "EN" ? styles.active : ""}`}
                onClick={() => setCurrentLang("EN")}
              >
                🇺🇸 EN
              </button>
            </div>
          </div>
        </div>

        <div className={styles.actionBarRight}>
          <button
            type="button"
            className={styles.printButton}
            onClick={handlePrint}
            title={isEn ? "Print / Save PDF" : "Imprimir / Salvar em PDF"}
          >
            <Printer size={15} />
            <span className={styles.printLabel}>
              {isEn ? "Print / Save PDF" : "Imprimir / Salvar em PDF"}
            </span>
          </button>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            title={isEn ? "Close preview" : "Fechar visualização"}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={styles.scrollArea}>
        {isEn && !hasEnglishCv ? (
          <div className={`${styles.resumeSheet} ats-print-container`}>
            <div className={styles.emptyEnState}>
              <Sparkles
                size={36}
                style={{ color: "#a855f7", margin: "0 auto 1rem" }}
              />
              <h4>Versão em Inglês Ainda Não Gerada</h4>
              <p>
                Gere a versão internacional do seu perfil em inglês técnico
                fluente com IA. Ela ficará salva no banco de dados para você
                acessar ou baixar sempre que precisar.
              </p>
              {onGenerateEnglish && (
                <button
                  type="button"
                  className={styles.generateEnBtn}
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
                      ? "Gerando versão em inglês..."
                      : "Gerar Master CV em Inglês Agora"}
                  </span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={`${styles.resumeSheet} ats-print-container`}>
            <ResumeHeader
              fullName={activeProfile.fullName}
              headline={masterHeadline}
              email={activeProfile.email}
              phone={activeProfile.phone}
              location={activeProfile.location}
              linkedinUrl={activeProfile.linkedinUrl}
              githubUrl={activeProfile.githubUrl}
              portfolioUrl={activeProfile.portfolioUrl}
            />

            {activeProfile.summary && (
              <section className={styles.atsSection}>
                <h2 className={styles.atsSectionTitle}>
                  {isEn ? "Professional Summary" : "Resumo Profissional"}
                </h2>
                <p className={styles.atsParagraph}>{displaySummary}</p>
              </section>
            )}

            <ResumeSkillsSection
              skills={{
                professional: professionalSkills,
                handsOn: handsOnSkills,
                familiar: familiarSkills,
              }}
              isEn={isEn}
            />

            {primaryExperiences.length > 0 && (
              <section className={styles.atsSection}>
                <h2 className={styles.atsSectionTitle}>
                  {isEn
                    ? "Professional Experience"
                    : "Experiência Profissional"}
                </h2>
                {primaryExperiences.map((exp, idx) => (
                  <div key={exp.id || idx} className={styles.atsItem}>
                    <div className={styles.atsItemHeader}>
                      <div>
                        <span className={styles.atsItemRole}>
                          {exp.position}
                        </span>{" "}
                        {" — "}{" "}
                        <span className={styles.atsItemCompany}>
                          {exp.company}
                        </span>
                      </div>
                      <span className={styles.atsItemPeriod}>
                        {formatResumeDate(exp.startDate)} –{" "}
                        {exp.endDate
                          ? formatResumeDate(exp.endDate)
                          : exp.isCurrent
                            ? isEn
                              ? "Present"
                              : "Presente"
                            : ""}
                        {exp.location ? ` | ${exp.location}` : ""}
                      </span>
                    </div>

                    {exp.highlights && exp.highlights.length > 0 && (
                      <ul className={styles.atsBullets}>
                        {exp.highlights.map((bullet, bIdx) => (
                          <li key={bIdx}>{bullet}</li>
                        ))}
                      </ul>
                    )}

                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className={styles.atsTechLine}>
                        <strong>
                          {isEn ? "Technologies:" : "Tecnologias:"}
                        </strong>{" "}
                        {exp.technologies
                          .map((technology) =>
                            localizeResumeTerm(technology, isEn),
                          )
                          .join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}

            {primaryProjects.length > 0 && (
              <section className={styles.atsSection}>
                <h2 className={styles.atsSectionTitle}>
                  {isEn ? "Projects" : "Projetos"}
                </h2>
                {primaryProjects.map((proj, idx) => (
                  <div key={proj.id || idx} className={styles.atsItem}>
                    <div className={styles.atsItemHeader}>
                      <span className={styles.atsItemRole}>
                        {localizeResumeProjectName(proj.name, isEn)}
                      </span>
                      {proj.url && (
                        <span className={styles.atsItemPeriod}>
                          {proj.url.replace(/^https?:\/\/(www\.)?/, "")}
                        </span>
                      )}
                    </div>

                    {proj.highlights && proj.highlights.length > 0 ? (
                      <ul className={styles.atsBullets}>
                        {proj.highlights.map((bullet, bIdx) => (
                          <li key={bIdx}>{bullet}</li>
                        ))}
                      </ul>
                    ) : proj.description ? (
                      <p className={styles.atsProjectDescription}>
                        {proj.description}
                      </p>
                    ) : null}

                    {proj.technologies && proj.technologies.length > 0 && (
                      <div className={styles.atsTechLine}>
                        <strong>Stack:</strong>{" "}
                        {proj.technologies
                          .map((technology) =>
                            localizeResumeTerm(technology, isEn),
                          )
                          .join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}

            <ResumeEducationSection
              educations={activeProfile.educations}
              certifications={activeProfile.certifications}
              isEn={isEn}
            />
          </div>
        )}
      </div>
    </div>
  );
}
