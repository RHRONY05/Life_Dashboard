import { looksLikeMarkdown } from "@/lib/domain/canvas";

export function cleanPastedHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  let cleaned = html;

  // 1. Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

  // 2. Remove script, style, meta, link tags
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  cleaned = cleaned.replace(/<meta\b[^>]*>/gi, "");
  cleaned = cleaned.replace(/<link\b[^>]*>/gi, "");

  // 3. Map h4-h6 to h3
  cleaned = cleaned.replace(/<\s*h[4-6]\b([^>]*)>/gi, "<h3$1>");
  cleaned = cleaned.replace(/<\/\s*h[4-6]\s*>/gi, "</h3>");

  // 4. Clean attributes on all tags
  // We process tags by regex
  cleaned = cleaned.replace(/<\s*([a-zA-Z0-9]+)(\s+[^>]*)?(\/?)>/g, (fullMatch, tagName, attrs, closingSlash) => {
    const tag = tagName.toLowerCase();
    if (!attrs) return `<${tag}${closingSlash ? " /" : ""}>`;

    // Drop unwanted attributes: style, class, id, color, on*
    let attrStr = attrs
      .replace(/\s+style\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, "")
      .replace(/\s+class\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, "")
      .replace(/\s+id\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, "")
      .replace(/\s+color\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, "")
      .replace(/\s+on[a-zA-Z]+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, "");

    if (tag === "a") {
      // Keep only href if http(s): or mailto:
      const hrefMatch = attrStr.match(/\bhref\s*=\s*["']([^"']*)["']/i);
      if (hrefMatch) {
        const href = hrefMatch[1].trim();
        if (/^(https?:\/\/|mailto:)/i.test(href)) {
          return `<a href="${href}">`;
        }
      }
      return "<a>";
    }

    if (tag === "img") {
      const srcMatch = attrStr.match(/\bsrc\s*=\s*["']([^"']*)["']/i);
      const altMatch = attrStr.match(/\balt\s*=\s*["']([^"']*)["']/i);
      const src = srcMatch ? srcMatch[1].trim() : "";
      const alt = altMatch ? altMatch[1].trim() : "";

      if (/^https?:\/\//i.test(src) || src.startsWith("data:image/")) {
        return `<img src="${src}" alt="${alt}"${closingSlash ? " /" : ""}>`;
      }
      return "";
    }

    // For other tags, clean extra whitespace
    attrStr = attrStr.trim();
    if (attrStr) {
      return `<${tag} ${attrStr}${closingSlash ? " /" : ""}>`;
    }
    return `<${tag}${closingSlash ? " /" : ""}>`;
  });

  return cleaned.trim();
}

export function hasBlockStructure(html: string): boolean {
  if (!html) return false;
  // Block tags that indicate structure beyond simple text/div/span
  return /<\s*(p|h[1-6]|ul|ol|li|pre|code|table|blockquote|hr)\b/i.test(html);
}

export interface PasteAnalysis {
  kind: "images" | "vscode" | "html" | "url" | "markdown" | "plain";
  data?: unknown;
}

export function analyzePaste(event: ClipboardEvent): PasteAnalysis {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return { kind: "plain" };

  // 1. Files in clipboard
  const imageFiles: File[] = [];
  if (clipboardData.items) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
  } else if (clipboardData.files) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i];
      if (file.type.startsWith("image/")) {
        imageFiles.push(file);
      }
    }
  }

  if (imageFiles.length > 0) {
    return { kind: "images", data: imageFiles };
  }

  // 2. vscode-editor-data
  const vscodeData = clipboardData.getData("vscode-editor-data");
  if (vscodeData) {
    try {
      const parsed = JSON.parse(vscodeData);
      const text = clipboardData.getData("text/plain");
      return {
        kind: "vscode",
        data: {
          language: parsed.mode || "",
          text,
        },
      };
    } catch {
      // Ignore JSON parse error and proceed
    }
  }

  const plainText = clipboardData.getData("text/plain") || "";
  const htmlData = clipboardData.getData("text/html");

  // 3. text/html present
  if (htmlData && htmlData.trim().length > 0) {
    if (!hasBlockStructure(htmlData) && looksLikeMarkdown(plainText)) {
      return { kind: "markdown", data: plainText };
    }
    return { kind: "html", data: cleanPastedHtml(htmlData) };
  }

  // 4. URL
  if (/^https?:\/\/\S+$/i.test(plainText.trim())) {
    return { kind: "url", data: plainText.trim() };
  }

  // 5. looksLikeMarkdown
  if (looksLikeMarkdown(plainText)) {
    return { kind: "markdown", data: plainText };
  }

  // 6. Plain text
  return { kind: "plain", data: plainText };
}
