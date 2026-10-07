"use client";

import { useState } from "react";
import { Cpu, Edit3, Save, X, Plus } from "lucide-react";
import { SkillCategory, MasterProfileDto } from "@tailored-cv/types";
import styles from "../profile.module.scss";

interface SkillsCardProps {
  skills: MasterProfileDto["skills"];
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onAddSkill: (name: string, category: SkillCategory) => void;
  onRemoveSkill: (skillIndex: number) => void;
}

export function SkillsCard({
  skills,
  isEditing,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onAddSkill,
  onRemoveSkill,
}: SkillsCardProps) {
  const [newSkillName, setNewSkillName] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<SkillCategory>("PROFESSIONAL");

  const professionalSkills = skills.filter(
    (s) => s.category === "PROFESSIONAL",
  );
  const handsOnSkills = skills.filter((s) => s.category === "HANDS_ON");
  const familiarSkills = skills.filter((s) => s.category === "FAMILIAR");

  const handleAdd = () => {
    if (!newSkillName.trim()) return;
    onAddSkill(newSkillName.trim(), selectedCategory);
    setNewSkillName("");
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <h2 className={styles.cardTitle}>
          <Cpu size={20} className={styles.icon} />
          <span>Competências & Tecnologias</span>
        </h2>
        <div className={styles.sectionActions}>
          {isEditing ? (
            <>
              <button
                type="button"
                className={styles.saveSectionButton}
                onClick={onSave}
                disabled={isSaving}
              >
                <Save size={14} />
                <span>{isSaving ? "Salvando..." : "Salvar"}</span>
              </button>
              <button
                type="button"
                className={styles.cancelSectionButton}
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                <X size={14} />
                <span>Cancelar</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.editSectionButton}
              onClick={onStartEdit}
            >
              <Edit3 size={14} />
              <span>Editar</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.skillsGroup}>
        <h4>
          Professional
          <span className={styles.hint}>
            (Domínio profundo, dia a dia e arquitetura)
          </span>
        </h4>
        <div className={styles.tagsContainer}>
          {professionalSkills.map((s, idx) => (
            <span
              key={`${s.name}-${idx}`}
              className={`${styles.tag} ${styles.professional}`}
            >
              {s.name}
              {isEditing && (
                <button
                  type="button"
                  onClick={() =>
                    onRemoveSkill(
                      skills.findIndex((item) => item.name === s.name),
                    )
                  }
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.skillsGroup}>
        <h4>
          Hands-On
          <span className={styles.hint}>
            (Experiência prática em projetos e produção)
          </span>
        </h4>
        <div className={styles.tagsContainer}>
          {handsOnSkills.map((s, idx) => (
            <span
              key={`${s.name}-${idx}`}
              className={`${styles.tag} ${styles.handsOn}`}
            >
              {s.name}
              {isEditing && (
                <button
                  type="button"
                  onClick={() =>
                    onRemoveSkill(
                      skills.findIndex((item) => item.name === s.name),
                    )
                  }
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.skillsGroup}>
        <h4>
          Familiar
          <span className={styles.hint}>
            (Conhecimento conceitual ou estudos)
          </span>
        </h4>
        <div className={styles.tagsContainer}>
          {familiarSkills.map((s, idx) => (
            <span
              key={`${s.name}-${idx}`}
              className={`${styles.tag} ${styles.familiar}`}
            >
              {s.name}
              {isEditing && (
                <button
                  type="button"
                  onClick={() =>
                    onRemoveSkill(
                      skills.findIndex((item) => item.name === s.name),
                    )
                  }
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {isEditing && (
        <div className={styles.addTagRow}>
          <input
            className={styles.skillInput}
            placeholder="Nova competência (ex: Next.js)..."
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className={styles.selectWrapper}>
            <select
              className={styles.skillSelect}
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as SkillCategory)
              }
            >
              <option value="PROFESSIONAL">Professional</option>
              <option value="HANDS_ON">Hands-On</option>
              <option value="FAMILIAR">Familiar</option>
            </select>
          </div>
          <button
            type="button"
            className={styles.addSkillButton}
            onClick={handleAdd}
          >
            <Plus size={16} />
            <span>Adicionar</span>
          </button>
        </div>
      )}
    </div>
  );
}
