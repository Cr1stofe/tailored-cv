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
import {
  buildMailtoUrl,
  copyEmailContent,
  createEmailBody,
  getEmailSubject,
  isValidRecipient,
  resolveEmailLanguage,
  type EmailFocus,
} from "./email-draft";

interface ApplicationEmailTabProps {
  application: JobApplicationDto;
  profile: MasterProfileDto | null;
  tailoredResume: TailoredResumeDto | null;
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
  const language = resolveEmailLanguage(application, tailoredResume);
  const [body, setBody] = useState(() =>
    createEmailBody(application, profile, language, "frontend"),
  );

  useEffect(() => {
    setBody(
      createEmailBody(
        application,
        profile,
        resolveEmailLanguage(application, tailoredResume),
        focus,
      ),
    );
  }, [application, profile, tailoredResume, focus]);

  const subject = getEmailSubject(language, focus);
  const openEmailClient = () => {
    const recipientInput = recipientInputRef.current;

    if (!recipient.trim()) {
      setRecipientError("Informe o e-mail do destinatário para continuar.");
      recipientInput?.focus();
      return;
    }

    if (
      !recipientInput ||
      !recipientInput.checkValidity() ||
      !isValidRecipient(recipient)
    ) {
      setRecipientError("Informe um endereço de e-mail válido.");
      recipientInput?.focus();
      return;
    }

    setRecipientError("");
    window.location.href = buildMailtoUrl(recipient, subject, body);
  };

  const copyEmail = async () => {
    const copied = await copyEmailContent(navigator.clipboard, subject, body);
    if (copied) {
      toast.success("Assunto e corpo do e-mail copiados.");
    } else {
      toast.error("Não foi possível copiar o conteúdo do e-mail.");
    }
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
