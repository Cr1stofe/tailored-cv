import styles from "./ResumeHeader.module.scss";

export interface ResumeHeaderProps {
  fullName: string;
  headline?: string | null;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  isEditing?: boolean;
  onUpdateHeadline?: (val: string) => void;
  headlinePlaceholder?: string;
}

export function ResumeHeader({
  fullName,
  headline,
  location,
  phone,
  email,
  linkedinUrl,
  githubUrl,
  portfolioUrl,
  isEditing = false,
  onUpdateHeadline,
  headlinePlaceholder = "Headline...",
}: ResumeHeaderProps) {
  return (
    <header className={styles.atsHeader}>
      <h1 className={styles.atsName}>{fullName || "Candidato"}</h1>

      <div className={styles.atsHeadline}>
        {isEditing ? (
          <input
            type="text"
            className={styles.atsHeadlineInput}
            value={headline || ""}
            onChange={(e) => onUpdateHeadline?.(e.target.value)}
            placeholder={headlinePlaceholder}
          />
        ) : (
          headline
        )}
      </div>

      <div className={styles.atsContacts}>
        <div className={styles.atsContactRow}>
          {email && <span>{email}</span>}
          {phone && (
            <>
              {email && <span className={styles.atsDivider}>•</span>}
              <span>{phone}</span>
            </>
          )}
          {location && (
            <>
              {(email || phone) && <span className={styles.atsDivider}>•</span>}
              <span>{location}</span>
            </>
          )}
        </div>

        {(linkedinUrl || githubUrl || portfolioUrl) && (
          <div className={styles.atsContactRow}>
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noreferrer">
                {linkedinUrl.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            )}
            {githubUrl && (
              <>
                {linkedinUrl && <span className={styles.atsDivider}>•</span>}
                <a href={githubUrl} target="_blank" rel="noreferrer">
                  {githubUrl.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </>
            )}
            {portfolioUrl && (
              <>
                {(linkedinUrl || githubUrl) && (
                  <span className={styles.atsDivider}>•</span>
                )}
                <a href={portfolioUrl} target="_blank" rel="noreferrer">
                  {portfolioUrl.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
