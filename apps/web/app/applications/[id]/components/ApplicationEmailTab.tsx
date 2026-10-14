"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, ExternalLink, Mail } from "lucide-react";
import { toast } from "sonner";
import type {
  JobApplicationDto,
  MasterProfileDto,
  TailoredResumeDto,
} from "@tailored-cv/types";
import styles from "../application-detail.module.scss";

type EmailFocus = "frontend" | "fullstack";

interface ApplicationEmailTabProps {
  application: JobApplicationDto;
  profile: MasterProfileDto | null;
  tailoredResume: TailoredResumeDto | null;
}

function createEmailBody(
  application: JobApplicationDto,
  profile: MasterProfileDto | null,
  tailoredResume: TailoredResumeDto | null,
  focus: EmailFocus,
): string {
  const isEnglish = tailoredResume?.language === "EN";
  const focusContent =
    focus === "frontend"
      ? isEnglish
        ? "My background includes experience with React, TypeScript, JavaScript, Next.js, responsive interfaces, componentization, and web performance."
        : "Meu perfil reúne experiência com React, TypeScript, JavaScript, Next.js, interfaces responsivas, componentização e performance web."
      : isEnglish
        ? "My background includes experience with React, TypeScript, JavaScript, Next.js, Node.js, NestJS, REST APIs, relational databases, and authentication."
        : "Meu perfil reúne experiência com React, TypeScript, JavaScript, Next.js, Node.js, NestJS, APIs RESTful, bancos de dados relacionais e autenticação.";

  if (isEnglish) {
    return [
      "Hello,",
      "",
      `I would like to apply for the ${application.position || "opportunity"}${application.company ? ` position at ${application.company}` : " position"}.`,
      "",
      focusContent,
      "",
      "Please find my resume attached for your consideration.",
      "",
      "Thank you for your time. I remain available for any further information.",
      "",
      "Best regards,",
      profile?.fullName || "",
    ]
      .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
      .join("\n");
  }

  return [
    "Olá,",
    "",
    `Gostaria de me candidatar à vaga de ${application.position || "oportunidade"}${application.company ? ` na ${application.company}` : ""}.`,
    "",
    focusContent,
    "",
    "Segue meu currículo em anexo para avaliação.",
    "",
    "Obrigado pela atenção e fico à disposição para qualquer informação adicional.",
    "",
    "Atenciosamente,",
    profile?.fullName || "",
  ]
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join("\n");
}

export function ApplicationEmailTab({
  application,
  profile,
  tailoredResume,
}: ApplicationEmailTabProps) {
  const [focus, setFocus] = useState<EmailFocus>("frontend");
  const [recipient, setRecipient] = useState("");
  const [recipientError, setRecipientError] = useState("");
  const recipientInputRef = useRef<HTMLInputElement | null>(null);
  const [body, setBody] = useState(() =>
    createEmailBody(application, profile, tailoredResume, "frontend"),
  );

  useEffect(() => {
    setBody(createEmailBody(application, profile, tailoredResume, focus));
  }, [application, profile, tailoredResume, focus]);

  const isEnglish = tailoredResume?.language === "EN";
  const focusLabel =
    focus === "frontend"
      ? isEnglish
        ? "Frontend"
        : "Front-end"
      : "Full Stack";
  const subject = isEnglish
    ? `Application — ${focusLabel} Developer`
    : `Candidatura — Desenvolvedor ${focusLabel}`;
  const openEmailClient = () => {
    const recipientInput = recipientInputRef.current;

    if (!recipient.trim()) {
      setRecipientError("Informe o e-mail do destinatário para continuar.");
      recipientInput?.focus();
      return;
    }

    if (!recipientInput || !recipientInput.checkValidity()) {
      setRecipientError("Informe um endereço de e-mail válido.");
      recipientInput?.focus();
      return;
    }

    setRecipientError("");
    window.location.href = `mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const copyEmail = async () => {
    await navigator.clipboard.writeText(`Assunto: ${subject}\n\n${body}`);
    toast.success("Assunto e corpo do e-mail copiados.");
  };

  return (
    <div className={`${styles.card} ${styles.emailCard} no-print`}>
      <div className={styles.emailHeader}>
        <div>
          <h2 className={styles.cardTitle}>
            <Mail size={18} className={styles.iconBlue} />
            <span>Preparar e-mail de candidatura</span>
          </h2>
          <p className={styles.emailIntro}>
            Revise o texto, abra seu cliente de e-mail e anexe o currículo
            manualmente antes de enviar.
          </p>
        </div>
      </div>

      <div className={styles.emailForm}>
        <label className={styles.emailField}>
          <span>Destinatário</span>
          <input
            ref={recipientInputRef}
            type="email"
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value);
              if (event.target.value.trim()) setRecipientError("");
            }}
            placeholder="recrutador@empresa.com"
            autoComplete="email"
            aria-invalid={!!recipientError}
            aria-describedby={recipientError ? "recipient-error" : undefined}
          />
          {recipientError && (
            <small id="recipient-error" className={styles.emailError}>
              {recipientError}
            </small>
          )}
        </label>

        <label className={styles.emailField}>
          <span>Perfil de apresentação</span>
          <select
            value={focus}
            onChange={(event) => setFocus(event.target.value as EmailFocus)}
          >
            <option value="frontend">Front-end</option>
            <option value="fullstack">Full Stack</option>
          </select>
        </label>

        <label className={styles.emailField}>
          <span>Assunto</span>
          <input type="text" value={subject} readOnly />
        </label>

        <label className={`${styles.emailField} ${styles.emailBodyField}`}>
          <span>Mensagem</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={16}
          />
        </label>
      </div>

      <div className={styles.emailActions}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.secondary}`}
          onClick={copyEmail}
        >
          <Copy size={16} />
          Copiar conteúdo
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.primary}`}
          onClick={openEmailClient}
        >
          <ExternalLink size={16} />
          Abrir no e-mail
        </button>
      </div>
    </div>
  );
}
