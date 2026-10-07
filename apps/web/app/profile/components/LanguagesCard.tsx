"use client";

import { Languages, Edit3, Save, X, Plus, Trash2 } from "lucide-react";
import { CertificationDto } from "@tailored-cv/types";
import styles from "../profile.module.scss";

interface LanguagesCardProps {
  certifications: CertificationDto[];
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onAddLanguage: () => void;
  onRemoveLanguage: (idx: number) => void;
  onUpdateLanguage: <K extends keyof CertificationDto>(
    idx: number,
    field: K,
    value: CertificationDto[K],
  ) => void;
}

export function LanguagesCard({
  certifications,
  isEditing,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onAddLanguage,
  onRemoveLanguage,
  onUpdateLanguage,
}: LanguagesCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <h2 className={styles.cardTitle}>
          <Languages size={20} className={styles.icon} />
          <span>Idiomas ({certifications.length})</span>
        </h2>
        <div className={styles.sectionActions}>
          {isEditing ? (
            <>
              <button
                type="button"
                className={styles.addItemButton}
                onClick={onAddLanguage}
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

      {certifications.length === 0 ? (
        <div className={styles.emptyStateNotice}>Nenhum idioma cadastrado.</div>
      ) : isEditing ? (
        certifications.map((c, idx) => (
          <div key={c.id || idx} className={styles.editableItemCard}>
            <div className={styles.itemCardHeader}>
              <span className={styles.itemIndexBadge}>
                #{idx + 1} • {c.name || "Novo Idioma"}
              </span>
              <button
                type="button"
                className={styles.deleteItemButton}
                onClick={() => onRemoveLanguage(idx)}
                title="Remover idioma"
              >
                <Trash2 size={14} />
                <span>Remover</span>
              </button>
            </div>

            <div className={styles.formGroup}>
              <label>Idioma</label>
              <input
                value={c.name}
                placeholder="Ex: Inglês, Espanhol, Francês, Português"
                onChange={(e) => onUpdateLanguage(idx, "name", e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Nível de Fluência / Proficiência</label>
              <input
                value={c.issuer}
                placeholder="Ex: Fluente / Avançado (C2), Intermediário (B2), Nativo"
                onChange={(e) =>
                  onUpdateLanguage(idx, "issuer", e.target.value)
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Certificação / Detalhes (Opcional)</label>
              <input
                value={c.issueDate || ""}
                placeholder="Ex: TOEFL iBT 110 / Certificado Cambridge"
                onChange={(e) =>
                  onUpdateLanguage(idx, "issueDate", e.target.value)
                }
              />
            </div>
          </div>
        ))
      ) : (
        certifications.map((c, idx) => (
          <div
            key={c.id || idx}
            style={{
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "0.75rem",
              borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: "#f1f5f9",
                  fontSize: "0.95rem",
                }}
              >
                {c.name}
              </div>
              {c.issueDate && (
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "#64748b",
                    marginTop: "0.15rem",
                  }}
                >
                  {c.issueDate}
                </div>
              )}
            </div>
            <span className={styles.languageBadge}>{c.issuer}</span>
          </div>
        ))
      )}
    </div>
  );
}
