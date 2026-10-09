export interface PrintResumeOptions {
  fullName?: string | null;
  position?: string | null;
  company?: string | null;
  language?: "PT" | "EN" | string | null;
  isMaster?: boolean;
}

export function sanitizeFilenamePart(part: string): string {
  return part
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function formatResumeFilename(options: PrintResumeOptions): string {
  const langTag = options.language?.toUpperCase() === "EN" ? "[EN]" : "[PT]";
  const name = options.fullName
    ? sanitizeFilenamePart(options.fullName)
    : "Candidate";

  const parts = [langTag, name, "Resume"];

  if (!options.isMaster && options.company) {
    const sanitizedCompany = sanitizeFilenamePart(options.company);
    if (sanitizedCompany) {
      parts.push(sanitizedCompany);
    }
  }

  return parts.join("_");
}

export function printResume(options: PrintResumeOptions): void {
  if (typeof window === "undefined") return;

  const filename = formatResumeFilename(options);
  const originalTitle = document.title;

  document.title = filename;

  let restored = false;
  const restoreTitle = () => {
    if (restored) return;
    restored = true;
    document.title = originalTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };

  window.addEventListener("afterprint", restoreTitle);

  window.print();

  setTimeout(restoreTitle, 3000);
}
