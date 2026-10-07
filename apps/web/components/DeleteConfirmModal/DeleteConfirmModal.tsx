"use client";

import { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import styles from "./DeleteConfirmModal.module.scss";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemTitle?: string;
  itemSubtitle?: string;
  isLoading?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Excluir Candidatura",
  description = "Tem certeza que deseja excluir esta candidatura? Esta ação removerá o histórico, a análise ATS e os currículos adaptados associados.",
  itemTitle,
  itemSubtitle,
  isLoading = false,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true">
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          disabled={isLoading}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className={styles.iconContainer}>
          <div className={styles.iconRing}>
            <AlertTriangle size={24} className={styles.icon} />
          </div>
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>

          {(itemTitle || itemSubtitle) && (
            <div className={styles.itemBox}>
              {itemTitle && <div className={styles.itemTitle}>{itemTitle}</div>}
              {itemSubtitle && (
                <div className={styles.itemSubtitle}>{itemSubtitle}</div>
              )}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
            disabled={isLoading}
          >
            <Trash2 size={16} />
            <span>{isLoading ? "Excluindo..." : "Sim, Excluir"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
