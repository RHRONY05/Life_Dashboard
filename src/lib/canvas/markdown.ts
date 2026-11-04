import { marked, type Tokens } from "marked";
import type { CanvasDocNode } from "@/lib/domain/canvas";

export interface DocToMarkdownOptions {
  images?: "placeholder" | "refs";
}

export function docToMarkdown(
  doc: CanvasDocNode | unknown,
  options: DocToMarkdownOptions = { images: "placeholder" }
): string {
  if (!doc || typeof doc !== "object") {
    return "";
  }
  const root = doc as CanvasDocNode;
  if (!Array.isArray(root.content)) {
    return "";
  }

  const blocks: string[] = [];

  for (const node of root.content) {
    const serialized = serializeNode(node, options);
    if (serialized !== null && serialized !== "") {
      blocks.push(serialized);
    }
  }

  if (blocks.length === 0) {
    return "";
  }

  return blocks.join("\n\n") + "\n";
}

function serializeNode(node: CanvasDocNode, options: DocToMarkdownOptions): string {
  if (!node || typeof node !== "object") return "";

  switch (node.type) {
    case "heading": {
      const rawLevel = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const level = Math.min(Math.max(rawLevel, 1), 3);
      const prefix = "#".repeat(level) + " ";
      const text = serializeInlineContent(node.content, options);
      return `${prefix}${text}`;
    }

    case "paragraph": {
      return serializeInlineContent(node.content, options);
    }

    case "codeBlock": {
      const lang = (node.attrs?.language || node.attrs?.lang || "") as string;
      const text = extractPlainText(node.content);
      return `\`\`\`${lang}\n${text}\n\`\`\``;
    }

    case "blockquote": {
      const inner = (node.content || [])
        .map((child: CanvasDocNode) => serializeNode(child, options))
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
            .map((c: CanvasDocNode) => serializeNode(c, options))
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
            .map((c: CanvasDocNode) => serializeNode(c, options))
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
            .map((c: CanvasDocNode) => serializeNode(c, options))
            .join("\n");
          return `${marker}${itemText}`;
        })
        .join("\n");
      return items;
    }

    case "table": {
      return serializeTable(node, options);
    }

    case "canvasImage":
    case "image": {
      const ref = ((node.attrs?.ref || node.attrs?.src || "") as string).trim();
      const alt = ((node.attrs?.alt || "") as string).trim();
      if (ref.startsWith("https://") || ref.startsWith("http://")) {
        return `![${alt}](${ref})`;
      }
      if (options.images === "refs" && ref.startsWith("sb:")) {
        return `![${alt}](${ref})`;
      }
      return "[image]";
    }

    default: {
      if (Array.isArray(node.content)) {
        return node.content.map((c) => serializeNode(c, options)).filter(Boolean).join("\n\n");
      }
      return "";
    }
  }
}

function serializeInlineContent(content?: CanvasDocNode[], options: DocToMarkdownOptions = { images: "placeholder" }): string {
  if (!Array.isArray(content) || content.length === 0) return "";

  return content.map((c) => serializeInlineNode(c, options)).join("");
}

function serializeInlineNode(node: CanvasDocNode, options: DocToMarkdownOptions): string {
  if (!node || typeof node !== "object") return "";

  if (node.type === "canvasImage" || node.type === "image") {
    const ref = ((node.attrs?.ref || node.attrs?.src || "") as string).trim();
    const alt = ((node.attrs?.alt || "") as string).trim();
    if (ref.startsWith("https://") || ref.startsWith("http://")) {
      return `![${alt}](${ref})`;
    }
    if (options.images === "refs" && ref.startsWith("sb:")) {
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

function serializeTable(tableNode: CanvasDocNode, options: DocToMarkdownOptions): string {
  const rows: string[][] = [];

  for (const row of tableNode.content || []) {
    if (row.type !== "tableRow") continue;
    const cells: string[] = [];

    for (const cell of row.content || []) {
      const cellText = (cell.content || [])
        .map((p: CanvasDocNode) => serializeInlineContent(p.content, options))
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

  const delimiters = Array(colCount).fill("---");
  lines.push(`| ${delimiters.join(" | ")} |`);

  for (let i = 1; i < normalizedRows.length; i++) {
    lines.push(`| ${normalizedRows[i].join(" | ")} |`);
  }

  return lines.join("\n");
}

interface CanvasNodeLike {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: CanvasNodeLike[];
}

// 07 §8.3b Plain-text copy (clipboardTextSerializer)
export function docToPlainText(sliceOrDoc: unknown): string {
  if (!sliceOrDoc || typeof sliceOrDoc !== "object") return "";

  let docJson: CanvasNodeLike | CanvasNodeLike[] = sliceOrDoc as CanvasNodeLike;
  const withToJson = sliceOrDoc as { toJSON?: () => unknown };
  if (typeof withToJson.toJSON === "function") {
    docJson = withToJson.toJSON() as CanvasNodeLike;
  }

  interface PlainBlock {
    type: "paragraph" | "heading" | "bulletItem" | "orderedItem" | "taskItem" | "codeBlock" | "tableRow";
    level: number;
    index?: number;
    checked?: boolean;
    text: string;
  }

  const blocks: PlainBlock[] = [];

  function extractTextOnly(node?: CanvasNodeLike): string {
    if (!node) return "";
    if (node.type === "text") return node.text || "";
    if (node.type === "canvasImage" || node.type === "image") return "";
    if (node.type === "hardBreak") return "\n";
    if (Array.isArray(node.content)) {
      return node.content.map(extractTextOnly).join("");
    }
    return "";
  }

  function walk(node?: CanvasNodeLike, level = 0, listType?: "bullet" | "ordered" | "task", itemIndex?: number) {
    if (!node) return;

    switch (node.type) {
      case "doc": {
        if (Array.isArray(node.content)) {
          for (const child of node.content) {
            walk(child, level);
          }
        }
        break;
      }
      case "paragraph":
      case "heading": {
        const text = extractTextOnly(node);
        blocks.push({
          type: "paragraph",
          level,
          text,
        });
        break;
      }
      case "codeBlock": {
        const text = extractTextOnly(node);
        blocks.push({
          type: "codeBlock",
          level,
          text,
        });
        break;
      }
      case "bulletList": {
        if (Array.isArray(node.content)) {
          for (const item of node.content) {
            walk(item, level, "bullet");
          }
        }
        break;
      }
      case "orderedList": {
        if (Array.isArray(node.content)) {
          let idx = 1;
          for (const item of node.content) {
            walk(item, level, "ordered", idx++);
          }
        }
        break;
      }
      case "taskList": {
        if (Array.isArray(node.content)) {
          for (const item of node.content) {
            walk(item, level, "task");
          }
        }
        break;
      }
      case "listItem": {
        const inlineTexts: string[] = [];
        const nestedLists: CanvasNodeLike[] = [];

        if (Array.isArray(node.content)) {
          for (const child of node.content) {
            if (child.type === "bulletList" || child.type === "orderedList" || child.type === "taskList") {
              nestedLists.push(child);
            } else {
              inlineTexts.push(extractTextOnly(child));
            }
          }
        }

        const text = inlineTexts.join("\n");
        if (listType === "ordered") {
          blocks.push({
            type: "orderedItem",
            level,
            index: itemIndex || 1,
            text,
          });
        } else {
          blocks.push({
            type: "bulletItem",
            level,
            text,
          });
        }

        for (const nested of nestedLists) {
          walk(nested, level + 1);
        }
        break;
      }
      case "taskItem": {
        const inlineTexts: string[] = [];
        const nestedLists: CanvasNodeLike[] = [];

        if (Array.isArray(node.content)) {
          for (const child of node.content) {
            if (child.type === "bulletList" || child.type === "orderedList" || child.type === "taskList") {
              nestedLists.push(child);
            } else {
              inlineTexts.push(extractTextOnly(child));
            }
          }
        }

        const text = inlineTexts.join("\n");
        blocks.push({
          type: "taskItem",
          level,
          checked: !!node.attrs?.checked,
          text,
        });

        for (const nested of nestedLists) {
          walk(nested, level + 1);
        }
        break;
      }
      case "table": {
        if (Array.isArray(node.content)) {
          for (const row of node.content) {
            if (row.type === "tableRow") {
              const cells: string[] = [];
              if (Array.isArray(row.content)) {
                for (const cell of row.content) {
                  cells.push(extractTextOnly(cell).trim());
                }
              }
              blocks.push({
                type: "tableRow",
                level,
                text: cells.join("\t"),
              });
            }
          }
        }
        break;
      }
      case "blockquote": {
        if (Array.isArray(node.content)) {
          for (const child of node.content) {
            walk(child, level);
          }
        }
        break;
      }
      default: {
        if (Array.isArray(node.content)) {
          for (const child of node.content) {
            walk(child, level);
          }
        } else if (node.text) {
          blocks.push({
            type: "paragraph",
            level,
            text: node.text,
          });
        }
        break;
      }
    }
  }

  if (Array.isArray(docJson)) {
    for (const n of docJson) walk(n, 0);
  } else if (docJson.content && Array.isArray(docJson.content)) {
    for (const n of docJson.content) walk(n, 0);
  } else {
    walk(docJson, 0);
  }

  if (blocks.length === 0) return "";

  // 07 §8.3b: "a selection inside one block → just that text, no prefix"
  if (blocks.length === 1) {
    return blocks[0].text;
  }

  const lines: string[] = [];
  for (const b of blocks) {
    const indent = "  ".repeat(b.level);
    switch (b.type) {
      case "bulletItem":
        lines.push(`${indent}- ${b.text}`);
        break;
      case "orderedItem":
        lines.push(`${indent}${b.index || 1}. ${b.text}`);
        break;
      case "taskItem":
        lines.push(`${indent}${b.checked ? "[x] " : "[ ] "}${b.text}`);
        break;
      case "codeBlock":
      case "tableRow":
      case "paragraph":
      case "heading":
      default:
        lines.push(`${indent}${b.text}`);
        break;
    }
  }

  return lines.join("\n");
}

// 07 §8.3 Round trip: markdownToDoc
export function markdownToDoc(md: string): CanvasDocNode {
  if (!md || typeof md !== "string") {
    return { type: "doc", content: [] };
  }

  const tokens = marked.lexer(md);
  const content: CanvasDocNode[] = [];

  for (const token of tokens) {
    const parsed = parseMarkedToken(token);
    if (parsed) {
      if (Array.isArray(parsed)) {
        content.push(...parsed);
      } else {
        content.push(parsed);
      }
    }
  }

  return {
    type: "doc",
    content,
  };
}

function parseMarkedToken(token: Tokens.Generic): CanvasDocNode | CanvasDocNode[] | null {
  switch (token.type) {
    case "heading": {
      const headingToken = token as Tokens.Heading;
      const level = Math.min(Math.max(headingToken.depth || 1, 1), 3);
      return {
        type: "heading",
        attrs: { level },
        content: parseInlineTokens(headingToken.tokens || []),
      };
    }

    case "paragraph": {
      const paraToken = token as Tokens.Paragraph;
      // If paragraph contains only a single standalone image
      if (paraToken.tokens && paraToken.tokens.length === 1 && paraToken.tokens[0].type === "image") {
        const imgToken = paraToken.tokens[0] as Tokens.Image;
        return {
          type: "canvasImage",
          attrs: {
            ref: imgToken.href || "",
            alt: imgToken.text || "",
            width: null,
            height: null,
          },
        };
      }
      return {
        type: "paragraph",
        content: parseInlineTokens(paraToken.tokens || []),
      };
    }

    case "code": {
      const codeToken = token as Tokens.Code;
      return {
        type: "codeBlock",
        attrs: { language: codeToken.lang || "" },
        content: codeToken.text ? [{ type: "text", text: codeToken.text }] : [],
      };
    }

    case "blockquote": {
      const bqToken = token as Tokens.Blockquote;
      const innerBlocks: CanvasDocNode[] = [];
      for (const t of bqToken.tokens || []) {
        const p = parseMarkedToken(t);
        if (p) {
          if (Array.isArray(p)) innerBlocks.push(...p);
          else innerBlocks.push(p);
        }
      }
      return {
        type: "blockquote",
        content: innerBlocks,
      };
    }

    case "hr": {
      return {
        type: "horizontalRule",
      };
    }

    case "list": {
      const listToken = token as Tokens.List;
      const isTask = listToken.items.some((it) => it.task);

      if (isTask) {
        return {
          type: "taskList",
          content: listToken.items.map((it) => ({
            type: "taskItem",
            attrs: { checked: !!it.checked },
            content: [
              {
                type: "paragraph",
                content: parseInlineTokens(it.tokens || []),
              },
            ],
          })),
        };
      }

      if (listToken.ordered) {
        return {
          type: "orderedList",
          content: listToken.items.map((it) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: parseInlineTokens(it.tokens || []),
              },
            ],
          })),
        };
      }

      return {
        type: "bulletList",
        content: listToken.items.map((it) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: parseInlineTokens(it.tokens || []),
            },
          ],
        })),
      };
    }

    case "table": {
      const tableToken = token as Tokens.Table;
      const rows: CanvasDocNode[] = [];

      // Header row
      const headerCells: CanvasDocNode[] = (tableToken.header || []).map((cell) => ({
        type: "tableHeader",
        content: [
          {
            type: "paragraph",
            content: parseInlineTokens(cell.tokens || []),
          },
        ],
      }));
      rows.push({ type: "tableRow", content: headerCells });

      // Body rows
      for (const row of tableToken.rows || []) {
        const cells: CanvasDocNode[] = row.map((cell) => ({
          type: "tableCell",
          content: [
            {
              type: "paragraph",
              content: parseInlineTokens(cell.tokens || []),
            },
          ],
        }));
        rows.push({ type: "tableRow", content: cells });
      }

      return {
        type: "table",
        content: rows,
      };
    }

    case "space":
      return null;

    default: {
      if (token.tokens && Array.isArray(token.tokens)) {
        const inner: CanvasDocNode[] = [];
        for (const t of token.tokens) {
          const p = parseMarkedToken(t);
          if (p) {
            if (Array.isArray(p)) inner.push(...p);
            else inner.push(p);
          }
        }
        return inner;
      }
      return null;
    }
  }
}

function parseInlineTokens(tokens: Tokens.Generic[]): CanvasDocNode[] {
  const result: CanvasDocNode[] = [];

  for (const t of tokens) {
    switch (t.type) {
      case "text": {
        const textToken = t as Tokens.Text;
        if (textToken.tokens && textToken.tokens.length > 0) {
          result.push(...parseInlineTokens(textToken.tokens));
        } else if (textToken.text) {
          result.push({ type: "text", text: textToken.text });
        }
        break;
      }

      case "strong": {
        const strongToken = t as Tokens.Strong;
        const inner = parseInlineTokens(strongToken.tokens || []);
        for (const node of inner) {
          if (node.type === "text") {
            const marks = node.marks || [];
            marks.push({ type: "bold" });
            node.marks = marks;
          }
          result.push(node);
        }
        break;
      }

      case "em": {
        const emToken = t as Tokens.Em;
        const inner = parseInlineTokens(emToken.tokens || []);
        for (const node of inner) {
          if (node.type === "text") {
            const marks = node.marks || [];
            marks.push({ type: "italic" });
            node.marks = marks;
          }
          result.push(node);
        }
        break;
      }

      case "del": {
        const delToken = t as Tokens.Del;
        const inner = parseInlineTokens(delToken.tokens || []);
        for (const node of inner) {
          if (node.type === "text") {
            const marks = node.marks || [];
            marks.push({ type: "strike" });
            node.marks = marks;
          }
          result.push(node);
        }
        break;
      }

      case "codespan": {
        const codeToken = t as Tokens.Codespan;
        result.push({
          type: "text",
          marks: [{ type: "code" }],
          text: codeToken.text,
        });
        break;
      }

      case "link": {
        const linkToken = t as Tokens.Link;
        const inner = parseInlineTokens(linkToken.tokens || []);
        for (const node of inner) {
          if (node.type === "text") {
            const marks = node.marks || [];
            marks.push({ type: "link", attrs: { href: linkToken.href } });
            node.marks = marks;
          }
          result.push(node);
        }
        break;
      }

      case "image": {
        const imgToken = t as Tokens.Image;
        result.push({
          type: "canvasImage",
          attrs: {
            ref: imgToken.href || "",
            alt: imgToken.text || "",
            width: null,
            height: null,
          },
        });
        break;
      }

      default: {
        const textVal = (t as { text?: unknown }).text;
        if (typeof textVal === "string") {
          result.push({ type: "text", text: textVal });
        }
        break;
      }
    }
  }

  return result;
}
