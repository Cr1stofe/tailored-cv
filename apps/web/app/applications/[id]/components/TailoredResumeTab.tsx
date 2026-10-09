"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileCheck, Edit3, Save, X, Plus, Trash2 } from "lucide-react";
import { TailoredResumeDto, MasterProfileDto } from "@tailored-cv/types";
import {
  tailoredResumeFormSchema,
  TailoredResumeFormInput,
  sanitizeHeadline,
  normalizePeriod,
} from "@tailored-cv/validation";
import {
  ResumeHeader,
  ResumeSkillsSection,
  ResumeEducationSection,
} from "@/components/Resume";
import { extractCategorizedSkills } from "@/lib/resume-skills";
import {
  getResumeProfile,
  localizeResumeProjectName,
  localizeResumeTerm,
} from "@/lib/resume-format";
import styles from "../application-detail.module.scss";

interface TailoredResumeTabProps {
  tailoredResume: TailoredResumeDto | null;
  profile: MasterProfileDto | null;
  isEditingResume: boolean;
  isSavingResume: boolean;
  isTailoring: boolean;
  onTailor: () => void;
  onSaveResume: (data: TailoredResumeFormInput) => Promise<void>;
  onCancelEditing: () => void;
}

export function TailoredResumeTab({
  tailoredResume,
  profile,
  isEditingResume,
  isSavingResume,
  isTailoring,
  onTailor,
  onSaveResume,
  onCancelEditing,
}: TailoredResumeTabProps) {
  const [newSkillText, setNewSkillText] = useState("");

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TailoredResumeFormInput>({
    resolver: zodResolver(tailoredResumeFormSchema),
    defaultValues: tailoredResume
      ? {
          resumeId: tailoredResume.id,
          targetedHeadline: tailoredResume.targetedHeadline || "",
          reframedSummary: tailoredResume.reframedSummary || "",
          highlightedSkills: tailoredResume.highlightedSkills || [],
          tailoredExperiences: tailoredResume.tailoredExperiences || [],
          tailoredProjects: tailoredResume.tailoredProjects || [],
        }
      : undefined,
  });

  const { fields: experienceFields, update: updateExperience } = useFieldArray({
    control,
    name: "tailoredExperiences",
  });

  const { fields: projectFields, update: updateProject } = useFieldArray({
    control,
    name: "tailoredProjects",
  });

  useEffect(() => {
    if (tailoredResume) {
      reset({
        resumeId: tailoredResume.id,
        targetedHeadline: tailoredResume.targetedHeadline || "",
        reframedSummary: tailoredResume.reframedSummary || "",
        highlightedSkills: tailoredResume.highlightedSkills || [],
        tailoredExperiences: tailoredResume.tailoredExperiences || [],
        tailoredProjects: tailoredResume.tailoredProjects || [],
      });
    }
  }, [tailoredResume, isEditingResume, reset]);

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

  const formValues = watch();
  const currentResume = isEditingResume ? formValues : tailoredResume;
  const isEn = tailoredResume.language === "EN";
  // Tailored resumes in both languages are generated from the canonical
  // profile. Using englishCv here would reintroduce the old split-brain data
  // problem in the rendered skills, education and language sections.
  const activeProfile = getResumeProfile(profile, isEn);
  const rawLocation = activeProfile?.location || profile?.location;
  const displayLocation =
    isEn && rawLocation && !rawLocation.toLowerCase().includes("brazil")
      ? `${rawLocation}, Brazil`
      : rawLocation;

  const currentHighlightedSkills = watch("highlightedSkills") || [];

  const handleAddSkill = () => {
    const trimmed = newSkillText.trim();
    if (!trimmed) return;
    if (!currentHighlightedSkills.includes(trimmed)) {
      setValue("highlightedSkills", [...currentHighlightedSkills, trimmed], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    setNewSkillText("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setValue(
      "highlightedSkills",
      currentHighlightedSkills.filter((s) => s !== skillToRemove),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const handleAddExperienceBullet = (expIdx: number) => {
    const currentExp = experienceFields[expIdx];
    if (!currentExp) return;
    const currentHighlights = currentExp.reframedHighlights || [];
    updateExperience(expIdx, {
      ...currentExp,
      reframedHighlights: [
        ...currentHighlights,
        isEn
          ? "New achievement or strategic responsibility..."
          : "Nova realização ou responsabilidade estratégica...",
      ],
    });
  };

  const handleRemoveExperienceBullet = (expIdx: number, bIdx: number) => {
    const currentExp = experienceFields[expIdx];
    if (!currentExp) return;
    const currentHighlights = (currentExp.reframedHighlights || []).filter(
      (_, idx) => idx !== bIdx,
    );
    updateExperience(expIdx, {
      ...currentExp,
      reframedHighlights: currentHighlights,
    });
  };

  const handleAddProjectBullet = (projIdx: number) => {
    const currentProj = projectFields[projIdx];
    if (!currentProj) return;
    const currentHighlights = currentProj.reframedHighlights || [];
    updateProject(projIdx, {
      ...currentProj,
      reframedHighlights: [
        ...currentHighlights,
        isEn ? "New project highlight..." : "Novo destaque do projeto...",
      ],
    });
  };

  const handleRemoveProjectBullet = (projIdx: number, bIdx: number) => {
    const currentProj = projectFields[projIdx];
    if (!currentProj) return;
    const currentHighlights = (currentProj.reframedHighlights || []).filter(
      (_, idx) => idx !== bIdx,
    );
    updateProject(projIdx, {
      ...currentProj,
      reframedHighlights: currentHighlights,
    });
  };

  const handleDiscard = () => {
    reset();
    onCancelEditing();
  };

  const onSubmitForm = async (data: TailoredResumeFormInput) => {
    await onSaveResume(data);
  };

  return (
    <div>
      <form
        id="tailored-resume-form"
        onSubmit={handleSubmit(onSubmitForm)}
        className={`${styles.resumePreviewCard} ats-print-container`}
        aria-busy={isTailoring || isSavingResume}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "0.5rem",
          }}
          className="no-print"
        >
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
                  ? "Manual Edit Mode Active — Form validated with Zod in real-time."
                  : "Modo de Edição Manual Ativo — Formulário validado com Zod em tempo real."}
              </span>
            </div>
            <div className={styles.editModeActions}>
              <button
                type="submit"
                className={styles.bannerSaveBtn}
                disabled={isSavingResume}
              >
                <Save size={14} />
                <span>
                  {isSavingResume
                    ? isEn
                      ? "Saving..."
                      : "Salvando..."
                    : isEn
                      ? "Save Changes"
                      : "Salvar Alterações"}
                </span>
              </button>
              <button
                type="button"
                className={styles.bannerDiscardBtn}
                onClick={handleDiscard}
              >
                <X size={14} />
                <span>{isEn ? "Discard" : "Descartar"}</span>
              </button>
            </div>
          </div>
        )}

        <Controller
          control={control}
          name="targetedHeadline"
          render={({ field }) => (
            <div>
              <ResumeHeader
                fullName={activeProfile?.fullName || "Candidato"}
                headline={
                  isEditingResume
                    ? field.value || ""
                    : sanitizeHeadline(currentResume?.targetedHeadline) ||
                      (isEn ? "Software Engineer" : "Engenheiro de Software")
                }
                location={displayLocation}
                phone={activeProfile?.phone}
                email={activeProfile?.email}
                linkedinUrl={activeProfile?.linkedinUrl}
                githubUrl={activeProfile?.githubUrl}
                portfolioUrl={activeProfile?.portfolioUrl}
                isEditing={isEditingResume}
                onUpdateHeadline={field.onChange}
                headlinePlaceholder="Headline do currículo..."
              />
              {errors.targetedHeadline && isEditingResume && (
                <p
                  style={{
                    color: "#ef4444",
                    fontSize: "0.78rem",
                    textAlign: "center",
                    marginTop: "-0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  {errors.targetedHeadline.message}
                </p>
              )}
            </div>
          )}
        />

        <section className={styles.atsSection}>
          <h2 className={styles.atsSectionTitle}>
            {isEn ? "Professional Summary" : "Resumo Profissional"}
          </h2>
          {isEditingResume ? (
            <div>
              <textarea
                className={styles.atsTextarea}
                {...register("reframedSummary")}
                rows={4}
              />
              {errors.reframedSummary && (
                <p
                  style={{
                    color: "#ef4444",
                    fontSize: "0.78rem",
                    marginTop: "0.2rem",
                  }}
                >
                  {errors.reframedSummary.message}
                </p>
              )}
            </div>
          ) : (
            <p className={styles.atsParagraph}>
              {currentResume?.reframedSummary}
            </p>
          )}
        </section>

        <ResumeSkillsSection
          skills={extractCategorizedSkills(
            activeProfile,
            isEditingResume
              ? currentHighlightedSkills
              : currentResume?.highlightedSkills,
          )}
          highlightedSkills={
            isEditingResume
              ? currentHighlightedSkills
              : currentResume?.highlightedSkills
          }
          isEn={isEn}
          isEditing={isEditingResume}
          newSkillText={newSkillText}
          onNewSkillTextChange={setNewSkillText}
          onAddSkill={handleAddSkill}
          onRemoveSkill={handleRemoveSkill}
        />

        <section className={styles.atsSection}>
          <h2 className={styles.atsSectionTitle}>
            {isEn ? "Professional Experience" : "Experiência Profissional"}
          </h2>
          {(isEditingResume
            ? experienceFields
            : currentResume?.tailoredExperiences || []
          ).map((exp, idx) => (
            <div
              key={"id" in exp ? String(exp.id) : exp.experienceId || idx}
              className={styles.atsItem}
            >
              <div className={styles.atsItemHeader}>
                <div>
                  <span className={styles.atsItemRole}>{exp.position}</span>{" "}
                  {" — "}{" "}
                  <span className={styles.atsItemCompany}>{exp.company}</span>
                </div>
                <span className={styles.atsItemPeriod}>
                  {normalizePeriod(exp.period, isEn)}
                  {exp.location ? ` | ${exp.location}` : ""}
                </span>
              </div>

              {isEditingResume ? (
                <div style={{ marginTop: "0.4rem" }}>
                  {(
                    watch(`tailoredExperiences.${idx}.reframedHighlights`) || []
                  ).map((_bullet, bIdx) => (
                    <div key={bIdx} className={styles.atsBulletRow}>
                      <textarea
                        className={styles.atsBulletTextarea}
                        {...register(
                          `tailoredExperiences.${idx}.reframedHighlights.${bIdx}`,
                        )}
                      />
                      <button
                        type="button"
                        className={styles.atsDeleteBulletBtn}
                        onClick={() => handleRemoveExperienceBullet(idx, bIdx)}
                        title={isEn ? "Remove bullet" : "Remover bullet"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={`${styles.atsAddBulletBtn} no-print`}
                    onClick={() => handleAddExperienceBullet(idx)}
                  >
                    <Plus size={13} />
                    <span>
                      {isEn ? "Add bullet point" : "Adicionar realização"}
                    </span>
                  </button>
                </div>
              ) : (
                <ul className={styles.atsBullets}>
                  {exp.reframedHighlights?.map((bullet, bIdx) => (
                    <li key={bIdx}>{bullet}</li>
                  ))}
                </ul>
              )}

              {exp.technologies && exp.technologies.length > 0 && (
                <div className={styles.atsTechLine}>
                  <strong>{isEn ? "Technologies:" : "Tecnologias:"}</strong>{" "}
                  {exp.technologies
                    .map((technology) => localizeResumeTerm(technology, isEn))
                    .join(", ")}
                </div>
              )}
            </div>
          ))}
        </section>

        {(isEditingResume
          ? projectFields.length > 0
          : (currentResume?.tailoredProjects || []).length > 0) && (
          <section className={styles.atsSection}>
            <h2 className={styles.atsSectionTitle}>
              {isEn ? "Projects" : "Projetos"}
            </h2>
            {(isEditingResume
              ? projectFields
              : currentResume?.tailoredProjects || []
            ).map((proj, idx) => (
              <div
                key={"id" in proj ? String(proj.id) : proj.projectId || idx}
                className={styles.atsItem}
              >
                <div className={styles.atsItemHeader}>
                  <span className={styles.atsItemRole}>
                    {localizeResumeProjectName(proj.name, isEn)}
                  </span>
                  {proj.url && (
                    <span className={styles.atsItemPeriod}>{proj.url}</span>
                  )}
                </div>

                {isEditingResume ? (
                  <div style={{ marginTop: "0.4rem" }}>
                    {(
                      watch(`tailoredProjects.${idx}.reframedHighlights`) || []
                    ).map((_bullet, bIdx) => (
                      <div key={bIdx} className={styles.atsBulletRow}>
                        <textarea
                          className={styles.atsBulletTextarea}
                          {...register(
                            `tailoredProjects.${idx}.reframedHighlights.${bIdx}`,
                          )}
                        />
                        <button
                          type="button"
                          className={styles.atsDeleteBulletBtn}
                          onClick={() => handleRemoveProjectBullet(idx, bIdx)}
                          title={isEn ? "Remove bullet" : "Remover realização"}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={`${styles.atsAddBulletBtn} no-print`}
                      onClick={() => handleAddProjectBullet(idx)}
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
                    {proj.reframedHighlights?.map((bullet, bIdx) => (
                      <li key={bIdx}>{bullet}</li>
                    ))}
                  </ul>
                )}

                {proj.technologies && proj.technologies.length > 0 && (
                  <div className={styles.atsTechLine}>
                    <strong>{isEn ? "Stack:" : "Tecnologias:"}</strong>{" "}
                    {proj.technologies
                      .map((technology) => localizeResumeTerm(technology, isEn))
                      .join(", ")}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        <ResumeEducationSection
          educations={activeProfile?.educations}
          certifications={activeProfile?.certifications}
          isEn={isEn}
        />
      </form>
    </div>
  );
}
