"use client";

import { User, Edit3, Save, X, ExternalLink } from "lucide-react";
import { MasterProfileDto } from "@tailored-cv/types";
import styles from "../profile.module.scss";

interface PersonalInfoCardProps {
  profile: MasterProfileDto;
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onChangeField: (field: keyof MasterProfileDto, value: string) => void;
}

export function PersonalInfoCard({
  profile,
  isEditing,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onChangeField,
}: PersonalInfoCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <h2 className={styles.cardTitle}>
          <User size={20} className={styles.icon} />
          <span>Dados Pessoais & Links de Contato</span>
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

      {isEditing ? (
        <>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label htmlFor="fullName">Nome Completo</label>
              <input
                id="fullName"
                value={profile.fullName}
                onChange={(e) => onChangeField("fullName", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">E-mail Profissional</label>
              <input
                id="email"
                value={profile.email}
                onChange={(e) => onChangeField("email", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone">Telefone / WhatsApp</label>
              <input
                id="phone"
                value={profile.phone || ""}
                onChange={(e) => onChangeField("phone", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="location">Localização</label>
              <input
                id="location"
                value={profile.location || ""}
                onChange={(e) => onChangeField("location", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="linkedinUrl">LinkedIn URL</label>
              <input
                id="linkedinUrl"
                value={profile.linkedinUrl || ""}
                onChange={(e) => onChangeField("linkedinUrl", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="githubUrl">GitHub URL</label>
              <input
                id="githubUrl"
                value={profile.githubUrl || ""}
                onChange={(e) => onChangeField("githubUrl", e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="portfolioUrl">Portfolio / Website URL</label>
              <input
                id="portfolioUrl"
                value={profile.portfolioUrl || ""}
                onChange={(e) => onChangeField("portfolioUrl", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: "0.5rem" }}>
            <label htmlFor="summary">Sumário Executivo Original (Base)</label>
            <textarea
              id="summary"
              value={profile.summary || ""}
              onChange={(e) => onChangeField("summary", e.target.value)}
            />
          </div>
        </>
      ) : (
        <div>
          <div className={styles.personalViewGrid}>
            <div className={styles.viewField}>
              <span className={styles.fieldLabel}>Nome Completo</span>
              <span className={styles.fieldValue}>{profile.fullName}</span>
            </div>
            <div className={styles.viewField}>
              <span className={styles.fieldLabel}>E-mail</span>
              <span className={styles.fieldValue}>{profile.email}</span>
            </div>
            {profile.phone && (
              <div className={styles.viewField}>
                <span className={styles.fieldLabel}>Telefone / WhatsApp</span>
                <span className={styles.fieldValue}>{profile.phone}</span>
              </div>
            )}
            {profile.location && (
              <div className={styles.viewField}>
                <span className={styles.fieldLabel}>Localização</span>
                <span className={styles.fieldValue}>{profile.location}</span>
              </div>
            )}
            {profile.linkedinUrl && (
              <div className={styles.viewField}>
                <span className={styles.fieldLabel}>LinkedIn</span>
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.fieldLink}
                >
                  <span>{profile.linkedinUrl}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
            {profile.githubUrl && (
              <div className={styles.viewField}>
                <span className={styles.fieldLabel}>GitHub</span>
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.fieldLink}
                >
                  <span>{profile.githubUrl}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
            {profile.portfolioUrl && (
              <div className={styles.viewField}>
                <span className={styles.fieldLabel}>Portfólio / Site</span>
                <a
                  href={profile.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.fieldLink}
                >
                  <span>{profile.portfolioUrl}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {profile.summary && (
            <div className={styles.viewField} style={{ marginTop: "1rem" }}>
              <span
                className={styles.fieldLabel}
                style={{ marginBottom: "0.4rem" }}
              >
                Sumário Executivo (Base)
              </span>
              <div className={styles.summaryViewBox}>{profile.summary}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
