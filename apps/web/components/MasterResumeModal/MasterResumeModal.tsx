"use client";

import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { MasterProfileDto } from "@tailored-cv/types";
import styles from "./MasterResumeModal.module.scss";

interface MasterResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MasterProfileDto;
}

export function MasterResumeModal({
  isOpen,
  onClose,
  profile,
}: MasterResumeModalProps) {
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

  const handlePrint = () => {
    window.print();
  };

  const professionalSkills = profile.skills
    .filter((s) => s.category === "PROFESSIONAL")
    .map((s) => s.name);
  const handsOnSkills = profile.skills
    .filter((s) => s.category === "HANDS_ON")
    .map((s) => s.name);
  const familiarSkills = profile.skills
    .filter((s) => s.category === "FAMILIAR")
    .map((s) => s.name);

  const primaryExperiences = profile.experiences.slice(0, 4);
  const primaryProjects = profile.projects.slice(0, 3);

  return (
    <div className={styles.overlay}>
      <div className={`${styles.actionBar} no-print`}>
        <div className={styles.actionBarTitle}>
          <span>Visualização do Currículo Master</span>
          <span className={styles.pageHint}>Formato A4 Otimizado para ATS</span>
        </div>

        <div className={styles.actionBarButtons}>
          <button
            type="button"
            className={styles.printButton}
            onClick={handlePrint}
          >
            <Printer size={16} />
            <span>Imprimir / Salvar em PDF</span>
          </button>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            title="Fechar visualização"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className={styles.scrollArea}>
        <div className={`${styles.resumeSheet} ats-print-container`}>
          <header className={styles.atsHeader}>
            <h1 className={styles.atsName}>{profile.fullName}</h1>
            <p className={styles.atsHeadline}>
              DESENVOLVEDOR FULL STACK SÊNIOR | NODE.JS • REACT • TYPESCRIPT •
              NESTJS
            </p>

            <div className={styles.atsContacts}>
              <div className={styles.atsContactRow}>
                <span>{profile.email}</span>
                {profile.phone && (
                  <>
                    <span className={styles.atsDivider}>•</span>
                    <span>{profile.phone}</span>
                  </>
                )}
                {profile.location && (
                  <>
                    <span className={styles.atsDivider}>•</span>
                    <span>{profile.location}</span>
                  </>
                )}
              </div>

              {(profile.linkedinUrl ||
                profile.githubUrl ||
                profile.portfolioUrl) && (
                <div className={styles.atsContactRow}>
                  {profile.linkedinUrl && (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {profile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  )}
                  {profile.githubUrl && (
                    <>
                      <span className={styles.atsDivider}>•</span>
                      <a
                        href={profile.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {profile.githubUrl.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    </>
                  )}
                  {profile.portfolioUrl && (
                    <>
                      <span className={styles.atsDivider}>•</span>
                      <a
                        href={profile.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {profile.portfolioUrl.replace(
                          /^https?:\/\/(www\.)?/,
                          "",
                        )}
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          </header>

          {profile.summary && (
            <section className={styles.atsSection}>
              <h2 className={styles.atsSectionTitle}>Resumo Profissional</h2>
              <p className={styles.atsParagraph}>{profile.summary}</p>
            </section>
          )}

          <section className={styles.atsSection}>
            <h2 className={styles.atsSectionTitle}>Competências Técnicas</h2>
            <div className={styles.atsSkillsText}>
              {professionalSkills.length > 0 && (
                <p>
                  <strong>Domínio Principal & Arquitetura:</strong>{" "}
                  {professionalSkills.join(", ")}.
                </p>
              )}
              {handsOnSkills.length > 0 && (
                <p>
                  <strong>Prática em Produção & Ecossistema:</strong>{" "}
                  {handsOnSkills.join(", ")}.
                </p>
              )}
              {familiarSkills.length > 0 && (
                <p>
                  <strong>Conhecimento & Tecnologias Complementares:</strong>{" "}
                  {familiarSkills.join(", ")}.
                </p>
              )}
            </div>
          </section>

          {primaryExperiences.length > 0 && (
            <section className={styles.atsSection}>
              <h2 className={styles.atsSectionTitle}>
                Experiência Profissional
              </h2>
              {primaryExperiences.map((exp, idx) => (
                <div key={exp.id || idx} className={styles.atsItem}>
                  <div className={styles.atsItemHeader}>
                    <div>
                      <span className={styles.atsItemRole}>{exp.position}</span>{" "}
                      {" — "}{" "}
                      <span className={styles.atsItemCompany}>
                        {exp.company}
                      </span>
                    </div>
                    <span className={styles.atsItemPeriod}>
                      {exp.startDate} –{" "}
                      {exp.endDate || (exp.isCurrent ? "Presente" : "")}
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
                      <strong>Tecnologias:</strong>{" "}
                      {exp.technologies.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {primaryProjects.length > 0 && (
            <section className={styles.atsSection}>
              <h2 className={styles.atsSectionTitle}>
                Projetos Arquiteturais em Destaque
              </h2>
              {primaryProjects.map((proj, idx) => (
                <div key={proj.id || idx} className={styles.atsItem}>
                  <div className={styles.atsItemHeader}>
                    <span className={styles.atsItemRole}>{proj.name}</span>
                    {proj.url && (
                      <span className={styles.atsItemPeriod}>
                        {proj.url.replace(/^https?:\/\/(www\.)?/, "")}
                      </span>
                    )}
                  </div>

                  {proj.description && (
                    <p className={styles.atsProjectDescription}>
                      {proj.description}
                    </p>
                  )}

                  {proj.highlights && proj.highlights.length > 0 && (
                    <ul className={styles.atsBullets}>
                      {proj.highlights.map((bullet, bIdx) => (
                        <li key={bIdx}>{bullet}</li>
                      ))}
                    </ul>
                  )}

                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className={styles.atsTechLine}>
                      <strong>Stack:</strong> {proj.technologies.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {profile.educations && profile.educations.length > 0 && (
            <section className={styles.atsSection}>
              <h2 className={styles.atsSectionTitle}>Formação Acadêmica</h2>
              {profile.educations.map((ed, idx) => (
                <div key={ed.id || idx} className={styles.atsItem}>
                  <div className={styles.atsItemHeader}>
                    <div>
                      <span className={styles.atsItemRole}>{ed.degree}</span>{" "}
                      {" — "}{" "}
                      <span className={styles.atsItemCompany}>
                        {ed.institution}
                        {ed.fieldOfStudy && ` (${ed.fieldOfStudy})`}
                      </span>
                    </div>
                    {(ed.startDate || ed.endDate) && (
                      <span className={styles.atsItemPeriod}>
                        {ed.startDate || ""} – {ed.endDate || "Presente"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

          {profile.certifications && profile.certifications.length > 0 && (
            <section className={styles.atsSection}>
              <h2 className={styles.atsSectionTitle}>Idiomas</h2>
              <div className={styles.atsSkillsText}>
                <p>
                  {profile.certifications
                    .map((c) => (c.issuer ? `${c.name} (${c.issuer})` : c.name))
                    .join(" • ")}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
