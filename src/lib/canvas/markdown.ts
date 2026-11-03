import type { CanvasDocNode } from "@/lib/domain/canvas";

export function docToMarkdown(doc: CanvasDocNode | unknown): string {
  if (!doc || typeof doc !== "object") {
    return "";
  }
  const root = doc as CanvasDocNode;
  if (!Array.isArray(root.content)) {
    return "";
  }

  const blocks: string[] = [];

  for (const node of root.content) {
    const serialized = serializeNode(node);
    if (serialized !== null && serialized !== "") {
      blocks.push(serialized);
    }
  }

  if (blocks.length === 0) {
    return "";
  }

  return blocks.join("\n\n") + "\n";
}

function serializeNode(node: CanvasDocNode): string {
  if (!node || typeof node !== "object") return "";

  switch (node.type) {
    case "heading": {
      const rawLevel = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const level = Math.min(Math.max(rawLevel, 1), 3);
      const prefix = "#".repeat(level) + " ";
      const text = serializeInlineContent(node.content);
      return `${prefix}${text}`;
    }

    case "paragraph": {
      return serializeInlineContent(node.content);
    }

    case "codeBlock": {
      const lang = (node.attrs?.language || node.attrs?.lang || "") as string;
      const text = extractPlainText(node.content);
      return `\`\`\`${lang}\n${text}\n\`\`\``;
    }

    case "blockquote": {
      const inner = (node.content || [])
        .map((child: CanvasDocNode) => serializeNode(child))
        .filter(Boolean)
        .join("\n\n");
      return inner
        .split("\n")
        .map((line: string) => `> ${line}`)
        .join("\n");
    }

    case "horizontalRule": {
      return "---";
    }

    case "bulletList": {
      const items = (node.content || [])
        .map((item: CanvasDocNode) => {
          const itemText = (item.content || [])
            .map((c: CanvasDocNode) => serializeNode(c))
            .join("\n");
          return `- ${itemText}`;
        })
        .join("\n");
      return items;
    }

    case "orderedList": {
      let index = 1;
      const items = (node.content || [])
        .map((item: CanvasDocNode) => {
          const itemText = (item.content || [])
            .map((c: CanvasDocNode) => serializeNode(c))
            .join("\n");
          const line = `${index}. ${itemText}`;
          index++;
          return line;
        })
        .join("\n");
      return items;
    }

    case "taskList": {
      const items = (node.content || [])
        .map((item: CanvasDocNode) => {
          const checked = !!item.attrs?.checked;
          const marker = checked ? "- [x] " : "- [ ] ";
          const itemText = (item.content || [])
            .map((c: CanvasDocNode) => serializeNode(c))
            .join("\n");
          return `${marker}${itemText}`;
        })
        .join("\n");
      return items;
    }

    case "table": {
      return serializeTable(node);
    }

    case "canvasImage":
    case "image": {
      const ref = ((node.attrs?.ref || node.attrs?.src || "") as string).trim();
      const alt = ((node.attrs?.alt || "") as string).trim();
      if (ref.startsWith("https://") || ref.startsWith("http://")) {
        return `![${alt}](${ref})`;
      }
      return "[image]";
    }

    default: {
      if (Array.isArray(node.content)) {
        return node.content.map(serializeNode).filter(Boolean).join("\n\n");
      }
      return "";
    }
  }
}

function serializeInlineContent(content?: CanvasDocNode[]): string {
  if (!Array.isArray(content) || content.length === 0) return "";

  return content.map(serializeInlineNode).join("");
}

function serializeInlineNode(node: CanvasDocNode): string {
  if (!node || typeof node !== "object") return "";

  if (node.type === "canvasImage" || node.type === "image") {
    const ref = ((node.attrs?.ref || node.attrs?.src || "") as string).trim();
    const alt = ((node.attrs?.alt || "") as string).trim();
    if (ref.startsWith("https://") || ref.startsWith("http://")) {
      return `![${alt}](${ref})`;
    }
    return "[image]";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  let text = node.text || "";

  if (Array.isArray(node.marks)) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case "bold":
          text = `**${text}**`;
          break;
        case "italic":
          text = `*${text}*`;
          break;
        case "strike":
          text = `~~${text}~~`;
          break;
        case "code":
          text = `\`${text}\``;
          break;
        case "link": {
          const href = (mark.attrs?.href || "") as string;
          text = `[${text}](${href})`;
          break;
        }
      }
    }
  }

  return text;
}

function extractPlainText(content?: CanvasDocNode[]): string {
  if (!Array.isArray(content)) return "";
  return content.map((c) => c.text || "").join("");
}

function serializeTable(tableNode: CanvasDocNode): string {
  const rows: string[][] = [];

  for (const row of tableNode.content || []) {
    if (row.type !== "tableRow") continue;
    const cells: string[] = [];

    for (const cell of row.content || []) {
      const cellText = (cell.content || [])
        .map((p: CanvasDocNode) => serializeInlineContent(p.content))
        .join(" ")
        .replace(/\|/g, "\\|")
        .trim();
      cells.push(cellText);
    }

    rows.push(cells);
  }

  if (rows.length === 0) return "";

  const colCount = Math.max(...rows.map((r) => r.length), 1);
  const normalizedRows = rows.map((r) => {
    while (r.length < colCount) r.push("");
    return r;
  });

  const lines: string[] = [];
  const header = normalizedRows[0];
  lines.push(`| ${header.join(" | ")} |`);

  // Delimiter row
  const delimiters = Array(colCount).fill("---");
  lines.push(`| ${delimiters.join(" | ")} |`);

  // Subsequent rows
  for (let i = 1; i < normalizedRows.length; i++) {
    lines.push(`| ${normalizedRows[i].join(" | ")} |`);
  }

  return lines.join("\n");
}
