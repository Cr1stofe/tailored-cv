"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  createJobApplicationSchema,
  CreateJobApplicationInput,
} from "@tailored-cv/validation";
import { api } from "@/services/api";
import styles from "./new.module.scss";

export default function NewApplicationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateJobApplicationInput>({
    resolver: zodResolver(createJobApplicationSchema),
    defaultValues: {
      company: "",
      position: "",
      location: "",
      url: "",
      jobDescription: "",
      targetLanguage: "PT",
    },
  });

  const selectedLang = watch("targetLanguage");
  const jobDescription = watch("jobDescription", "");

  const onSubmit = async (data: CreateJobApplicationInput) => {
    setIsSubmitting(true);
    try {
      const created = await api.createApplication(data);
      toast.success("Vaga cadastrada com sucesso!");
      router.push(`/applications/${created.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao cadastrar vaga",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cadastrar Nova Vaga</h1>
        <p className={styles.subtitle}>
          Cole a descrição da oportunidade para extrair palavras-chave e adaptar
          seu currículo.
        </p>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label htmlFor="company">Nome da Empresa *</label>
              <input
                id="company"
                placeholder="Ex: Nubank, Mercado Livre, Google..."
                {...register("company")}
              />
              {errors.company && (
                <span className={styles.error}>{errors.company.message}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="position">Cargo / Título da Vaga *</label>
              <input
                id="position"
                placeholder="Ex: Senior Full Stack Engineer"
                {...register("position")}
              />
              {errors.position && (
                <span className={styles.error}>{errors.position.message}</span>
              )}
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label htmlFor="location">Localização / Modalidade</label>
              <input
                id="location"
                placeholder="Ex: Remoto (Brasil) / Híbrido SP"
                {...register("location")}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="url">URL do Anúncio (Opcional)</label>
              <input
                id="url"
                placeholder="https://linkedin.com/jobs/..."
                {...register("url")}
              />
              {errors.url && (
                <span className={styles.error}>{errors.url.message}</span>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Idioma Alvo do Currículo *</label>
            <div className={styles.radioGroup}>
              <label
                className={`${styles.radioLabel} ${selectedLang === "PT" ? styles.selected : ""}`}
              >
                <input
                  type="radio"
                  value="PT"
                  {...register("targetLanguage")}
                />
                <span>🇧🇷 Português (Brasil)</span>
              </label>
              <label
                className={`${styles.radioLabel} ${selectedLang === "EN" ? styles.selected : ""}`}
              >
                <input
                  type="radio"
                  value="EN"
                  {...register("targetLanguage")}
                />
                <span>🇺🇸 English (US / Global)</span>
              </label>
            </div>
            <span className={styles.hint}>
              {selectedLang === "EN"
                ? "A IA adaptará e reestruturará seu currículo diretamente em inglês fluente para vagas e triagem ATS internacional."
                : "A IA adaptará seu currículo em português com terminologias técnicas padrão de mercado."}
            </span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="jobDescription">Descrição Completa da Vaga *</label>
            <textarea
              id="jobDescription"
              placeholder="Cole aqui o texto completo da vaga (requisitos obrigatórios, desejáveis, responsabilidades, tecnologias mencionadas)..."
              {...register("jobDescription")}
            />
            {errors.jobDescription ? (
              <span className={styles.error}>
                {errors.jobDescription.message}
              </span>
            ) : (
              <span className={styles.hint}>
                Quanto mais detalhada a descrição, mais precisa será a extração
                de palavras-chave para o algoritmo de ATS.
              </span>
            )}
            <span className={styles.characterCount}>
              {jobDescription.length} caracteres
              {jobDescription.length > 0 && jobDescription.length < 20
                ? " · mínimo: 20"
                : ""}
            </span>
          </div>

          <div className={styles.actions}>
            <Link href="/applications" className={styles.cancelButton}>
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </Link>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              <Sparkles size={16} />
              <span>
                {isSubmitting ? "Salvando Vaga..." : "Salvar e Continuar"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
