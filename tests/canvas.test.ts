import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  fitWithin,
  looksLikeMarkdown,
  titleFromText,
  imageRefs,
  unreferencedPaths,
} from "@/lib/domain/canvas";
import { docToMarkdown } from "@/lib/canvas/markdown";
import { cleanPastedHtml, analyzePaste } from "@/lib/canvas/paste";

describe("Canvas domain logic (07 §8)", () => {
  describe("8.1 fitWithin", () => {
    it("scales 3024 × 1964 laptop screenshot down to 1600 × 1039", () => {
      const res = fitWithin(3024, 1964, 1600);
      expect(res).toEqual({ w: 1600, h: 1039 });
    });

    it("scales 1170 × 2532 phone screenshot down to 739 × 1600", () => {
      const res = fitWithin(1170, 2532, 1600);
      expect(res).toEqual({ w: 739, h: 1600 });
    });

    it("keeps 800 × 600 unchanged (never upscales)", () => {
      const res = fitWithin(800, 600, 1600);
      expect(res).toEqual({ w: 800, h: 600 });
    });
  });

  describe("8.2 looksLikeMarkdown", () => {
    it("matches headings and lists", () => {
      expect(looksLikeMarkdown("## Plan\n- a\n- b")).toBe(true);
    });

    it("matches links", () => {
      expect(looksLikeMarkdown("see [docs](https://nextjs.org)")).toBe(true);
    });

    it("rejects plain text", () => {
      expect(looksLikeMarkdown("hello world")).toBe(false);
    });

    it("rejects simple arithmetic", () => {
      expect(looksLikeMarkdown("Price: 5 * 3 = 15")).toBe(false);
    });

    it("rejects single dash line", () => {
      expect(looksLikeMarkdown("- just one dash line")).toBe(false);
    });
  });

  describe("8.3 docToMarkdown", () => {
    it("serialises canvas-doc.json matching the 07 §8.3 worked example", () => {
      const fixturePath = path.resolve(__dirname, "fixtures/canvas-doc.json");
      const doc = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      const md = docToMarkdown(doc);

      const expected =
        "## CN questions\n\n" +
        "- [ ] Why does TCP need a 3-way handshake?\n" +
        "- [x] What is MSS?\n\n" +
        "```bash\nping -c 3 1.1.1.1\n```\n\n" +
        "See [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293).\n\n" +
        "[image]\n";

      expect(md).toBe(expected);
    });
  });

  describe("8.4 titleFromText", () => {
    it("extracts title from heading", () => {
      expect(titleFromText("## CN questions\n- [ ] Why…")).toBe("CN questions");
    });

    it("extracts title from checklist item", () => {
      expect(titleFromText("- [ ] Why does TCP need a 3-way handshake?")).toBe(
        "Why does TCP need a 3-way handshake?"
      );
    });

    it("truncates titles longer than 60 characters at last space before 60", () => {
      const input =
        "Explain the difference between distance-vector and link-state routing protocols with examples";
      const expected =
        "Explain the difference between distance-vector and…";
      expect(titleFromText(input)).toBe(expected);
    });

    it("falls back to default title when only [image]", () => {
      // 2026-11-03 was a Tuesday
      const fixedDate = new Date("2026-11-03T10:00:00Z");
      expect(titleFromText("[image]", fixedDate)).toBe("Note · Tue 3 Nov");
    });
  });

  describe("8.5 imageRefs and unreferencedPaths", () => {
    it("extracts image refs from fixture doc", () => {
      const fixturePath = path.resolve(__dirname, "fixtures/canvas-doc.json");
      const doc = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      const refs = imageRefs(doc);
      expect(refs).toEqual(["idb:11111111-2222-3333-4444-555555555555"]);
    });

    it("identifies unreferenced paths older than 10 minutes", () => {
      const now = new Date("2026-11-03T12:00:00Z");
      const refs = new Set(["u/n/a.webp"]);
      const files = [
        { path: "u/n/a.webp", createdAt: new Date("2026-11-03T11:00:00Z") }, // referenced (1h old)
        { path: "u/n/b.webp", createdAt: new Date("2026-11-03T11:00:00Z") }, // unreferenced (1h old) -> delete
        { path: "u/n/c.webp", createdAt: new Date("2026-11-03T11:58:00Z") }, // unreferenced (2m old) -> keep
      ];

      const toDelete = unreferencedPaths(refs, files, now);
      expect(toDelete).toEqual(["u/n/b.webp"]);
    });
  });

  describe("8.2 cleanPastedHtml", () => {
    it("keeps h2, ul, pre, table and drops styles, classes, scripts and comments", () => {
      const fixturePath = path.resolve(__dirname, "fixtures/ai-chat.html");
      const rawHtml = fs.readFileSync(fixturePath, "utf-8");
      const cleaned = cleanPastedHtml(rawHtml);

      expect(cleaned).toContain("<h2>");
      expect(cleaned).toContain("<ul>");
      expect(cleaned).toContain("<pre>");
      expect(cleaned).toContain("<table>");
      expect(cleaned).not.toContain("<script");
      expect(cleaned).not.toContain("badActor");
      expect(cleaned).not.toContain("style=");
      expect(cleaned).not.toContain("class=");
      expect(cleaned).not.toContain("<!--");
    });
  });

  describe("8.2 analyzePaste", () => {
    function createMockClipboardEvent(types: Record<string, string>, files: File[] = []) {
      return {
        clipboardData: {
          items: files.map((f) => ({
            kind: "file",
            type: f.type,
            getAsFile: () => f,
          })),
          files,
          getData: (type: string) => types[type] || "",
        },
      } as unknown as ClipboardEvent;
    }

    it("treats VS Code markdown file copy as markdown rather than codeBlock", () => {
      const event = createMockClipboardEvent({
        "vscode-editor-data": JSON.stringify({ mode: "markdown" }),
        "text/plain": "# Milestone 1 Report — Foundation + Today (V0-V3)",
      });
      const res = analyzePaste(event);
      expect(res.kind).toBe("markdown");
      expect(res.data).toBe("# Milestone 1 Report — Foundation + Today (V0-V3)");
    });

    it("treats VS Code copy looking like markdown as markdown even if mode is custom", () => {
      const event = createMockClipboardEvent({
        "vscode-editor-data": JSON.stringify({ mode: "custom-ext" }),
        "text/plain": "## Heading 2\n- list item 1\n- list item 2",
      });
      const res = analyzePaste(event);
      expect(res.kind).toBe("markdown");
    });

    it("treats VS Code plaintext copy as plain", () => {
      const event = createMockClipboardEvent({
        "vscode-editor-data": JSON.stringify({ mode: "plaintext" }),
        "text/plain": "Just a normal note line",
      });
      const res = analyzePaste(event);
      expect(res.kind).toBe("plain");
      expect(res.data).toBe("Just a normal note line");
    });

    it("treats VS Code programming language copy as vscode code block", () => {
      const event = createMockClipboardEvent({
        "vscode-editor-data": JSON.stringify({ mode: "typescript" }),
        "text/plain": "const x: number = 42;",
      });
      const res = analyzePaste(event);
      expect(res.kind).toBe("vscode");
      expect(res.data).toEqual({
        language: "typescript",
        text: "const x: number = 42;",
      });
    });

    it("identifies standalone URL", () => {
      const event = createMockClipboardEvent({
        "text/plain": "https://example.com/docs",
      });
      const res = analyzePaste(event);
      expect(res.kind).toBe("url");
      expect(res.data).toBe("https://example.com/docs");
    });
  });
});
