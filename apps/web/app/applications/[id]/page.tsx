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
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal/DeleteConfirmModal";
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
  const [activeTab, setActiveTab] = useState<"job" | "analysis" | "resume">(
    "job",
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);

  const [isEditingResume, setIsEditingResume] = useState(false);
  const [editedResume, setEditedResume] = useState<TailoredResumeDto | null>(
    null,
  );
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [newSkillText, setNewSkillText] = useState("");

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

      if (appData.tailoredResumes && appData.tailoredResumes.length > 0) {
        setTailoredResume(appData.tailoredResumes[0] || null);
        setActiveTab("resume");
      } else if (appData.jobAnalysis) {
        setActiveTab("analysis");
      }
    } catch {
      toast.error("Erro ao carregar dados da candidatura");
    } finally {
      setIsLoading(false);
    }
  }

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
      setIsEditingResume(false);
      const updated = await api.getApplicationById(id);
      setApplication(updated);
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
    setEditedResume(JSON.parse(JSON.stringify(tailoredResume)));
    setIsEditingResume(true);
    setActiveTab("resume");
  };

  const cancelEditing = () => {
    setIsEditingResume(false);
    setEditedResume(null);
  };

  const handleSaveResume = async () => {
    if (!editedResume) return;
    setIsSavingResume(true);
    try {
      const updated = await api.updateTailoredResume(id, editedResume);
      setTailoredResume(updated);
      setIsEditingResume(false);
      setEditedResume(null);
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
      window.print();
    }, 150);
  };

  const updateEditedHeadline = (val: string) => {
    if (!editedResume) return;
    setEditedResume({ ...editedResume, targetedHeadline: val });
  };

  const updateEditedSummary = (val: string) => {
    if (!editedResume) return;
    setEditedResume({ ...editedResume, reframedSummary: val });
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedResume || !newSkillText.trim()) return;
    const skills = editedResume.highlightedSkills || [];
    if (!skills.includes(newSkillText.trim())) {
      setEditedResume({
        ...editedResume,
        highlightedSkills: [...skills, newSkillText.trim()],
      });
    }
    setNewSkillText("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (!editedResume) return;
    setEditedResume({
      ...editedResume,
      highlightedSkills: (editedResume.highlightedSkills || []).filter(
        (s) => s !== skillToRemove,
      ),
    });
  };

  const handleUpdateExperienceBullet = (
    expIdx: number,
    bIdx: number,
    text: string,
  ) => {
    if (!editedResume) return;
    const exps = [...editedResume.tailoredExperiences];
    const targetExp = exps[expIdx];
    if (!targetExp) return;
    const highlights = [...(targetExp.reframedHighlights || [])];
    highlights[bIdx] = text;
    exps[expIdx] = { ...targetExp, reframedHighlights: highlights };
    setEditedResume({ ...editedResume, tailoredExperiences: exps });
  };

  const handleAddExperienceBullet = (expIdx: number) => {
    if (!editedResume) return;
    const exps = [...editedResume.tailoredExperiences];
    const targetExp = exps[expIdx];
    if (!targetExp) return;
    const highlights = [
      ...(targetExp.reframedHighlights || []),
      "Nova realização ou responsabilidade estratégica...",
    ];
    exps[expIdx] = { ...targetExp, reframedHighlights: highlights };
    setEditedResume({ ...editedResume, tailoredExperiences: exps });
  };

  const handleRemoveExperienceBullet = (expIdx: number, bIdx: number) => {
    if (!editedResume) return;
    const exps = [...editedResume.tailoredExperiences];
    const targetExp = exps[expIdx];
    if (!targetExp) return;
    const highlights = (targetExp.reframedHighlights || []).filter(
      (_, idx) => idx !== bIdx,
    );
    exps[expIdx] = { ...targetExp, reframedHighlights: highlights };
    setEditedResume({ ...editedResume, tailoredExperiences: exps });
  };

  const handleUpdateProjectBullet = (
    projIdx: number,
    bIdx: number,
    text: string,
  ) => {
    if (!editedResume || !editedResume.tailoredProjects) return;
    const projs = [...editedResume.tailoredProjects];
    const targetProj = projs[projIdx];
    if (!targetProj) return;
    const highlights = [...(targetProj.reframedHighlights || [])];
    highlights[bIdx] = text;
    projs[projIdx] = { ...targetProj, reframedHighlights: highlights };
    setEditedResume({ ...editedResume, tailoredProjects: projs });
  };

  const handleAddProjectBullet = (projIdx: number) => {
    if (!editedResume || !editedResume.tailoredProjects) return;
    const projs = [...editedResume.tailoredProjects];
    const targetProj = projs[projIdx];
    if (!targetProj) return;
    const highlights = [
      ...(targetProj.reframedHighlights || []),
      "Novo destaque técnico ou resultado do projeto...",
    ];
    projs[projIdx] = { ...targetProj, reframedHighlights: highlights };
    setEditedResume({ ...editedResume, tailoredProjects: projs });
  };

  const handleRemoveProjectBullet = (projIdx: number, bIdx: number) => {
    if (!editedResume || !editedResume.tailoredProjects) return;
    const projs = [...editedResume.tailoredProjects];
    const targetProj = projs[projIdx];
    if (!targetProj) return;
    const highlights = (targetProj.reframedHighlights || []).filter(
      (_, idx) => idx !== bIdx,
    );
    projs[projIdx] = { ...targetProj, reframedHighlights: highlights };
    setEditedResume({ ...editedResume, tailoredProjects: projs });
  };

  if (isLoading || !application) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: "center", padding: "5rem", color: "#94a3b8" }}>
          Carregando detalhes da vaga...
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
        onTailorLanguageChange={setTailorLanguage}
        onSaveResume={handleSaveResume}
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
          editedResume={editedResume}
          profile={profile}
          isEditingResume={isEditingResume}
          isSavingResume={isSavingResume}
          isTailoring={isTailoring}
          newSkillText={newSkillText}
          onTailor={handleTailor}
          onSaveResume={handleSaveResume}
          onCancelEditing={cancelEditing}
          onUpdateHeadline={updateEditedHeadline}
          onUpdateSummary={updateEditedSummary}
          onAddSkill={handleAddSkill}
          onRemoveSkill={handleRemoveSkill}
          onNewSkillTextChange={setNewSkillText}
          onUpdateExperienceBullet={handleUpdateExperienceBullet}
          onAddExperienceBullet={handleAddExperienceBullet}
          onRemoveExperienceBullet={handleRemoveExperienceBullet}
          onUpdateProjectBullet={handleUpdateProjectBullet}
          onAddProjectBullet={handleAddProjectBullet}
          onRemoveProjectBullet={handleRemoveProjectBullet}
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
