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

// 07 §8.8 Pages tree
export interface NoteSummaryItem {
  id: string;
  title: string;
  parentId?: string | null;
  pinned?: boolean;
  snippet?: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface NoteTreeNode extends NoteSummaryItem {
  parentId: string | null;
  depth: number;
  path: string;
  children: NoteTreeNode[];
}

export function buildTree(items: NoteSummaryItem[]): NoteTreeNode[] {
  // Map items to intermediate nodes
  const nodeMap = new Map<string, NoteTreeNode>();
  for (const item of items) {
    nodeMap.set(item.id, {
      ...item,
      parentId: item.parentId || null,
      depth: 1,
      path: item.title,
      children: [],
    });
  }

  const roots: NoteTreeNode[] = [];

  for (const item of items) {
    const node = nodeMap.get(item.id)!;
    if (item.parentId && nodeMap.has(item.parentId)) {
      const parent = nodeMap.get(item.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort siblings case-insensitively, then by id
  function sortNodes(list: NoteTreeNode[]) {
    list.sort((a, b) => {
      const cmp = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });
    for (const child of list) {
      sortNodes(child.children);
    }
  }

  // Assign depth and path recursively
  function assignMeta(node: NoteTreeNode, currentDepth: number, parentPath: string) {
    node.depth = currentDepth;
    node.path = parentPath ? `${parentPath} / ${node.title}` : node.title;
    for (const child of node.children) {
      assignMeta(child, currentDepth + 1, node.path);
    }
  }

  sortNodes(roots);
  for (const root of roots) {
    assignMeta(root, 1, "");
  }

  return roots;
}

export function findNodeInTree(nodes: NoteTreeNode[], id: string): NoteTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeInTree(node.children, id);
    if (found) return found;
  }
  return null;
}

export function getSubtreeHeight(node: NoteTreeNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(getSubtreeHeight));
}

export function isDescendant(parent: NoteTreeNode, targetId: string): boolean {
  for (const child of parent.children) {
    if (child.id === targetId) return true;
    if (isDescendant(child, targetId)) return true;
  }
  return false;
}

export function canMove(
  tree: NoteTreeNode[],
  id: string,
  newParentId: string | null
): "ok" | "cycle" | "too_deep" {
  const node = findNodeInTree(tree, id);
  if (!node) return "ok";

  if (newParentId === null) {
    // Move to top level (depth 1)
    const height = getSubtreeHeight(node);
    if (1 + height - 1 > 3) return "too_deep";
    return "ok";
  }

  // Cycle check: cannot move under itself or any descendant
  if (newParentId === id) return "cycle";
  if (isDescendant(node, newParentId)) return "cycle";

  // Depth check: newParent.depth + subtreeHeight <= 3
  const newParent = findNodeInTree(tree, newParentId);
  if (!newParent) return "ok";

  const height = getSubtreeHeight(node);
  if (newParent.depth + height > 3) {
    return "too_deep";
  }

  return "ok";
}

export function flattenTree(tree: NoteTreeNode[]): NoteTreeNode[] {
  const result: NoteTreeNode[] = [];
  function traverse(nodes: NoteTreeNode[]) {
    for (const n of nodes) {
      result.push(n);
      traverse(n.children);
    }
  }
  traverse(tree);
  return result;
}

export function normalizePath(p: string): string {
  return p
    .split("/")
    .map((s) => s.trim().toLowerCase())
    .join("/");
}

export type ResolveNoteResult =
  | { ok: true; note: NoteTreeNode }
  | { ok: false; error: "not_found" }
  | { ok: false; error: "ambiguous"; paths: string[] };

export function resolveNote(
  allNotes: NoteTreeNode[] | NoteSummaryItem[],
  ref: string
): ResolveNoteResult {
  const tree = "children" in (allNotes[0] || {})
    ? (allNotes as NoteTreeNode[])
    : buildTree(allNotes as NoteSummaryItem[]);
  const flat = flattenTree(tree);

  const trimmedRef = ref.trim();

  // 1. By ID
  const byId = flat.find((n) => n.id.toLowerCase() === trimmedRef.toLowerCase());
  if (byId) return { ok: true, note: byId };

  // 2. By exact path (case-insensitive, spaces around / ignored)
  const targetNormPath = normalizePath(trimmedRef);
  const byPath = flat.find((n) => normalizePath(n.path) === targetNormPath);
  if (byPath) return { ok: true, note: byPath };

  // 3. By title
  const targetTitle = trimmedRef.toLowerCase();
  const byTitle = flat.filter((n) => n.title.toLowerCase() === targetTitle);
  if (byTitle.length === 1) {
    return { ok: true, note: byTitle[0] };
  }
  if (byTitle.length > 1) {
    return {
      ok: false,
      error: "ambiguous",
      paths: byTitle.map((n) => n.path),
    };
  }

  return { ok: false, error: "not_found" };
}

// 07 §8.10 Markdown sections (for agent page tools)
export interface HeadingItem {
  level: number;
  text: string;
  lineIndex: number;
}

export function headingsOf(md: string): HeadingItem[] {
  if (!md || typeof md !== "string") return [];

  const lines = md.split(/\r?\n/);
  const result: HeadingItem[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      result.push({
        level: match[1].length,
        text: match[2].trim(),
        lineIndex: i,
      });
    }
  }

  return result;
}

export function appendToSection(md: string, add: string, heading?: string): string {
  const lines = md.split(/\r?\n/);

  if (!heading) {
    // Append at end of page
    const trimmedEnd = md.trimEnd();
    if (!trimmedEnd) return add;
    const isLastLineList = /^[-*]\s+|\d+\.\s+|-\s*\[[ xX]\]/.test(lines[lines.length - 1] || "");
    const isAddList = /^[-*]\s+|\d+\.\s+|-\s*\[[ xX]\]/.test(add.trim());
    const separator = isLastLineList && isAddList ? "\n" : "\n\n";
    return `${trimmedEnd}${separator}${add}\n`;
  }

  const headings = headingsOf(md);
  const targetClean = heading.replace(/^#{1,3}\s*/, "").trim().toLowerCase();
  const targetHeading = headings.find((h) => h.text.toLowerCase() === targetClean);

  if (!targetHeading) {
    // Fallback: append at end of page
    return appendToSection(md, add);
  }

  // Section runs until the next heading with level <= targetHeading.level, or end of doc
  let sectionEndLine = lines.length;
  for (const h of headings) {
    if (h.lineIndex > targetHeading.lineIndex && h.level <= targetHeading.level) {
      sectionEndLine = h.lineIndex;
      break;
    }
  }

  // Find insertion point before any trailing blank lines in this section
  let insertLine = sectionEndLine;
  while (insertLine > targetHeading.lineIndex + 1 && lines[insertLine - 1].trim() === "") {
    insertLine--;
  }

  const lastLine = lines[insertLine - 1] || "";
  const isLastLineList = /^[-*]\s+|\d+\.\s+|-\s*\[[ xX]\]/.test(lastLine.trim());
  const isAddList = /^[-*]\s+|\d+\.\s+|-\s*\[[ xX]\]/.test(add.trim());

  const before = lines.slice(0, insertLine);
  const after = lines.slice(insertLine);

  if (isLastLineList && isAddList) {
    return [...before, add, ...after].join("\n");
  }

  // Otherwise separated by blank line if needed
  if (before.length > 0 && before[before.length - 1].trim() !== "") {
    return [...before, "", add, ...after].join("\n");
  }
  return [...before, add, ...after].join("\n");
}

export function replaceSection(md: string, heading: string, body: string): string {
  const lines = md.split(/\r?\n/);
  const headings = headingsOf(md);
  const targetClean = heading.replace(/^#{1,3}\s*/, "").trim().toLowerCase();
  const targetHeading = headings.find((h) => h.text.toLowerCase() === targetClean);

  if (!targetHeading) {
    return md;
  }

  let sectionEndLine = lines.length;
  for (const h of headings) {
    if (h.lineIndex > targetHeading.lineIndex && h.level <= targetHeading.level) {
      sectionEndLine = h.lineIndex;
      break;
    }
  }

  const before = lines.slice(0, targetHeading.lineIndex + 1);
  const after = lines.slice(sectionEndLine);

  return [...before, body, ...after].join("\n");
}
