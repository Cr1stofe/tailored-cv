"use client";

import { Briefcase, Edit3, Save, X, Plus, Trash2 } from "lucide-react";
import { ExperienceDto } from "@tailored-cv/types";
import styles from "../profile.module.scss";

interface ExperiencesCardProps {
  experiences: ExperienceDto[];
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onAddExperience: () => void;
  onRemoveExperience: (idx: number) => void;
  onUpdateExperience: <K extends keyof ExperienceDto>(
    idx: number,
    field: K,
    value: ExperienceDto[K],
  ) => void;
  onAddHighlight: (expIdx: number) => void;
  onUpdateHighlight: (expIdx: number, hIdx: number, value: string) => void;
  onRemoveHighlight: (expIdx: number, hIdx: number) => void;
}

export function ExperiencesCard({
  experiences,
  isEditing,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onAddExperience,
  onRemoveExperience,
  onUpdateExperience,
  onAddHighlight,
  onUpdateHighlight,
  onRemoveHighlight,
}: ExperiencesCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <h2 className={styles.cardTitle}>
          <Briefcase size={20} className={styles.icon} />
          <span>Experiências Profissionais Reais ({experiences.length})</span>
        </h2>
        <div className={styles.sectionActions}>
          {isEditing ? (
            <>
              <button
                type="button"
                className={styles.addItemButton}
                onClick={onAddExperience}
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

      {experiences.length === 0 ? (
        <div className={styles.emptyStateNotice}>
          Nenhuma experiência cadastrada.
        </div>
      ) : isEditing ? (
        experiences.map((exp, idx) => (
          <div key={exp.id || idx} className={styles.editableItemCard}>
            <div className={styles.itemCardHeader}>
              <span className={styles.itemIndexBadge}>
                #{idx + 1} • {exp.position || "Sem cargo"} @{" "}
                {exp.company || "Sem empresa"}
              </span>
              <button
                type="button"
                className={styles.deleteItemButton}
                onClick={() => onRemoveExperience(idx)}
                title="Remover esta experiência"
              >
                <Trash2 size={14} />
                <span>Remover</span>
              </button>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Cargo / Função</label>
                <input
                  value={exp.position}
                  placeholder="Ex: Senior Full Stack Engineer"
                  onChange={(e) =>
                    onUpdateExperience(idx, "position", e.target.value)
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>Empresa</label>
                <input
                  value={exp.company}
                  placeholder="Ex: Tech Corp"
                  onChange={(e) =>
                    onUpdateExperience(idx, "company", e.target.value)
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>Localização (Cidade, Estado / Remoto)</label>
                <input
                  value={exp.location || ""}
                  placeholder="Ex: São Paulo, SP (Remoto)"
                  onChange={(e) =>
                    onUpdateExperience(idx, "location", e.target.value)
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>Período de Início</label>
                <input
                  value={exp.startDate}
                  placeholder="Ex: 2022 ou Jan 2022"
                  onChange={(e) =>
                    onUpdateExperience(idx, "startDate", e.target.value)
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>Período de Término</label>
                <input
                  value={exp.endDate || ""}
                  disabled={exp.isCurrent}
                  placeholder={exp.isCurrent ? "Presente" : "Ex: 2024"}
                  onChange={(e) =>
                    onUpdateExperience(idx, "endDate", e.target.value)
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxContainer}>
                  <input
                    type="checkbox"
                    checked={exp.isCurrent}
                    onChange={(e) => {
                      onUpdateExperience(idx, "isCurrent", e.target.checked);
                      if (e.target.checked) {
                        onUpdateExperience(idx, "endDate", "Presente");
                      }
                    }}
                  />
                  <span>Atualmente trabalhando nesta empresa</span>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Tecnologias Utilizadas (separadas por vírgula)</label>
              <input
                value={(exp.technologies || []).join(", ")}
                placeholder="Ex: React, TypeScript, Next.js, Node.js, PostgreSQL"
                onChange={(e) =>
                  onUpdateExperience(
                    idx,
                    "technologies",
                    e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  )
                }
              />
            </div>

            <div className={styles.bulletsContainer}>
              <div className={styles.sectionLabel}>
                <span>Realizações de Alto Impacto (Bullets ATS)</span>
                <button
                  type="button"
                  className={styles.addBulletBtn}
                  onClick={() => onAddHighlight(idx)}
                >
                  <Plus size={13} />
                  <span>Adicionar Destaque</span>
                </button>
              </div>
              {(exp.highlights || []).map((h, hIdx) => (
                <div key={hIdx} className={styles.bulletRow}>
                  <input
                    value={h}
                    placeholder="Descreva a realização, métrica ou responsabilidade técnica..."
                    onChange={(e) =>
                      onUpdateHighlight(idx, hIdx, e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className={styles.removeBulletBtn}
                    onClick={() => onRemoveHighlight(idx, hIdx)}
                    title="Excluir este destaque"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        experiences.map((exp, idx) => (
          <div key={exp.id || idx} className={styles.itemCard}>
            <div className={styles.itemHeader}>
              <div>
                <div className={styles.itemTitle}>{exp.position}</div>
                <div className={styles.itemCompany}>{exp.company}</div>
              </div>
              <div className={styles.itemPeriod}>
                {exp.startDate} —{" "}
                {exp.endDate || (exp.isCurrent ? "Presente" : "")}
                {exp.location && ` • ${exp.location}`}
              </div>
            </div>
            <ul className={styles.bulletList}>
              {exp.highlights.map((h, hIdx) => (
                <li key={hIdx}>{h}</li>
              ))}
            </ul>
            <div className={styles.techPills}>
              {exp.technologies.map((t, tIdx) => (
                <span key={tIdx}>{t}</span>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
