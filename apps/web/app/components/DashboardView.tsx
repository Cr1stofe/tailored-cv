"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Sparkles,
  FileCheck,
  TrendingUp,
  Plus,
  User,
  ShieldCheck,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { api } from "@/services/api";
import { JobApplicationDto } from "@tailored-cv/types";
import styles from "../page.module.scss";

export function DashboardView() {
  const [applications, setApplications] = useState<JobApplicationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  async function loadData() {
    setIsLoading(true);
    setHasError(false);
    try {
      const response = await api.getApplications({ limit: 100 });
      setApplications(response.data);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalApps = applications.length;
  const analyzedApps = applications.filter((a) => a.jobAnalysis).length;
  const tailoredApps = applications.filter(
    (a) => a.tailoredResumes && a.tailoredResumes.length > 0,
  ).length;

  const avgScore =
    analyzedApps > 0
      ? Math.round(
          applications
            .filter((a) => a.jobAnalysis?.matchScore)
            .reduce(
              (acc, curr) => acc + (curr.jobAnalysis?.matchScore || 0),
              0,
            ) / analyzedApps,
        )
      : 0;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.heroTitle}>Painel de Candidaturas</h1>
          <p className={styles.heroSubtitle}>
            Adaptação estratégica de currículo com inteligência artificial, foco
            em palavras-chave e garantia absoluta de fidelidade factual.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/profile" className={styles.secondaryButton}>
            <User size={16} />
            <span>Master Profile</span>
          </Link>
          <Link href="/applications/new" className={styles.primaryButton}>
            <Plus size={16} />
            <span>Nova Candidatura</span>
          </Link>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blue}`}>
            <Briefcase size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              {isLoading ? "..." : totalApps}
            </span>
            <span className={styles.statLabel}>Vagas Cadastradas</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.indigo}`}>
            <Sparkles size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              {isLoading ? "..." : analyzedApps}
            </span>
            <span className={styles.statLabel}>Vagas Analisadas</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.green}`}>
            <FileCheck size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              {isLoading ? "..." : tailoredApps}
            </span>
            <span className={styles.statLabel}>Currículos Adaptados</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.purple}`}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>
              {isLoading ? "..." : avgScore > 0 ? `${avgScore}%` : "N/A"}
            </span>
            <span className={styles.statLabel}>Match Médio de Perfil</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Candidaturas Recentes</h2>
          {totalApps > 0 && (
            <Link href="/applications" className={styles.secondaryButton}>
              Ver todas ({totalApps})
            </Link>
          )}
        </div>

        {hasError ? (
          <div className={styles.emptyState} role="alert">
            <div className={styles.emptyIcon}>
              <Briefcase size={28} />
            </div>
            <h3>Não foi possível carregar as candidaturas</h3>
            <p>Tente novamente. Seus dados não foram alterados.</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={loadData}
            >
              Tentar novamente
            </button>
          </div>
        ) : applications.length === 0 && !isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Briefcase size={28} />
            </div>
            <h3>Nenhuma vaga cadastrada ainda</h3>
            <p>
              Adicione a descrição de uma vaga de emprego para extrair
              palavras-chave ATS e gerar um currículo perfeitamente alinhado.
            </p>
            <Link href="/applications/new" className={styles.primaryButton}>
              <Plus size={16} />
              <span>Cadastrar Primeira Vaga</span>
            </Link>
          </div>
        ) : (
          <div className={styles.applicationsList}>
            {applications.slice(0, 5).map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className={styles.applicationCard}
              >
                <div className={styles.appMain}>
                  <span className={styles.appPosition}>{app.position}</span>
                  <div className={styles.appCompany}>
                    <span>{app.company}</span>
                    {app.location && (
                      <>
                        <span>•</span>
                        <MapPin size={13} />
                        <span>{app.location}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.appMeta}>
                  {app.jobAnalysis && (
                    <span className={styles.scoreBadge}>
                      <Sparkles size={13} />
                      {app.jobAnalysis.matchScore}% Match
                    </span>
                  )}
                  <span
                    className={`${styles.statusTag} ${styles[app.status] || ""}`}
                  >
                    {app.status}
                  </span>
                  <ArrowRight size={16} color="#64748b" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className={styles.principleBanner}>
        <ShieldCheck size={28} className={styles.principleIcon} />
        <div>
          <div className={styles.principleTitle}>
            Princípio Anti-Alucinação em Operação: &ldquo;Never invent. Only
            reframe.&rdquo;
          </div>
          <div className={styles.principleText}>
            A inteligência artificial atua exclusivamente reorganizando e
            enfatizando as informações registradas no seu Master Profile.
            Nenhuma experiência, métrica ou competência fictícia é criada.
          </div>
        </div>
      </div>
    </div>
  );
}
