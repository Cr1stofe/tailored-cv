"use client";

import { FolderGit2, Edit3, Save, X, Plus, Trash2 } from "lucide-react";
import { ProjectDto } from "@tailored-cv/types";
import styles from "../profile.module.scss";

interface ProjectsCardProps {
  projects: ProjectDto[];
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onAddProject: () => void;
  onRemoveProject: (idx: number) => void;
  onUpdateProject: <K extends keyof ProjectDto>(
    idx: number,
    field: K,
    value: ProjectDto[K],
  ) => void;
  onAddHighlight: (projIdx: number) => void;
  onUpdateHighlight: (projIdx: number, hIdx: number, value: string) => void;
  onRemoveHighlight: (projIdx: number, hIdx: number) => void;
}

export function ProjectsCard({
  projects,
  isEditing,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onAddProject,
  onRemoveProject,
  onUpdateProject,
  onAddHighlight,
  onUpdateHighlight,
  onRemoveHighlight,
}: ProjectsCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <h2 className={styles.cardTitle}>
          <FolderGit2 size={20} className={styles.icon} />
          <span>Projetos em Destaque ({projects.length})</span>
        </h2>
        <div className={styles.sectionActions}>
          {isEditing ? (
            <>
              <button
                type="button"
                className={styles.addItemButton}
                onClick={onAddProject}
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

      {projects.length === 0 ? (
        <div className={styles.emptyStateNotice}>
          Nenhum projeto cadastrado.
        </div>
      ) : isEditing ? (
        projects.map((proj, idx) => (
          <div key={proj.id || idx} className={styles.editableItemCard}>
            <div className={styles.itemCardHeader}>
              <span className={styles.itemIndexBadge}>
                #{idx + 1} • {proj.name || "Novo Projeto"}
              </span>
              <button
                type="button"
                className={styles.deleteItemButton}
                onClick={() => onRemoveProject(idx)}
                title="Remover este projeto"
              >
                <Trash2 size={14} />
                <span>Remover</span>
              </button>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label>Nome do Projeto</label>
                <input
                  value={proj.name}
                  placeholder="Ex: Tailored CV Engine"
                  onChange={(e) => onUpdateProject(idx, "name", e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>URL / Repositório / Demo</label>
                <input
                  value={proj.url || ""}
                  placeholder="Ex: https://github.com/..."
                  onChange={(e) => onUpdateProject(idx, "url", e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Descrição Arquitetural / Objetivo</label>
              <textarea
                style={{ minHeight: "80px" }}
                value={proj.description}
                placeholder="Resuma o propósito e o diferencial deste projeto..."
                onChange={(e) =>
                  onUpdateProject(idx, "description", e.target.value)
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Tecnologias Utilizadas (separadas por vírgula)</label>
              <input
                value={(proj.technologies || []).join(", ")}
                placeholder="Ex: React, Next.js, NestJS, Docker, PostgreSQL"
                onChange={(e) =>
                  onUpdateProject(
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
                <span>Destaques Técnicos do Projeto (Bullets)</span>
                <button
                  type="button"
                  className={styles.addBulletBtn}
                  onClick={() => onAddHighlight(idx)}
                >
                  <Plus size={13} />
                  <span>Adicionar Destaque</span>
                </button>
              </div>
              {(proj.highlights || []).map((h, hIdx) => (
                <div key={hIdx} className={styles.bulletRow}>
                  <input
                    value={h}
                    placeholder="Descreva uma funcionalidade ou métrica atingida..."
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
        projects.map((proj, idx) => (
          <div key={proj.id || idx} className={styles.itemCard}>
            <div className={styles.itemHeader}>
              <div className={styles.itemTitle}>{proj.name}</div>
              {proj.url && (
                <a
                  href={proj.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.itemCompany}
                >
                  {proj.url}
                </a>
              )}
            </div>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
              {proj.description}
            </p>
            <ul className={styles.bulletList}>
              {proj.highlights.map((h, hIdx) => (
                <li key={hIdx}>{h}</li>
              ))}
            </ul>
            <div className={styles.techPills}>
              {proj.technologies.map((t, tIdx) => (
                <span key={tIdx}>{t}</span>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
