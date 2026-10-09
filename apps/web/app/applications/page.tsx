"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  MapPin,
  ExternalLink,
  Calendar,
  SearchX,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import {
  JobApplicationDto,
  JobApplicationSortBy,
  ApplicationStatus,
} from "@tailored-cv/types";
import { useDebounce } from "@/hooks";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal/DeleteConfirmModal";
import { ApplicationsFilters } from "./components/ApplicationsFilters";
import { ApplicationsPagination } from "./components/ApplicationsPagination";
import styles from "./applications.module.scss";

const ITEMS_PER_PAGE = 12;

interface StatusStyle {
  label: string;
  bg: string;
  color: string;
  border: string;
}

const DEFAULT_STATUS_STYLE: StatusStyle = {
  label: "Rascunho",
  bg: "rgba(148, 163, 184, 0.1)",
  color: "#94a3b8",
  border: "rgba(148, 163, 184, 0.2)",
};

const STATUS_CONFIG: Record<string, StatusStyle> = {
  DRAFT: DEFAULT_STATUS_STYLE,
  ANALYZED: {
    label: "Analisada",
    bg: "rgba(56, 189, 248, 0.1)",
    color: "#38bdf8",
    border: "rgba(56, 189, 248, 0.25)",
  },
  TAILORED: {
    label: "Adaptada",
    bg: "rgba(16, 185, 129, 0.1)",
    color: "#10b981",
    border: "rgba(16, 185, 129, 0.25)",
  },
};

function formatApplicationDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApplicationDto[]>([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobApplicationDto | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedStack, setSelectedStack] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState<JobApplicationSortBy>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const loadApplications = useCallback(
    async (pageToLoad: number) => {
      setIsFetching(true);
      try {
        const response = await api.getApplications({
          page: pageToLoad,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch.trim() || undefined,
          status:
            selectedStatus !== "ALL"
              ? (selectedStatus as ApplicationStatus)
              : undefined,
          stack: selectedStack !== "ALL" ? selectedStack : undefined,
          sortBy,
        });

        setApplications(response.data);
        setTotalApplications(response.total);
        setTotalPages(response.totalPages);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao carregar candidaturas",
        );
      } finally {
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    [debouncedSearch, selectedStatus, selectedStack, sortBy],
  );

  useEffect(() => {
    setCurrentPage(1);
    loadApplications(1);
  }, [
    debouncedSearch,
    selectedStack,
    selectedStatus,
    sortBy,
    loadApplications,
  ]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadApplications(newPage);
  };

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
      toast.success("Candidatura removida com sucesso!");
      setDeleteTarget(null);
      await loadApplications(currentPage);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao excluir candidatura",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSelectedStack("ALL");
    setSelectedStatus("ALL");
    setSortBy("newest");
  };

  const hasActiveFilters =
    searchInput.trim().length > 0 ||
    selectedStack !== "ALL" ||
    selectedStatus !== "ALL" ||
    sortBy !== "newest";

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

      <ApplicationsFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        selectedStack={selectedStack}
        onStackChange={setSelectedStack}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        sortBy={sortBy}
        onSortByChange={(val) => setSortBy(val as JobApplicationSortBy)}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        totalResults={totalApplications}
        totalAll={totalApplications}
      />

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "5rem", color: "#94a3b8" }}>
          Carregando candidaturas...
        </div>
      ) : totalApplications === 0 ? (
        hasActiveFilters ? (
          <div className={styles.noResultsCard}>
            <SearchX size={36} color="#64748b" />
            <h3 className={styles.noResultsTitle}>Nenhuma vaga encontrada</h3>
            <p className={styles.noResultsDescription}>
              Não encontramos vagas correspondentes aos filtros aplicados.
            </p>
            <button
              type="button"
              className={styles.resetFiltersBtn}
              onClick={handleResetFilters}
            >
              <RotateCcw size={14} />
              <span>Limpar filtros</span>
            </button>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Briefcase
              size={40}
              color="#64748b"
              style={{ margin: "0 auto 1rem" }}
            />
            <h3 className={styles.emptyTitle}>
              Nenhuma candidatura registrada
            </h3>
            <p className={styles.emptyDescription}>
              Comece cadastrando uma vaga para analisar os requisitos e adaptar
              seu currículo.
            </p>
            <Link href="/applications/new" className={styles.newButton}>
              <Plus size={16} />
              <span>Cadastrar Primeira Vaga</span>
            </Link>
          </div>
        )
      ) : (
        <>
          <div
            className={styles.grid}
            style={{
              opacity: isFetching ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {applications.map((app) => {
              const statusInfo: StatusStyle =
                STATUS_CONFIG[app.status] ?? DEFAULT_STATUS_STYLE;
              const formattedDate = formatApplicationDate(app.createdAt);

              return (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className={styles.card}
                >
                  <div>
                    <div className={styles.cardTopMeta}>
                      {formattedDate && (
                        <span className={styles.dateBadge}>
                          <Calendar size={12} />
                          <span>{formattedDate}</span>
                        </span>
                      )}

                      <span
                        className={styles.statusBadge}
                        style={{
                          backgroundColor: statusInfo.bg,
                          color: statusInfo.color,
                          borderColor: statusInfo.border,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

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
                          className={styles.externalLinkBtn}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (app.url) {
                              window.open(
                                app.url,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }
                          }}
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
                          <span>{app.jobAnalysis.matchScore}%</span>
                        </span>
                      ) : (
                        <span className={styles.unratedBadge}>
                          Não analisada
                        </span>
                      )}

                      {app.jobAnalysis?.seniorityLevel && (
                        <span className={styles.seniorityTag}>
                          {app.jobAnalysis.seniorityLevel}
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
              );
            })}
          </div>

          <ApplicationsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalApplications}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </>
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
