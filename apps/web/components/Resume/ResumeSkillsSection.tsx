import { X } from "lucide-react";
import { CategorizedResumeSkills } from "@/lib/resume-skills";
import { localizeResumeTerm } from "@/lib/resume-format";
import styles from "./ResumeSkillsSection.module.scss";

export interface ResumeSkillsSectionProps {
  skills: CategorizedResumeSkills;
  highlightedSkills?: string[] | null;
  isEn?: boolean;
  isEditing?: boolean;
  newSkillText?: string;
  onNewSkillTextChange?: (val: string) => void;
  onAddSkill?: () => void;
  onRemoveSkill?: (skill: string) => void;
}

export function ResumeSkillsSection({
  skills,
  highlightedSkills,
  isEn = false,
  isEditing = false,
  newSkillText = "",
  onNewSkillTextChange,
  onAddSkill,
  onRemoveSkill,
}: ResumeSkillsSectionProps) {
  const hasAnySkills =
    skills.frontend.length > 0 ||
    skills.backend.length > 0 ||
    skills.testing.length > 0 ||
    (skills.performance?.length || 0) > 0 ||
    skills.devOps.length > 0 ||
    skills.additional.length > 0;

  if (!hasAnySkills && !isEditing) return null;

  return (
    <section className={styles.atsSection}>
      <h2 className={styles.atsSectionTitle}>
        {isEn ? "Technical Skills" : "Competências Técnicas"}
      </h2>
      <div className={styles.atsSkillsText}>
        {isEditing && (
          <div className={styles.editSkillsWrapper}>
            <p className={styles.editSkillsTitle}>
              <strong>
                {isEn
                  ? "Target Job Highlighted Skills (Injected into Categories):"
                  : "Habilidades-Chave da Vaga (Priorizadas nas Categorias):"}
              </strong>
            </p>
            <div className={styles.atsSkillsEditList}>
              {highlightedSkills?.map((skill, sIdx) => (
                <span key={sIdx} className={styles.atsSkillChip}>
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveSkill?.(skill)}
                    title={isEn ? "Remove skill" : "Remover competência"}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {onAddSkill && (
                <div className={styles.atsAddSkillForm}>
                  <input
                    type="text"
                    placeholder={
                      isEn
                        ? "Add target skill..."
                        : "Adicionar habilidade-chave..."
                    }
                    value={newSkillText}
                    onChange={(e) => onNewSkillTextChange?.(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onAddSkill();
                      }
                    }}
                  />
                  <button type="button" onClick={() => onAddSkill()}>
                    {isEn ? "Add" : "Adicionar"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {skills.frontend.length > 0 && (
          <p>
            <strong>Frontend:</strong>{" "}
            {skills.frontend
              .map((skill) => localizeResumeTerm(skill, isEn))
              .join(", ")}
            .
          </p>
        )}

        {skills.backend.length > 0 && (
          <p>
            <strong>Backend:</strong>{" "}
            {skills.backend
              .map((skill) => localizeResumeTerm(skill, isEn))
              .join(", ")}
            .
          </p>
        )}

        {skills.testing.length > 0 && (
          <p>
            <strong>{isEn ? "Testing:" : "Testes:"}</strong>{" "}
            {skills.testing
              .map((skill) => localizeResumeTerm(skill, isEn))
              .join(", ")}
            .
          </p>
        )}

        {skills.devOps.length > 0 && (
          <p>
            <strong>DevOps:</strong>{" "}
            {skills.devOps
              .map((skill) => localizeResumeTerm(skill, isEn))
              .join(", ")}
            .
          </p>
        )}

        {skills.performance && skills.performance.length > 0 && (
          <p>
            <strong>Performance:</strong>{" "}
            {skills.performance
              .map((skill) => localizeResumeTerm(skill, isEn))
              .join(", ")}
            .
          </p>
        )}

        {skills.additional.length > 0 && (
          <p>
            <strong>{isEn ? "Additional:" : "Adicionais:"}</strong>{" "}
            {skills.additional
              .map((skill) => localizeResumeTerm(skill, isEn))
              .join(", ")}
            .
          </p>
        )}
      </div>
    </section>
  );
}
