"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, FileCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import {
  JobApplicationDto,
  TailoredResumeDto,
  MasterProfileDto,
  TailoringGenerationDto,
  AnalysisGenerationDto,
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
  const [analysisGeneration, setAnalysisGeneration] =
    useState<AnalysisGenerationDto | null>(null);
  const [tailoringGeneration, setTailoringGeneration] =
    useState<TailoringGenerationDto | null>(null);

  const [isEditingResume, setIsEditingResume] = useState(false);
  const [isSavingResume, setIsSavingResume] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tailorLanguage, setTailorLanguage] = useState<"PT" | "EN">("PT");
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  useEffect(() => {
    const scrollActiveTab = () => {
      const tabs = tabsRef.current;
      const activeButton = tabRefs.current[activeTab];

      if (!tabs || !activeButton) return;

      const tabsRect = tabs.getBoundingClientRect();
      const activeButtonRect = activeButton.getBoundingClientRect();
      const targetScrollLeft =
        tabs.scrollLeft +
        activeButtonRect.left -
        tabsRect.left -
        (tabs.clientWidth - activeButtonRect.width) / 2;
      const maxScrollLeft = tabs.scrollWidth - tabs.clientWidth;

      tabs.scrollLeft = Math.min(Math.max(0, targetScrollLeft), maxScrollLeft);
    };

    let secondFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      scrollActiveTab();
      secondFrame = window.requestAnimationFrame(scrollActiveTab);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [activeTab, isLoading]);

  useEffect(() => {
    if (
      !tailoringGeneration ||
      !["QUEUED", "PROCESSING"].includes(tailoringGeneration.status)
    ) {
      return;
    }

    const poll = window.setInterval(async () => {
      try {
        const latest = await api.getTailoringStatus(
          id,
          tailoringGeneration.targetLanguage,
        );
        setTailoringGeneration(latest);

        if (latest.status === "COMPLETED") {
          const updated = await api.getApplicationById(id);
          const savedResume = (updated.tailoredResumes || []).find(
            (resume) => resume.language === latest.targetLanguage,
          );
          setApplication(updated);
          setTailoredResumes(updated.tailoredResumes || []);
          setTailoredResume(savedResume || null);
          setIsTailoring(false);
          setActiveTab("resume");
          toast.success(
            latest.targetLanguage === "EN"
              ? "Currículo adaptado em inglês com sucesso!"
              : "Currículo adaptado em português com sucesso!",
          );
        }

        if (latest.status === "FAILED") {
          setIsTailoring(false);
          toast.error(
            latest.errorMessage || "Não foi possível gerar o currículo.",
          );
        }
      } catch {
        // A temporary polling failure should not interrupt the worker.
      }
    }, 2_500);

    return () => window.clearInterval(poll);
  }, [id, tailoringGeneration]);

  useEffect(() => {
    if (
      !analysisGeneration ||
      !["QUEUED", "PROCESSING"].includes(analysisGeneration.status)
    ) {
      return;
    }

    const poll = window.setInterval(async () => {
      try {
        const latest = await api.getAnalysisStatus(id);
        setAnalysisGeneration(latest);

        if (latest.status === "COMPLETED") {
          const updated = await api.getApplicationById(id);
          setApplication(updated);
          setIsAnalyzing(false);
          setActiveTab("analysis");
          toast.success("Análise de vaga realizada com sucesso!");
        }

        if (latest.status === "FAILED") {
          setIsAnalyzing(false);
          toast.error(
            latest.errorMessage || "Não foi possível analisar a vaga.",
          );
        }
      } catch {
        // A temporary polling failure should not interrupt the worker.
      }
    }, 2_500);

    return () => window.clearInterval(poll);
  }, [id, analysisGeneration]);

  async function loadAnalysisStatus() {
    try {
      const generation = await api.getAnalysisStatus(id);
      setAnalysisGeneration(generation);
      setIsAnalyzing(["QUEUED", "PROCESSING"].includes(generation.status));
    } catch {
      setAnalysisGeneration(null);
      setIsAnalyzing(false);
    }
  }

  async function loadTailoringStatus(language: "PT" | "EN") {
    try {
      const generation = await api.getTailoringStatus(id, language);
      setTailoringGeneration(generation);
      setIsTailoring(["QUEUED", "PROCESSING"].includes(generation.status));
    } catch {
      setTailoringGeneration(null);
      setIsTailoring(false);
    }
  }

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

      const initialLanguage =
        preferredResume?.language || appData.targetLanguage || "PT";

      if (preferredResume) {
        setTailoredResume(preferredResume);
        setTailorLanguage(preferredResume.language);
        setActiveTab("resume");
      } else if (appData.jobAnalysis) {
        setActiveTab("analysis");
      }
      await loadAnalysisStatus();
      await loadTailoringStatus(initialLanguage);
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
    void loadTailoringStatus(language);
  };

  const handleAnalyze = async () => {
    if (isTailoring) return;
    setIsAnalyzing(true);
    try {
      const generation = await api.analyzeJob(id);
      setAnalysisGeneration(generation);
      setActiveTab("analysis");
      toast.info(
        "A análise foi iniciada. Você pode continuar navegando enquanto processamos.",
      );
    } catch (err) {
      setIsAnalyzing(false);
      toast.error(
        err instanceof Error ? err.message : "Falha na análise da vaga",
      );
    }
  };

  const handleTailor = async () => {
    if (isAnalyzing) return;
    setIsTailoring(true);
    try {
      const generation = await api.tailorResume(id, tailorLanguage);
      setTailoringGeneration(generation);
      setIsEditingResume(false);
      setActiveTab("resume");
      toast.info(
        "A geração foi iniciada. Você pode continuar navegando; avisaremos quando o currículo estiver pronto.",
      );
    } catch (err) {
      setIsTailoring(false);
      toast.error(
        err instanceof Error ? err.message : "Falha ao adaptar currículo",
      );
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

      {tailoringGeneration &&
        ["QUEUED", "PROCESSING"].includes(tailoringGeneration.status) && (
          <div
            className={styles.generationStatus}
            role="status"
            aria-live="polite"
          >
            <span className={styles.loadingSpinner} aria-hidden="true" />
            <span>
              {tailoringGeneration.status === "QUEUED"
                ? "Geração na fila..."
                : "Gerando currículo com IA..."}
            </span>
            <small>Você pode continuar navegando enquanto processamos.</small>
          </div>
        )}

      {analysisGeneration &&
        ["QUEUED", "PROCESSING"].includes(analysisGeneration.status) && (
          <div
            className={styles.generationStatus}
            role="status"
            aria-live="polite"
          >
            <span className={styles.loadingSpinner} aria-hidden="true" />
            <span>
              {analysisGeneration.status === "QUEUED"
                ? "Análise na fila..."
                : "Analisando requisitos da vaga..."}
            </span>
            <small>Você pode continuar navegando enquanto processamos.</small>
          </div>
        )}

      <div ref={tabsRef} className={`${styles.tabs} no-print`}>
        <button
          type="button"
          ref={(element) => {
            tabRefs.current.job = element;
          }}
          className={`${styles.tabButton} ${activeTab === "job" ? styles.active : ""}`}
          onClick={() => setActiveTab("job")}
        >
          <FileText size={16} />
          <span>Descrição da Vaga</span>
        </button>

        <button
          type="button"
          ref={(element) => {
            tabRefs.current.analysis = element;
          }}
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
          ref={(element) => {
            tabRefs.current.resume = element;
          }}
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
          isAnalyzing={isAnalyzing}
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
