"use client";

import React from "react";
import { FileCheck, Edit3, Save, X, Plus, Trash2 } from "lucide-react";
import { TailoredResumeDto, MasterProfileDto } from "@tailored-cv/types";
import styles from "../application-detail.module.scss";

interface TailoredResumeTabProps {
  tailoredResume: TailoredResumeDto | null;
  editedResume: TailoredResumeDto | null;
  profile: MasterProfileDto | null;
  isEditingResume: boolean;
  isSavingResume: boolean;
  isTailoring: boolean;
  newSkillText: string;
  onTailor: () => void;
  onSaveResume: () => void;
  onCancelEditing: () => void;
  onUpdateHeadline: (val: string) => void;
  onUpdateSummary: (val: string) => void;
  onAddSkill: (e: React.FormEvent) => void;
  onRemoveSkill: (skill: string) => void;
  onNewSkillTextChange: (val: string) => void;
  onUpdateExperienceBullet: (expIdx: number, bIdx: number, val: string) => void;
  onAddExperienceBullet: (expIdx: number) => void;
  onRemoveExperienceBullet: (expIdx: number, bIdx: number) => void;
  onUpdateProjectBullet: (projIdx: number, bIdx: number, val: string) => void;
  onAddProjectBullet: (projIdx: number) => void;
  onRemoveProjectBullet: (projIdx: number, bIdx: number) => void;
}

export function TailoredResumeTab({
  tailoredResume,
  editedResume,
  profile,
  isEditingResume,
  isSavingResume,
  isTailoring,
  newSkillText,
  onTailor,
  onSaveResume,
  onCancelEditing,
  onUpdateHeadline,
  onUpdateSummary,
  onAddSkill,
  onRemoveSkill,
  onNewSkillTextChange,
  onUpdateExperienceBullet,
  onAddExperienceBullet,
  onRemoveExperienceBullet,
  onUpdateProjectBullet,
  onAddProjectBullet,
  onRemoveProjectBullet,
}: TailoredResumeTabProps) {
  if (!tailoredResume) {
    return (
      <div className={`${styles.emptyTabCard} no-print`}>
        <p>Nenhum currículo adaptado gerado para esta vaga ainda.</p>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.primary}`}
          onClick={onTailor}
          disabled={isTailoring}
        >
          <FileCheck size={16} />
          <span>
            {isTailoring ? "Adaptando Conteúdo..." : "Gerar Tailored CV com IA"}
          </span>
        </button>
      </div>
    );
  }

  const currentResume =
    isEditingResume && editedResume ? editedResume : tailoredResume;

  const isEn = currentResume.language === "EN";

  return (
    <div>
      <div className={`${styles.resumePreviewCard} ats-print-container`}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }} className="no-print">
          <span className={`${styles.langBadge} ${isEn ? styles.en : ""}`}>
            {isEn ? "🇺🇸 Tailored in English" : "🇧🇷 Adaptado em Português"}
          </span>
        </div>

        {isEditingResume && (
          <div className={`${styles.editModeBanner} no-print`}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Edit3 size={16} />
              <span>
                {isEn
                  ? "Manual Edit Mode Active — Fine-tune your headline, summary, and bullets."
                  : "Modo de Edição Manual Ativo — Ajuste headline, resumo, competências e bullets antes de imprimir."}
              </span>
            </div>
            <div className={styles.editModeActions}>
              <button
                type="button"
                className={styles.bannerSaveBtn}
                onClick={onSaveResume}
                disabled={isSavingResume}
              >
                <Save size={14} />
                <span>
                  {isSavingResume
                    ? isEn ? "Saving..." : "Salvando..."
                    : isEn ? "Save Changes" : "Salvar Alterações"}
                </span>
              </button>
              <button
                type="button"
                className={styles.bannerDiscardBtn}
                onClick={onCancelEditing}
              >
                <X size={14} />
                <span>{isEn ? "Discard" : "Descartar"}</span>
              </button>
            </div>
          </div>
        )}

        <div className={styles.atsHeader}>
          <h1 className={styles.atsName}>{profile?.fullName || "Candidato"}</h1>
          <div className={styles.atsHeadline}>
            {isEditingResume ? (
              <input
                type="text"
                className={styles.atsInput}
                value={currentResume.targetedHeadline || ""}
                onChange={(e) => onUpdateHeadline(e.target.value)}
                placeholder="Headline do currículo..."
              />
            ) : (
              currentResume.targetedHeadline || (isEn ? "Software Engineer" : "Desenvolvedor de Software")
            )}
          </div>
          <div className={styles.atsContacts}>
            <div className={styles.atsContactRow}>
              {profile?.location && <span>{profile.location}</span>}
              {profile?.phone && (
                <>
                  {profile?.location && (
                    <span className={styles.atsDivider}>•</span>
                  )}
                  <span>{profile.phone}</span>
                </>
              )}
              {profile?.email && (
                <>
                  {(profile?.location || profile?.phone) && (
                    <span className={styles.atsDivider}>•</span>
                  )}
                  <span>{profile.email}</span>
                </>
              )}
            </div>
            {(profile?.linkedinUrl ||
              profile?.githubUrl ||
              profile?.portfolioUrl) && (
              <div className={styles.atsContactRow}>
                {profile?.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {profile.linkedinUrl.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                )}
                {profile?.githubUrl && (
                  <>
                    {profile?.linkedinUrl && (
                      <span className={styles.atsDivider}>•</span>
                    )}
                    <a
                      href={profile.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {profile.githubUrl.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </>
                )}
                {profile?.portfolioUrl && (
                  <>
                    {(profile?.linkedinUrl || profile?.githubUrl) && (
                      <span className={styles.atsDivider}>•</span>
                    )}
                    <a
                      href={profile.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {profile.portfolioUrl.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <section className={styles.atsSection}>
          <h2 className={styles.atsSectionTitle}>
            {isEn ? "Professional Summary" : "Resumo Profissional"}
          </h2>
          {isEditingResume ? (
            <textarea
              className={styles.atsTextarea}
              value={currentResume.reframedSummary}
              onChange={(e) => onUpdateSummary(e.target.value)}
              rows={4}
            />
          ) : (
            <p className={styles.atsParagraph}>
              {currentResume.reframedSummary}
            </p>
          )}
        </section>

        <section className={styles.atsSection}>
          <h2 className={styles.atsSectionTitle}>
            {isEn ? "Technical Skills" : "Competências Técnicas"}
          </h2>
          <div className={styles.atsSkillsText}>
            {isEditingResume ? (
              <div style={{ marginBottom: "0.75rem" }}>
                <p style={{ marginBottom: "0.25rem" }}>
                  <strong>
                    {isEn
                      ? "Highlighted Skills for Target Position:"
                      : "Competências em Destaque para a Vaga:"}
                  </strong>
                </p>
                <div className={styles.atsSkillsEditList}>
                  {currentResume.highlightedSkills?.map((skill, sIdx) => (
                    <span key={sIdx} className={styles.atsSkillChip}>
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveSkill(skill)}
                        title="Remover competência"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <form
                    onSubmit={onAddSkill}
                    className={styles.atsAddSkillForm}
                  >
                    <input
                      type="text"
                      placeholder="Nova competência..."
                      value={newSkillText}
                      onChange={(e) => onNewSkillTextChange(e.target.value)}
                    />
                    <button type="submit">{isEn ? "Add" : "Adicionar"}</button>
                  </form>
                </div>
              </div>
            ) : (
              currentResume.highlightedSkills &&
              currentResume.highlightedSkills.length > 0 && (
                <p>
                  <strong>
                    {isEn
                      ? "Highlighted Skills for Target Position:"
                      : "Competências em Destaque para a Vaga:"}
                  </strong>{" "}
                  {currentResume.highlightedSkills.join(" • ")}
                </p>
              )
            )}
            <p>
              <strong>Linguagens & Frontend:</strong> TypeScript, JavaScript,
              React, Next.js (SSR, SSG, ISR), HTML5, SCSS, Tailwind CSS,
              Zustand, React Hook Form, Zod.
            </p>
            <p>
              <strong>Backend & Bancos de Dados:</strong> Node.js, NestJS,
              Express, PostgreSQL, Prisma ORM, SQL, APIs REST, JWT, Argon2id,
              RBAC.
            </p>
            <p>
              <strong>DevOps, Servidores & Nuvem:</strong> Docker, Docker
              Compose, Linux, Caddy Server, Oracle Cloud (OCI), Cloudflare, Git.
            </p>
            <p>
              <strong>Testes, Qualidade & Streaming:</strong> Vitest, Testing
              Library, Streaming sob demanda (HTTP 206), Core Web Vitals &
              Lighthouse.
            </p>
          </div>
        </section>

        <section className={styles.atsSection}>
          <h2 className={styles.atsSectionTitle}>
            {isEn ? "Professional Experience" : "Experiência Profissional"}
          </h2>
          {currentResume.tailoredExperiences.map((exp, idx) => (
            <div key={idx} className={styles.atsItem}>
              <div className={styles.atsItemHeader}>
                <div>
                  <span className={styles.atsItemRole}>{exp.position}</span>{" "}
                  {" — "}{" "}
                  <span className={styles.atsItemCompany}>{exp.company}</span>
                </div>
                <span className={styles.atsItemPeriod}>
                  {exp.period}
                  {exp.location ? ` | ${exp.location}` : ""}
                </span>
              </div>

              {isEditingResume ? (
                <div style={{ marginTop: "0.4rem" }}>
                  {exp.reframedHighlights.map((bullet, bIdx) => (
                    <div key={bIdx} className={styles.atsBulletRow}>
                      <textarea
                        className={styles.atsBulletTextarea}
                        value={bullet}
                        onChange={(e) =>
                          onUpdateExperienceBullet(idx, bIdx, e.target.value)
                        }
                      />
                      <button
                        type="button"
                        className={styles.atsDeleteBulletBtn}
                        onClick={() => onRemoveExperienceBullet(idx, bIdx)}
                        title={isEn ? "Remove bullet" : "Remover bullet"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={`${styles.atsAddBulletBtn} no-print`}
                    onClick={() => onAddExperienceBullet(idx)}
                  >
                    <Plus size={13} />
                    <span>{isEn ? "Add bullet point" : "Adicionar realização"}</span>
                  </button>
                </div>
              ) : (
                <ul className={styles.atsBullets}>
                  {exp.reframedHighlights.map((bullet, bIdx) => (
                    <li key={bIdx}>{bullet}</li>
                  ))}
                </ul>
              )}

              {exp.technologies && exp.technologies.length > 0 && (
                <div className={styles.atsTechLine}>
                  <strong>{isEn ? "Technologies:" : "Tecnologias:"}</strong>{" "}
                  {exp.technologies.join(", ")}
                </div>
              )}
            </div>
          ))}
        </section>

        {currentResume.tailoredProjects &&
          currentResume.tailoredProjects.length > 0 && (
            <section className={styles.atsSection}>
              <h2 className={styles.atsSectionTitle}>
                {isEn ? "Key Architectural Projects" : "Projetos Relevantes"}
              </h2>
              {currentResume.tailoredProjects.map((proj, idx) => (
                <div key={idx} className={styles.atsItem}>
                  <div className={styles.atsItemHeader}>
                    <span className={styles.atsItemRole}>{proj.name}</span>
                    {proj.url && (
                      <span className={styles.atsItemPeriod}>{proj.url}</span>
                    )}
                  </div>

                  {isEditingResume ? (
                    <div style={{ marginTop: "0.4rem" }}>
                      {proj.reframedHighlights.map((bullet, bIdx) => (
                        <div key={bIdx} className={styles.atsBulletRow}>
                          <textarea
                            className={styles.atsBulletTextarea}
                            value={bullet}
                            onChange={(e) =>
                              onUpdateProjectBullet(idx, bIdx, e.target.value)
                            }
                          />
                          <button
                            type="button"
                            className={styles.atsDeleteBulletBtn}
                            onClick={() => onRemoveProjectBullet(idx, bIdx)}
                            title={isEn ? "Remove bullet" : "Remover realização"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={`${styles.atsAddBulletBtn} no-print`}
                        onClick={() => onAddProjectBullet(idx)}
                      >
                        <Plus size={13} />
                        <span>
                          {isEn
                            ? "Add project highlight"
                            : "Adicionar destaque do projeto"}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <ul className={styles.atsBullets}>
                      {proj.reframedHighlights.map((bullet, bIdx) => (
                        <li key={bIdx}>{bullet}</li>
                      ))}
                    </ul>
                  )}

                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className={styles.atsTechLine}>
                      <strong>{isEn ? "Stack:" : "Tecnologias:"}</strong>{" "}
                      {proj.technologies.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

        {profile?.educations && profile.educations.length > 0 && (
          <section className={styles.atsSection}>
            <h2 className={styles.atsSectionTitle}>
              {isEn ? "Education" : "Formação Acadêmica"}
            </h2>
            {profile.educations.map((ed, idx) => (
              <div key={idx} className={styles.atsItem}>
                <div className={styles.atsItemHeader}>
                  <div>
                    <span className={styles.atsItemRole}>{ed.degree}</span>{" "}
                    {" — "}{" "}
                    <span className={styles.atsItemCompany}>
                      {ed.institution}
                    </span>
                  </div>
                  <span className={styles.atsItemPeriod}>
                    {ed.startDate} – {ed.endDate || (isEn ? "Present" : "Presente")}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {profile?.certifications && profile.certifications.length > 0 && (
          <section className={styles.atsSection}>
            <h2 className={styles.atsSectionTitle}>
              {isEn ? "Languages & Certifications" : "Idiomas"}
            </h2>
            <div className={styles.atsSkillsText}>
              <p>{profile.certifications.map((c) => c.name).join(" • ")}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
