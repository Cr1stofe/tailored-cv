"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, FileCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import {
  JobApplicationDto,
  TailoredResumeDto,
  MasterProfileDto,
} from "@tailored-cv/types";
import type { TailoredResumeFormInput } from "@tailored-cv/validation";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal/DeleteConfirmModal";
import { printResume } from "@/lib/print-resume";
import { ApplicationTopBar } from "./components/ApplicationTopBar";
import { JobDescriptionTab } from "./components/JobDescriptionTab";
import { JobAnalysisTab } from "./components/JobAnalysisTab";
import { TailoredResumeTab } from "./components/TailoredResumeTab";
import styles from "./application-detail.module.scss";

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [application, setApplication] = useState<JobApplicationDto | null>(
    null,
  );
  const [profile, setProfile] = useState<MasterProfileDto | null>(null);
  const [tailoredResume, setTailoredResume] =
    useState<TailoredResumeDto | null>(null);
  const [tailoredResumes, setTailoredResumes] = useState<TailoredResumeDto[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<"job" | "analysis" | "resume">(
    "job",
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);

  const [isEditingResume, setIsEditingResume] = useState(false);
  const [isSavingResume, setIsSavingResume] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tailorLanguage, setTailorLanguage] = useState<"PT" | "EN">("PT");

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteApplication(id);
      toast.success("Candidatura excluída com sucesso!");
      router.push("/applications");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao excluir candidatura",
      );
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setIsLoading(true);
    setLoadError(false);
    try {
      const [appData, profileData] = await Promise.all([
        api.getApplicationById(id),
        api.getProfile(),
      ]);
      setApplication(appData);
      setProfile(profileData);
      if (appData.targetLanguage) {
        setTailorLanguage(appData.targetLanguage);
      }

      const savedResumes = appData.tailoredResumes || [];
      setTailoredResumes(savedResumes);
      const preferredResume =
        savedResumes.find(
          (resume) => resume.language === appData.targetLanguage,
        ) || savedResumes[0];

      if (preferredResume) {
        setTailoredResume(preferredResume);
        setTailorLanguage(preferredResume.language);
        setActiveTab("resume");
      } else if (appData.jobAnalysis) {
        setActiveTab("analysis");
      }
    } catch {
      setLoadError(true);
      toast.error("Erro ao carregar dados da candidatura");
    } finally {
      setIsLoading(false);
    }
  }

  const handleTailorLanguageChange = (language: "PT" | "EN") => {
    setTailorLanguage(language);
    const savedResume = tailoredResumes.find(
      (resume) => resume.language === language,
    );

    setIsEditingResume(false);
    setTailoredResume(savedResume || null);
    setActiveTab("resume");
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await api.analyzeJob(id);
      const updated = await api.getApplicationById(id);
      setApplication(updated);
      setActiveTab("analysis");
      toast.success("Análise de vaga realizada com sucesso!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha na análise da vaga",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTailor = async () => {
    setIsTailoring(true);
    try {
      const resume = await api.tailorResume(id, tailorLanguage);
      setTailoredResume(resume);
      setTailoredResumes((current) => [
        resume,
        ...current.filter((item) => item.language !== resume.language),
      ]);
      setIsEditingResume(false);
      const updated = await api.getApplicationById(id);
      setApplication(updated);
      setTailoredResumes(updated.tailoredResumes || []);
      setActiveTab("resume");
      toast.success(
        tailorLanguage === "EN"
          ? "Currículo adaptado em inglês com sucesso!"
          : "Currículo adaptado em português com sucesso!",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao adaptar currículo",
      );
    } finally {
      setIsTailoring(false);
    }
  };

  const startEditing = () => {
    if (!tailoredResume) return;
    setIsEditingResume(true);
    setActiveTab("resume");
  };

  const cancelEditing = () => {
    setIsEditingResume(false);
  };

  const handleSaveResume = async (formData: TailoredResumeFormInput) => {
    setIsSavingResume(true);
    try {
      const updated = await api.updateTailoredResume(id, {
        ...formData,
        resumeId: tailoredResume?.id,
      });
      setTailoredResume(updated);
      setTailoredResumes((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setIsEditingResume(false);
      toast.success("Currículo atualizado com sucesso!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao salvar alterações",
      );
    } finally {
      setIsSavingResume(false);
    }
  };

  const handlePrint = () => {
    setActiveTab("resume");
    setTimeout(() => {
      printResume({
        fullName: profile?.fullName,
        position: application?.position,
        company: application?.company,
        language:
          tailoredResume?.language || application?.targetLanguage || "PT",
        isMaster: false,
      });
    }, 150);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState} role="status" aria-live="polite">
          <span className={styles.loadingSpinner} aria-hidden="true" />
          Carregando detalhes da vaga...
        </div>
      </div>
    );
  }

  if (loadError || !application) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState} role="alert">
          <strong>Não foi possível carregar esta candidatura.</strong>
          <span>Verifique sua sessão ou tente novamente.</span>
          <button
            type="button"
            className={`${styles.actionButton} ${styles.primary}`}
            onClick={loadData}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const analysis = application.jobAnalysis;

  return (
    <div className={styles.container}>
      <Link href="/applications" className={`${styles.backLink} no-print`}>
        <ArrowLeft size={14} />
        <span>Voltar para todas as candidaturas</span>
      </Link>

      <ApplicationTopBar
        application={application}
        isEditingResume={isEditingResume}
        isSavingResume={isSavingResume}
        isAnalyzing={isAnalyzing}
        isTailoring={isTailoring}
        hasTailoredResume={!!tailoredResume}
        tailorLanguage={tailorLanguage}
        savedLanguages={tailoredResumes.map((resume) => resume.language)}
        onTailorLanguageChange={handleTailorLanguageChange}
        onCancelEditing={cancelEditing}
        onAnalyze={handleAnalyze}
        onTailor={handleTailor}
        onStartEditing={startEditing}
        onPrint={handlePrint}
        onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
      />

      <div className={`${styles.tabs} no-print`}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "job" ? styles.active : ""}`}
          onClick={() => setActiveTab("job")}
        >
          <FileText size={16} />
          <span>Descrição da Vaga</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "analysis" ? styles.active : ""}`}
          onClick={() => setActiveTab("analysis")}
        >
          <Sparkles size={16} />
          <span>
            Análise de Requisitos ATS{" "}
            {analysis ? `(${analysis.matchScore}%)` : ""}
          </span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "resume" ? styles.active : ""}`}
          onClick={() => setActiveTab("resume")}
        >
          <FileCheck size={16} />
          <span>Currículo Adaptado</span>
        </button>
      </div>

      {activeTab === "job" && (
        <JobDescriptionTab jobDescription={application.jobDescription} />
      )}

      {activeTab === "analysis" && (
        <JobAnalysisTab
          analysis={analysis}
          hasTailoredResume={!!tailoredResume}
          isAnalyzing={isAnalyzing}
          isTailoring={isTailoring}
          onAnalyze={handleAnalyze}
          onTailor={handleTailor}
        />
      )}

      {activeTab === "resume" && (
        <TailoredResumeTab
          tailoredResume={tailoredResume}
          profile={profile}
          isEditingResume={isEditingResume}
          isSavingResume={isSavingResume}
          isTailoring={isTailoring}
          onTailor={handleTailor}
          onSaveResume={handleSaveResume}
          onCancelEditing={cancelEditing}
        />
      )}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Excluir Candidatura"
        itemTitle={application.position}
        itemSubtitle={application.company}
      />
    </div>
  );
}
