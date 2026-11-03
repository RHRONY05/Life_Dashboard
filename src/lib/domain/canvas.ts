import { format } from "date-fns";

export interface Dimensions {
  w: number;
  h: number;
}

export function fitWithin(w: number, h: number, max = 1600): Dimensions {
  const longest = Math.max(w, h);
  const scale = Math.min(1, max / longest);
  return {
    w: Math.round(w * scale),
    h: Math.round(h * scale),
  };
}

export function looksLikeMarkdown(text: string): boolean {
  if (!text || typeof text !== "string") return false;

  const lines = text.split(/\r?\n/);

  // 1. A line matches ^#{1,3} 
  const hasHeading = lines.some((line) => /^#{1,3}\s+\S/.test(line));
  if (hasHeading) return true;

  // 2. A line starts with ```
  const hasCodeFence = lines.some((line) => line.trimStart().startsWith("```"));
  if (hasCodeFence) return true;

  // 3. At least 2 lines match list markers: ^(\s*[-*] |\s*\d+\. )
  const listLineCount = lines.filter((line) =>
    /^(\s*[-*]\s+|\s*\d+\.\s+)/.test(line)
  ).length;
  if (listLineCount >= 2) return true;

  // 4. A line matches table separator: ^\|?\s*:?-{3,}
  const hasTableSep = lines.some((line) =>
    /^\|?\s*:?-{3,}/.test(line.trim())
  );
  if (hasTableSep) return true;

  // 5. Text contains **…** or […](http…)
  const hasBold = /\*\*[^*]+\*\*/.test(text);
  if (hasBold) return true;

  const hasLink = /\[[^\]]+\]\(https?:\/\/[^\)]+\)/.test(text);
  if (hasLink) return true;

  return false;
}

export function titleFromText(md: string, today?: Date | string): string {
  const fallbackDate =
    today instanceof Date
      ? today
      : typeof today === "string"
      ? new Date(today)
      : new Date();
  const defaultTitle = `Note · ${format(fallbackDate, "EEE d MMM")}`;

  if (!md || typeof md !== "string") {
    return defaultTitle;
  }

  const lines = md.split(/\r?\n/);
  let firstLine = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      firstLine = trimmed;
      break;
    }
  }

  if (!firstLine) {
    return defaultTitle;
  }

  // Strip leading formatting: #, >, - [ ], - [x], -, *, 1.
  let clean = firstLine
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s+/, "")
    .replace(/^[-*]\s*\[[ xX]\]\s+/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "");

  // Strip wrapping or inline **, _, `
  clean = clean.replace(/[*_`]/g, "").trim();

  // If after cleaning it's empty or solely an image marker like "[image]"
  if (!clean || clean === "[image]" || clean === "![image]" || /^!\[.*\]\(.*\)$/.test(clean)) {
    return defaultTitle;
  }

  if (clean.length > 60) {
    // Cut at the last space at or before char 60
    const substring = clean.slice(0, 60);
    const lastSpace = substring.lastIndexOf(" ");
    if (lastSpace > 0) {
      return substring.slice(0, lastSpace) + "…";
    }
    return substring + "…";
  }

  return clean;
}

export interface CanvasDocNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: CanvasDocNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export function imageRefs(doc: CanvasDocNode | unknown): string[] {
  const refs: string[] = [];
  if (!doc || typeof doc !== "object") return refs;

  function traverse(node: CanvasDocNode) {
    if (!node || typeof node !== "object") return;

    if (
      (node.type === "image" || node.type === "canvasImage") &&
      typeof node.attrs?.ref === "string"
    ) {
      refs.push(node.attrs.ref);
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }

  traverse(doc as CanvasDocNode);
  return Array.from(new Set(refs));
}

export function unreferencedPaths(
  refs: Set<string> | string[],
  files: Array<{ path: string; createdAt: Date | string }>,
  now: Date | string = new Date()
): string[] {
  const refSet = refs instanceof Set ? refs : new Set(refs);
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  const result: string[] = [];
  for (const file of files) {
    // Check if path or full ref is in refs
    const isReferenced =
      refSet.has(file.path) ||
      refSet.has(`sb:${file.path}`) ||
      Array.from(refSet).some((r) => r.endsWith(file.path));

    if (!isReferenced) {
      const fileCreatedAtMs = (
        file.createdAt instanceof Date
          ? file.createdAt
          : new Date(file.createdAt)
      ).getTime();
      if (nowMs - fileCreatedAtMs > TEN_MINUTES_MS) {
        result.push(file.path);
      }
    }
  }

  return result;
}
