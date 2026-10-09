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
    skills.professional.length > 0 ||
    skills.handsOn.length > 0 ||
    skills.familiar.length > 0;

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

        {skills.professional.length > 0 && (
          <p>
            <strong>
              {isEn ? "Core Technologies:" : "Tecnologias Principais:"}
            </strong>{" "}
            {skills.professional
              .map((skill) => localizeResumeTerm(skill, isEn))
              .join(", ")}
            .
          </p>
        )}

        {skills.handsOn.length > 0 && (
          <p>
            <strong>
              {isEn ? "Testing & Tooling:" : "Testes & Ferramentas:"}
            </strong>{" "}
            {skills.handsOn
              .map((skill) => localizeResumeTerm(skill, isEn))
              .join(", ")}
            .
          </p>
        )}

        {skills.familiar.length > 0 && (
          <p>
            <strong>
              {isEn ? "Additional Technologies:" : "Tecnologias Adicionais:"}
            </strong>{" "}
            {skills.familiar
              .map((skill) => localizeResumeTerm(skill, isEn))
              .join(", ")}
            .
          </p>
        )}
      </div>
    </section>
  );
}
