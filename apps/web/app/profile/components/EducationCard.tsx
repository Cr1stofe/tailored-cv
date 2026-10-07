"use client";

import { GraduationCap, Edit3, Save, X, Plus, Trash2 } from "lucide-react";
import { EducationDto } from "@tailored-cv/types";
import styles from "../profile.module.scss";

interface EducationCardProps {
  educations: EducationDto[];
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onAddEducation: () => void;
  onRemoveEducation: (idx: number) => void;
  onUpdateEducation: <K extends keyof EducationDto>(
    idx: number,
    field: K,
    value: EducationDto[K],
  ) => void;
}

export function EducationCard({
  educations,
  isEditing,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onAddEducation,
  onRemoveEducation,
  onUpdateEducation,
}: EducationCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <h2 className={styles.cardTitle}>
          <GraduationCap size={20} className={styles.icon} />
          <span>Formação Acadêmica ({educations.length})</span>
        </h2>
        <div className={styles.sectionActions}>
          {isEditing ? (
            <>
              <button
                type="button"
                className={styles.addItemButton}
                onClick={onAddEducation}
              >
                <Plus size={14} />
                <span>Adicionar</span>
              </button>
              <button
                type="button"
                className={styles.saveSectionButton}
                onClick={onSave}
                disabled={isSaving}
              >
                <Save size={14} />
                <span>Salvar</span>
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

      {educations.length === 0 ? (
        <div className={styles.emptyStateNotice}>
          Nenhuma formação acadêmica cadastrada.
        </div>
      ) : isEditing ? (
        educations.map((ed, idx) => (
          <div key={ed.id || idx} className={styles.editableItemCard}>
            <div className={styles.itemCardHeader}>
              <span className={styles.itemIndexBadge}>
                #{idx + 1} • {ed.degree || "Curso"}
              </span>
              <button
                type="button"
                className={styles.deleteItemButton}
                onClick={() => onRemoveEducation(idx)}
                title="Remover formação"
              >
                <Trash2 size={14} />
                <span>Remover</span>
              </button>
            </div>

            <div className={styles.formGroup}>
              <label>Grau / Curso</label>
              <input
                value={ed.degree}
                placeholder="Ex: Bacharelado em Ciência da Computação"
                onChange={(e) =>
                  onUpdateEducation(idx, "degree", e.target.value)
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Instituição</label>
              <input
                value={ed.institution}
                placeholder="Ex: Universidade de São Paulo"
                onChange={(e) =>
                  onUpdateEducation(idx, "institution", e.target.value)
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Área de Estudo (Opcional)</label>
              <input
                value={ed.fieldOfStudy || ""}
                placeholder="Ex: Engenharia de Software"
                onChange={(e) =>
                  onUpdateEducation(idx, "fieldOfStudy", e.target.value)
                }
              />
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Ano de Início</label>
                <input
                  value={ed.startDate || ""}
                  placeholder="Ex: 2018"
                  onChange={(e) =>
                    onUpdateEducation(idx, "startDate", e.target.value)
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>Ano de Conclusão</label>
                <input
                  value={ed.endDate || ""}
                  placeholder="Ex: 2022"
                  onChange={(e) =>
                    onUpdateEducation(idx, "endDate", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        ))
      ) : (
        educations.map((ed, idx) => (
          <div key={ed.id || idx} style={{ marginBottom: "1.25rem" }}>
            <div
              style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "0.95rem" }}
            >
              {ed.degree}
            </div>
            <div
              style={{
                fontSize: "0.875rem",
                color: "#60a5fa",
                marginTop: "0.15rem",
              }}
            >
              {ed.institution}
              {ed.fieldOfStudy && ` • ${ed.fieldOfStudy}`}
            </div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "#64748b",
                marginTop: "0.15rem",
              }}
            >
              {ed.startDate} — {ed.endDate || "Presente"}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
