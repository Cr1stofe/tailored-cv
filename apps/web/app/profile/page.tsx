"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import {
  MasterProfileDto,
  SkillCategory,
  ExperienceDto,
  ProjectDto,
  EducationDto,
  CertificationDto,
} from "@tailored-cv/types";
import { MasterResumeModal } from "@/components/MasterResumeModal/MasterResumeModal";
import { MasterResumeBanner } from "./components/MasterResumeBanner";
import { PersonalInfoCard } from "./components/PersonalInfoCard";
import { SkillsCard } from "./components/SkillsCard";
import { ExperiencesCard } from "./components/ExperiencesCard";
import { ProjectsCard } from "./components/ProjectsCard";
import { EducationCard } from "./components/EducationCard";
import { LanguagesCard } from "./components/LanguagesCard";
import styles from "./profile.module.scss";

type SectionKey =
  | "personal"
  | "skills"
  | "experiences"
  | "projects"
  | "educations"
  | "languages";

export default function ProfilePage() {
  const [profile, setProfile] = useState<MasterProfileDto | null>(null);
  const [originalProfile, setOriginalProfile] =
    useState<MasterProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMasterResumeOpen, setIsMasterResumeOpen] = useState(false);

  const [editingSections, setEditingSections] = useState<
    Record<SectionKey, boolean>
  >({
    personal: false,
    skills: false,
    experiences: false,
    projects: false,
    educations: false,
    languages: false,
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await api.getProfile();
        setProfile(data);
        setOriginalProfile(JSON.parse(JSON.stringify(data)));
      } catch {
        toast.error("Erro ao carregar o Master Profile");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleOpenMasterResume = () => {
    setIsMasterResumeOpen(true);
  };

  const handlePrintMasterResume = () => {
    setIsMasterResumeOpen(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleSyncMasterResume = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      setOriginalProfile(JSON.parse(JSON.stringify(data)));
      toast.success(
        "Currículo Master sincronizado com os dados mais recentes do perfil!",
      );
    } catch {
      toast.error("Erro ao sincronizar Currículo Master");
    }
  };

  const handleStartEdit = (section: SectionKey) => {
    setEditingSections((prev) => ({ ...prev, [section]: true }));
  };

  const handleCancelEdit = (section: SectionKey) => {
    if (!originalProfile) return;

    if (section === "personal") {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName: originalProfile.fullName,
              email: originalProfile.email,
              phone: originalProfile.phone,
              location: originalProfile.location,
              linkedinUrl: originalProfile.linkedinUrl,
              githubUrl: originalProfile.githubUrl,
              portfolioUrl: originalProfile.portfolioUrl,
              summary: originalProfile.summary,
            }
          : null,
      );
    } else if (section === "skills") {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              skills: JSON.parse(JSON.stringify(originalProfile.skills)),
            }
          : null,
      );
    } else if (section === "experiences") {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              experiences: JSON.parse(
                JSON.stringify(originalProfile.experiences),
              ),
            }
          : null,
      );
    } else if (section === "projects") {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              projects: JSON.parse(JSON.stringify(originalProfile.projects)),
            }
          : null,
      );
    } else if (section === "educations") {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              educations: JSON.parse(
                JSON.stringify(originalProfile.educations),
              ),
            }
          : null,
      );
    } else if (section === "languages") {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              certifications: JSON.parse(
                JSON.stringify(originalProfile.certifications),
              ),
            }
          : null,
      );
    }

    setEditingSections((prev) => ({ ...prev, [section]: false }));
  };

  const handleSaveSection = async (section: SectionKey) => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updated = await api.updateProfile(profile);
      setProfile(updated);
      setOriginalProfile(JSON.parse(JSON.stringify(updated)));
      setEditingSections((prev) => ({ ...prev, [section]: false }));
      toast.success("Alterações salvas com sucesso!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar alterações",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Deseja restaurar os dados padrão do perfil?")) return;
    setIsLoading(true);
    try {
      const resetted = await api.resetSeedProfile();
      setProfile(resetted);
      setOriginalProfile(JSON.parse(JSON.stringify(resetted)));
      setEditingSections({
        personal: false,
        skills: false,
        experiences: false,
        projects: false,
        educations: false,
        languages: false,
      });
      toast.success("Perfil restaurado para os dados originais!");
    } catch {
      toast.error("Erro ao resetar perfil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePersonalField = (
    field: keyof MasterProfileDto,
    value: string,
  ) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const handleAddSkill = (name: string, category: SkillCategory) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: [...profile.skills, { name, category }],
    });
  };

  const handleRemoveSkill = (skillIndex: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter((_, idx) => idx !== skillIndex),
    });
  };

  const handleAddExperience = () => {
    if (!profile) return;
    const newExp: ExperienceDto = {
      company: "Nova Empresa",
      position: "Novo Cargo",
      location: "Remoto",
      startDate: "2024",
      endDate: "Presente",
      isCurrent: true,
      highlights: [
        "Nova realização profissional relevante com impacto comprovado...",
      ],
      technologies: ["TypeScript", "Node.js"],
      orderIndex: profile.experiences.length,
    };
    setProfile({
      ...profile,
      experiences: [newExp, ...profile.experiences],
    });
  };

  const handleRemoveExperience = (idx: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      experiences: profile.experiences.filter((_, i) => i !== idx),
    });
  };

  const handleUpdateExperience = <K extends keyof ExperienceDto>(
    idx: number,
    field: K,
    value: ExperienceDto[K],
  ) => {
    if (!profile) return;
    const target = profile.experiences[idx];
    if (!target) return;
    const updated = { ...target, [field]: value };
    const exps = [...profile.experiences];
    exps[idx] = updated;
    setProfile({ ...profile, experiences: exps });
  };

  const handleAddExpHighlight = (expIdx: number) => {
    if (!profile) return;
    const target = profile.experiences[expIdx];
    if (!target) return;
    const highlights = [
      ...(target.highlights || []),
      "Nova realização profissional relevante...",
    ];
    const exps = [...profile.experiences];
    exps[expIdx] = { ...target, highlights };
    setProfile({ ...profile, experiences: exps });
  };

  const handleUpdateExpHighlight = (
    expIdx: number,
    hIdx: number,
    value: string,
  ) => {
    if (!profile) return;
    const target = profile.experiences[expIdx];
    if (!target) return;
    const highlights = [...(target.highlights || [])];
    highlights[hIdx] = value;
    const exps = [...profile.experiences];
    exps[expIdx] = { ...target, highlights };
    setProfile({ ...profile, experiences: exps });
  };

  const handleRemoveExpHighlight = (expIdx: number, hIdx: number) => {
    if (!profile) return;
    const target = profile.experiences[expIdx];
    if (!target) return;
    const highlights = (target.highlights || []).filter((_, i) => i !== hIdx);
    const exps = [...profile.experiences];
    exps[expIdx] = { ...target, highlights };
    setProfile({ ...profile, experiences: exps });
  };

  const handleAddProject = () => {
    if (!profile) return;
    const newProj: ProjectDto = {
      name: "Novo Projeto em Destaque",
      description: "Descrição detalhada do projeto, desafio técnico e solução.",
      url: "https://github.com/...",
      highlights: ["Funcionalidade ou impacto relevante do projeto..."],
      technologies: ["Next.js", "TypeScript", "TailwindCSS"],
      orderIndex: profile.projects.length,
    };
    setProfile({
      ...profile,
      projects: [newProj, ...profile.projects],
    });
  };

  const handleRemoveProject = (idx: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      projects: profile.projects.filter((_, i) => i !== idx),
    });
  };

  const handleUpdateProject = <K extends keyof ProjectDto>(
    idx: number,
    field: K,
    value: ProjectDto[K],
  ) => {
    if (!profile) return;
    const target = profile.projects[idx];
    if (!target) return;
    const updated = { ...target, [field]: value };
    const projs = [...profile.projects];
    projs[idx] = updated;
    setProfile({ ...profile, projects: projs });
  };

  const handleAddProjHighlight = (projIdx: number) => {
    if (!profile) return;
    const target = profile.projects[projIdx];
    if (!target) return;
    const highlights = [
      ...(target.highlights || []),
      "Novo destaque ou funcionalidade implementada...",
    ];
    const projs = [...profile.projects];
    projs[projIdx] = { ...target, highlights };
    setProfile({ ...profile, projects: projs });
  };

  const handleUpdateProjHighlight = (
    projIdx: number,
    hIdx: number,
    value: string,
  ) => {
    if (!profile) return;
    const target = profile.projects[projIdx];
    if (!target) return;
    const highlights = [...(target.highlights || [])];
    highlights[hIdx] = value;
    const projs = [...profile.projects];
    projs[projIdx] = { ...target, highlights };
    setProfile({ ...profile, projects: projs });
  };

  const handleRemoveProjHighlight = (projIdx: number, hIdx: number) => {
    if (!profile) return;
    const target = profile.projects[projIdx];
    if (!target) return;
    const highlights = (target.highlights || []).filter((_, i) => i !== hIdx);
    const projs = [...profile.projects];
    projs[projIdx] = { ...target, highlights };
    setProfile({ ...profile, projects: projs });
  };

  const handleAddEducation = () => {
    if (!profile) return;
    const newEdu: EducationDto = {
      institution: "Instituição de Ensino",
      degree: "Curso / Grau",
      fieldOfStudy: "Área de Atuação",
      startDate: "2020",
      endDate: "2024",
    };
    setProfile({
      ...profile,
      educations: [newEdu, ...profile.educations],
    });
  };

  const handleRemoveEducation = (idx: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      educations: profile.educations.filter((_, i) => i !== idx),
    });
  };

  const handleUpdateEducation = <K extends keyof EducationDto>(
    idx: number,
    field: K,
    value: EducationDto[K],
  ) => {
    if (!profile) return;
    const target = profile.educations[idx];
    if (!target) return;
    const updated = { ...target, [field]: value };
    const edus = [...profile.educations];
    edus[idx] = updated;
    setProfile({ ...profile, educations: edus });
  };

  const handleAddLanguage = () => {
    if (!profile) return;
    const newLang: CertificationDto = {
      name: "Novo Idioma",
      issuer: "Avançado / Fluente",
      issueDate: "",
    };
    setProfile({
      ...profile,
      certifications: [...profile.certifications, newLang],
    });
  };

  const handleRemoveLanguage = (idx: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      certifications: profile.certifications.filter((_, i) => i !== idx),
    });
  };

  const handleUpdateLanguage = <K extends keyof CertificationDto>(
    idx: number,
    field: K,
    value: CertificationDto[K],
  ) => {
    if (!profile) return;
    const target = profile.certifications[idx];
    if (!target) return;
    const updated = { ...target, [field]: value };
    const certs = [...profile.certifications];
    certs[idx] = updated;
    setProfile({ ...profile, certifications: certs });
  };

  if (isLoading || !profile) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: "center", padding: "5rem", color: "#94a3b8" }}>
          Carregando Master Profile...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${styles.container} no-print`}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Master Profile</h1>
            <p className={styles.subtitle}>
              Sua fonte única de verdade profissional. A inteligência artificial
              nunca inventará dados fora deste perfil.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.resetButton}
              onClick={handleReset}
            >
              <RotateCcw size={16} />
              <span>Restaurar Seed</span>
            </button>
          </div>
        </div>

        <MasterResumeBanner
          onOpen={handleOpenMasterResume}
          onPrint={handlePrintMasterResume}
          onSync={handleSyncMasterResume}
        />

        <PersonalInfoCard
          profile={profile}
          isEditing={editingSections.personal}
          isSaving={isSaving}
          onStartEdit={() => handleStartEdit("personal")}
          onCancelEdit={() => handleCancelEdit("personal")}
          onSave={() => handleSaveSection("personal")}
          onChangeField={handleChangePersonalField}
        />

        <SkillsCard
          skills={profile.skills}
          isEditing={editingSections.skills}
          isSaving={isSaving}
          onStartEdit={() => handleStartEdit("skills")}
          onCancelEdit={() => handleCancelEdit("skills")}
          onSave={() => handleSaveSection("skills")}
          onAddSkill={handleAddSkill}
          onRemoveSkill={handleRemoveSkill}
        />

        <ExperiencesCard
          experiences={profile.experiences}
          isEditing={editingSections.experiences}
          isSaving={isSaving}
          onStartEdit={() => handleStartEdit("experiences")}
          onCancelEdit={() => handleCancelEdit("experiences")}
          onSave={() => handleSaveSection("experiences")}
          onAddExperience={handleAddExperience}
          onRemoveExperience={handleRemoveExperience}
          onUpdateExperience={handleUpdateExperience}
          onAddHighlight={handleAddExpHighlight}
          onUpdateHighlight={handleUpdateExpHighlight}
          onRemoveHighlight={handleRemoveExpHighlight}
        />

        <ProjectsCard
          projects={profile.projects}
          isEditing={editingSections.projects}
          isSaving={isSaving}
          onStartEdit={() => handleStartEdit("projects")}
          onCancelEdit={() => handleCancelEdit("projects")}
          onSave={() => handleSaveSection("projects")}
          onAddProject={handleAddProject}
          onRemoveProject={handleRemoveProject}
          onUpdateProject={handleUpdateProject}
          onAddHighlight={handleAddProjHighlight}
          onUpdateHighlight={handleUpdateProjHighlight}
          onRemoveHighlight={handleRemoveProjHighlight}
        />

        <div className={styles.grid2}>
          <EducationCard
            educations={profile.educations}
            isEditing={editingSections.educations}
            isSaving={isSaving}
            onStartEdit={() => handleStartEdit("educations")}
            onCancelEdit={() => handleCancelEdit("educations")}
            onSave={() => handleSaveSection("educations")}
            onAddEducation={handleAddEducation}
            onRemoveEducation={handleRemoveEducation}
            onUpdateEducation={handleUpdateEducation}
          />

          <LanguagesCard
            certifications={profile.certifications}
            isEditing={editingSections.languages}
            isSaving={isSaving}
            onStartEdit={() => handleStartEdit("languages")}
            onCancelEdit={() => handleCancelEdit("languages")}
            onSave={() => handleSaveSection("languages")}
            onAddLanguage={handleAddLanguage}
            onRemoveLanguage={handleRemoveLanguage}
            onUpdateLanguage={handleUpdateLanguage}
          />
        </div>
      </div>

      <MasterResumeModal
        isOpen={isMasterResumeOpen}
        onClose={() => setIsMasterResumeOpen(false)}
        profile={profile}
      />
    </>
  );
}
