export function safeParseAiJson<T>(rawText: string): T {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    void 0;
  }

  cleaned = cleaned.replace(/^\s*\/\/[^\n\r]*/gm, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    void 0;
  }

  let inString = false;
  let isEscaped = false;
  let result = "";

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (char === "\\" && inString) {
      isEscaped = !isEscaped;
      result += char;
      continue;
    }

    if (char === '"' && !isEscaped) {
      if (!inString) {
        inString = true;
        result += char;
      } else {
        let j = i + 1;
        while (j < cleaned.length && /\s/.test(cleaned[j])) {
          j++;
        }
        const nextChar = cleaned[j];

        let isEndQuote = false;
        if (nextChar === ":" || nextChar === "}" || nextChar === "]") {
          isEndQuote = true;
        } else if (nextChar === ",") {
          let k = j + 1;
          while (k < cleaned.length && /\s/.test(cleaned[k])) {
            k++;
          }
          const afterComma = cleaned[k];
          if (
            afterComma === '"' ||
            afterComma === "{" ||
            afterComma === "[" ||
            afterComma === "}" ||
            afterComma === "]"
          ) {
            isEndQuote = true;
          }
        }

        if (isEndQuote) {
          inString = false;
          result += char;
        } else {
          result += "'";
        }
      }
    } else {
      if (inString && (char === "\n" || char === "\r")) {
        result += "\\n";
      } else if (inString && char === "\t") {
        result += "\\t";
      } else {
        result += char;
      }
    }

    if (isEscaped && char !== "\\") {
      isEscaped = false;
    }
  }

  try {
    return JSON.parse(result) as T;
  } catch {
    const repaired = result.replace(
      /([[,]\s*)([-a-zA-Z0-9_./]+)(\s*[,\]])/g,
      (match, p1, p2, p3) => {
        if (
          p2 === "true" ||
          p2 === "false" ||
          p2 === "null" ||
          !isNaN(Number(p2))
        ) {
          return match;
        }
        return `${p1}"${p2}"${p3}`;
      },
    );
    return JSON.parse(repaired) as T;
  }
}
