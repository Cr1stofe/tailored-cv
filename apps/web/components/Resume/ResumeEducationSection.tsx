import { formatResumeDate } from "@tailored-cv/validation";
import { formatResumeLanguage } from "@/lib/resume-format";
import styles from "./ResumeEducationSection.module.scss";

export interface EducationItem {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CertificationItem {
  id?: string;
  name: string;
  issuer?: string | null;
}

export interface ResumeEducationSectionProps {
  educations?: EducationItem[] | null;
  certifications?: CertificationItem[] | null;
  isEn?: boolean;
}

export function ResumeEducationSection({
  educations,
  certifications,
  isEn = false,
}: ResumeEducationSectionProps) {
  const hasEducations = educations && educations.length > 0;
  const languagePattern =
    /^(portugu[eê]s|english|ingl[eê]s|spanish|espanhol|french|franc[eê]s|german|alem[aã]o|italian|italiano)\b/i;
  const languages = (certifications || []).filter((item) =>
    languagePattern.test(item.name),
  );
  const realCertifications = (certifications || []).filter(
    (item) => !languagePattern.test(item.name),
  );
  const hasLanguages = languages.length > 0;
  const hasCertifications = realCertifications.length > 0;

  if (!hasEducations && !hasLanguages && !hasCertifications) return null;

  return (
    <>
      {hasEducations && (
        <section className={styles.atsSection}>
          <h2 className={styles.atsSectionTitle}>
            {isEn ? "Education" : "Formação Acadêmica"}
          </h2>
          {educations.map((ed, idx) => (
            <div key={ed.id || idx} className={styles.atsItem}>
              <div className={styles.atsItemHeader}>
                <div>
                  <span className={styles.atsItemRole}>{ed.degree}</span>
                  {" — "}
                  <span className={styles.atsItemCompany}>
                    {ed.institution}
                    {ed.fieldOfStudy &&
                    !ed.degree
                      .toLowerCase()
                      .includes(ed.fieldOfStudy.toLowerCase())
                      ? ` (${ed.fieldOfStudy})`
                      : ""}
                  </span>
                </div>
                {(ed.startDate || ed.endDate) && (
                  <span className={styles.atsItemPeriod}>
                    {formatResumeDate(ed.startDate)} –{" "}
                    {ed.endDate
                      ? formatResumeDate(ed.endDate)
                      : isEn
                        ? "Present"
                        : "Presente"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {hasLanguages && (
        <section className={styles.atsSection}>
          <h2 className={styles.atsSectionTitle}>
            {isEn ? "Languages" : "Idiomas"}
          </h2>
          <div className={styles.atsCertificationsText}>
            <p>
              {languages
                .map((c) => formatResumeLanguage(c.name, isEn))
                .join(" • ")}
            </p>
          </div>
        </section>
      )}

      {hasCertifications && (
        <section className={styles.atsSection}>
          <h2 className={styles.atsSectionTitle}>
            {isEn ? "Certifications" : "Certificações"}
          </h2>
          <div className={styles.atsCertificationsText}>
            <p>
              {realCertifications
                .map((c) => (c.issuer ? `${c.name} (${c.issuer})` : c.name))
                .join(" • ")}
            </p>
          </div>
        </section>
      )}
    </>
  );
}
