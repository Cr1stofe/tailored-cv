"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { JobApplicationDto } from "@tailored-cv/types";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal/DeleteConfirmModal";
import styles from "./applications.module.scss";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApplicationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<JobApplicationDto | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    try {
      const data = await api.getApplications();
      setApplications(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao carregar candidaturas",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenDeleteModal = (
    app: JobApplicationDto,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(app);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      await api.deleteApplication(deleteTarget.id);
      setApplications((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success("Candidatura removida com sucesso!");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao excluir candidatura",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Candidaturas</h1>
          <p className={styles.subtitle}>
            Gerencie suas vagas e gere currículos adaptados com máxima aderência
            às exigências da oportunidade.
          </p>
        </div>
        <Link href="/applications/new" className={styles.newButton}>
          <Plus size={16} />
          <span>Nova Candidatura</span>
        </Link>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "5rem", color: "#94a3b8" }}>
          Carregando candidaturas...
        </div>
      ) : applications.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "5rem 2rem",
            background: "rgba(16, 22, 34, 0.75)",
            borderRadius: "16px",
            border: "1px solid rgba(148, 163, 184, 0.12)",
          }}
        >
          <Briefcase
            size={40}
            color="#64748b"
            style={{ margin: "0 auto 1rem" }}
          />
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#f1f5f9",
              marginBottom: "0.5rem",
            }}
          >
            Nenhuma candidatura registrada
          </h3>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            Comece cadastrando uma vaga para analisar os requisitos e adaptar
            seu currículo.
          </p>
          <Link href="/applications/new" className={styles.newButton}>
            <Plus size={16} />
            <span>Cadastrar Primeira Vaga</span>
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {applications.map((app) => (
            <Link
              key={app.id}
              href={`/applications/${app.id}`}
              className={styles.card}
            >
              <div>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.position}>{app.position}</h3>
                    <div className={styles.company}>
                      <span>{app.company}</span>
                      {app.location && (
                        <>
                          <span>•</span>
                          <MapPin size={12} />
                          <span>{app.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {app.url && (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (app.url) {
                          window.open(app.url, "_blank", "noopener,noreferrer");
                        }
                      }}
                      style={{ color: "#64748b" }}
                      title="Abrir link da vaga"
                    >
                      <ExternalLink size={15} />
                    </button>
                  )}
                </div>

                <p className={styles.descriptionSnippet}>
                  {app.jobDescription}
                </p>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.metaInfo}>
                  {app.jobAnalysis ? (
                    <span className={styles.scoreBadge}>
                      <Sparkles size={12} />
                      {app.jobAnalysis.matchScore}%
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                      }}
                    >
                      Não analisada
                    </span>
                  )}
                </div>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={(e) => handleOpenDeleteModal(app, e)}
                    title="Excluir candidatura"
                  >
                    <Trash2 size={15} />
                  </button>
                  <span className={styles.viewLink}>
                    <span>Ver detalhes</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Candidatura"
        description="Tem certeza que deseja excluir esta candidatura? Todo o histórico de análise de requisitos e currículos adaptados associados a ela serão removidos permanentemente."
        itemTitle={deleteTarget?.position}
        itemSubtitle={deleteTarget?.company}
        isLoading={isDeleting}
      />
    </div>
  );
}
