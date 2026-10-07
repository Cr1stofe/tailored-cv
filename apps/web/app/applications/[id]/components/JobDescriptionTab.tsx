"use client";

import { FileText } from "lucide-react";
import styles from "../application-detail.module.scss";

interface JobDescriptionTabProps {
  jobDescription: string;
}

export function JobDescriptionTab({ jobDescription }: JobDescriptionTabProps) {
  return (
    <div className={`${styles.card} no-print`}>
      <h2 className={styles.cardTitle}>
        <FileText size={18} className={styles.iconBlue} />
        <span>Texto Original da Oportunidade</span>
      </h2>
      <div
        style={{
          whiteSpace: "pre-wrap",
          fontSize: "0.9rem",
          lineHeight: "1.65",
          color: "#cbd5e1",
        }}
      >
        {jobDescription}
      </div>
    </div>
  );
}
