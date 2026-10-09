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

export function sanitizeCompanyForFilename(company: string): string {
  const cleaned = company
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(
      /\b(s[\s/.]*a|ltda|eireli|me|epp|inc|corp|llc|ltd|gmbh|co|cia|group|grupo|holding)\b/gi,
      "",
    )
    .replace(/[/\\:*?"<>|._-]/g, " ")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  const genericCorporate = new Set([
    "tecnologia",
    "technology",
    "solucoes",
    "solutions",
    "servicos",
    "services",
    "sistemas",
    "systems",
    "consultoria",
    "consulting",
    "participacoes",
    "software",
    "atividades",
    "internet",
    "brasil",
  ]);

  let meaningful = words.filter((w) => !genericCorporate.has(w.toLowerCase()));
  if (meaningful.length === 0) meaningful = words;

  const selected = meaningful.slice(0, 2);

  const formatted = selected.map((word) => {
    if (word.length <= 3 && word === word.toUpperCase()) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  const result = formatted.join("_").replace(/[^a-zA-Z0-9_]/g, "");
  return result.length > 20 ? result.slice(0, 20).replace(/_+$/, "") : result;
}

export function formatResumeFilename(options: PrintResumeOptions): string {
  const langTag = options.language?.toUpperCase() === "EN" ? "[EN]" : "[PT]";
  const name = options.fullName
    ? sanitizeFilenamePart(options.fullName)
    : "Candidate";

  const parts = [langTag, name, "Resume"];

  if (!options.isMaster && options.company) {
    const sanitizedCompany = sanitizeCompanyForFilename(options.company);
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
