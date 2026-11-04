import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  fitWithin,
  looksLikeMarkdown,
  titleFromText,
  imageRefs,
  unreferencedPaths,
  buildTree,
  canMove,
  resolveNote,
  headingsOf,
  appendToSection,
  replaceSection,
} from "@/lib/domain/canvas";
import { docToMarkdown, docToPlainText, markdownToDoc } from "@/lib/canvas/markdown";
import { cleanPastedHtml, analyzePaste } from "@/lib/canvas/paste";
import { enqueuePageSave, getOrCreateQueue, clearQueue } from "@/lib/canvas/save-queue";
import { CanvasImage } from "@/lib/canvas/editor";

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

  describe("8.3b docToPlainText (plain text copy)", () => {
    it("selection inside one bullet outputs just text without prefix", () => {
      const slice = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "docker run -d --rm --name deeptutor -p 127.0.0.1:3782:3782 -v deeptutor-data:/app/data ",
              },
              {
                type: "text",
                marks: [{ type: "link", attrs: { href: "https://ghcr.io/hkuds/deeptutor:latest" } }],
                text: "ghcr.io/hkuds/deeptutor:latest",
              },
            ],
          },
        ],
      };
      const plain = docToPlainText(slice);
      expect(plain).toBe(
        "docker run -d --rm --name deeptutor -p 127.0.0.1:3782:3782 -v deeptutor-data:/app/data ghcr.io/hkuds/deeptutor:latest"
      );
    });

    it("selection of paragraph with link outputs plain text", () => {
      const slice = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "See " },
              {
                type: "text",
                marks: [{ type: "link", attrs: { href: "https://www.rfc-editor.org/rfc/rfc9293" } }],
                text: "RFC 9293",
              },
              { type: "text", text: "." },
            ],
          },
        ],
      };
      const plain = docToPlainText(slice);
      expect(plain).toBe("See RFC 9293.");
    });

    it("selection of two bullets outputs - a\\n- b", () => {
      const slice = {
        type: "doc",
        content: [
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        marks: [{ type: "bold" }],
                        text: "b",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const plain = docToPlainText(slice);
      expect(plain).toBe("- a\n- b");
    });
  });

  describe("8.3 Round trip (markdownToDoc <-> docToMarkdown)", () => {
    it("round-trips canvas-doc.json with { images: 'refs' }", () => {
      const fixturePath = path.resolve(__dirname, "fixtures/canvas-doc.json");
      const originalDoc = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      // replace local idb with sb ref for testing refs option
      originalDoc.content[4].attrs.ref = "sb:user/note/img.webp";

      const md = docToMarkdown(originalDoc, { images: "refs" });
      expect(md).toContain("![Screenshot](sb:user/note/img.webp)");

      const parsedDoc = markdownToDoc(md);
      expect(parsedDoc.type).toBe("doc");
      expect(parsedDoc.content).toBeDefined();
      const content = parsedDoc.content!;
      expect(content).toHaveLength(5);
      expect(content[0].type).toBe("heading");
      expect(content[1].type).toBe("taskList");
      expect(content[2].type).toBe("codeBlock");
      expect(content[3].type).toBe("paragraph");
      expect(content[4].type).toBe("canvasImage");
      expect(content[4].attrs?.ref).toBe("sb:user/note/img.webp");
    });
  });

  describe("8.9 Save queue (rules 1-6)", () => {
    it("handles save queue with in-flight debounce and echo resolution", async () => {
      const noteId = "test-note-queue";
      clearQueue(noteId);

      const q = getOrCreateQueue(noteId, {
        updatedAt: "2026-11-04T00:00:00.000Z",
        title: "Initial Title",
        doc: { type: "doc", content: [] },
      });

      expect(q.baseUpdatedAt).toBe("2026-11-04T00:00:00.000Z");

      let saveCallCount = 0;
      const responses: Response[] = [
        new Response(
          JSON.stringify({
            id: noteId,
            title: "First Save",
            doc: { type: "doc" },
            bodyMd: "first",
            updatedAt: "2026-11-04T00:00:01.000Z",
          }),
          { status: 200 }
        ),
      ];

      const fakeSave = async () => {
        saveCallCount++;
        return responses.shift() || new Response("ok", { status: 200 });
      };

      let resultKind = "";
      await enqueuePageSave(
        noteId,
        {
          title: "First Save",
          doc: { type: "doc" },
          bodyMd: "first",
        },
        fakeSave,
        (res) => {
          resultKind = res.kind;
        }
      );

      expect(saveCallCount).toBe(1);
      expect(resultKind).toBe("saved");
      expect(q.baseUpdatedAt).toBe("2026-11-04T00:00:01.000Z");

      // Rule 3: Skip when unchanged
      resultKind = "";
      await enqueuePageSave(
        noteId,
        {
          title: "First Save",
          doc: { type: "doc" },
          bodyMd: "first",
        },
        fakeSave,
        (res) => {
          resultKind = res.kind;
        }
      );
      expect(saveCallCount).toBe(1); // skipped, no extra call
      expect(resultKind).toBe("skipped");
    });
  });

  describe("8.8 Pages tree (buildTree, canMove, resolveNote)", () => {
    const pages = [
      { id: "1", title: "DevTools", parentId: null },
      { id: "2", title: "Backend tips", parentId: "1" },
      { id: "3", title: "Postgres", parentId: "2" },
      { id: "4", title: "Frontend tips", parentId: "1" },
      { id: "5", title: "React", parentId: "4" },
    ];

    it("buildTree builds hierarchy with depth and path", () => {
      const tree = buildTree(pages);
      expect(tree).toHaveLength(1);
      const root = tree[0];
      expect(root.title).toBe("DevTools");
      expect(root.depth).toBe(1);
      expect(root.path).toBe("DevTools");
      expect(root.children).toHaveLength(2); // Backend tips, Frontend tips sorted

      const backend = root.children.find((c) => c.title === "Backend tips")!;
      expect(backend.depth).toBe(2);
      expect(backend.path).toBe("DevTools / Backend tips");
      expect(backend.children).toHaveLength(1);

      const postgres = backend.children[0];
      expect(postgres.depth).toBe(3);
      expect(postgres.path).toBe("DevTools / Backend tips / Postgres");
    });

    it("canMove prevents cycle: DevTools under Postgres -> cycle", () => {
      const tree = buildTree(pages);
      const res = canMove(tree, "1", "3");
      expect(res).toBe("cycle");
    });

    it("canMove prevents too_deep: page with one child under Backend tips -> too_deep", () => {
      const tree = buildTree(pages);
      // "Frontend tips" has child "React" (subtree height = 2)
      // Moving "Frontend tips" under "Backend tips" (depth 2): 2 + 2 = 4 > 3 -> too_deep
      const res = canMove(tree, "4", "2");
      expect(res).toBe("too_deep");
    });

    it("canMove allows valid move: Postgres to top level or under Frontend tips", () => {
      const tree = buildTree(pages);
      expect(canMove(tree, "3", null)).toBe("ok");
      expect(canMove(tree, "3", "4")).toBe("ok"); // depth 2 + height 1 = 3 <= 3
    });

    it("resolveNote resolves by ID, exact path, and title", () => {
      const tree = buildTree(pages);
      const res1 = resolveNote(tree, "devtools/backend tips");
      expect(res1.ok).toBe(true);
      if (res1.ok) {
        expect(res1.note.title).toBe("Backend tips");
      }

      const res2 = resolveNote(tree, "3");
      expect(res2.ok).toBe(true);
      if (res2.ok) {
        expect(res2.note.title).toBe("Postgres");
      }

      const res3 = resolveNote(tree, "Postgres");
      expect(res3.ok).toBe(true);
      if (res3.ok) {
        expect(res3.note.title).toBe("Postgres");
      }

      // Ambiguous title test
      const ambiguousPages = [
        ...pages,
        { id: "6", title: "Postgres", parentId: "4" },
      ];
      const ambTree = buildTree(ambiguousPages);
      const resAmb = resolveNote(ambTree, "Postgres");
      expect(resAmb.ok).toBe(false);
      if (!resAmb.ok) {
        expect(resAmb.error).toBe("ambiguous");
      }
    });
  });

  describe("8.10 Markdown sections (headingsOf, appendToSection, replaceSection)", () => {
    it("headingsOf ignores headings inside code blocks", () => {
      const md = "## Heading 1\n```bash\n## not a heading\n```\n### Heading 2";
      const headings = headingsOf(md);
      expect(headings).toHaveLength(2);
      expect(headings[0].text).toBe("Heading 1");
      expect(headings[1].text).toBe("Heading 2");
    });

    it("appendToSection appends list items without extra blank line to list", () => {
      const md = "## Libraries\n- WeasyPrint\n- FFmpeg\n\n## Tips\n1. Golden rule";
      const res = appendToSection(md, "- Spline", "libraries");
      expect(res).toBe("## Libraries\n- WeasyPrint\n- FFmpeg\n- Spline\n\n## Tips\n1. Golden rule");
    });

    it("replaceSection replaces section body keeping heading", () => {
      const md = "## Libraries\n- WeasyPrint\n- FFmpeg\n\n## Tips\n1. Golden rule";
      const res = replaceSection(md, "Tips", "1. New tip");
      expect(res).toBe("## Libraries\n- WeasyPrint\n- FFmpeg\n\n## Tips\n1. New tip");
    });
  });

  describe("8.11 CanvasImage clipboard serialization", () => {
    it("serializes CanvasImage to HTML with valid src and data-ref for rich clipboard copying", () => {
      const render = CanvasImage.config.renderHTML?.({
        node: null as unknown as import("@tiptap/pm/model").Node,
        HTMLAttributes: {
          ref: "sb:owner/note1/photo.webp",
          alt: "My photo",
        },
      });
      expect(render).toEqual([
        "span",
        { class: "cimg" },
        [
          "img",
          expect.objectContaining({
            src: expect.stringContaining("/api/notes/images/owner/note1/photo.webp"),
            "data-ref": "sb:owner/note1/photo.webp",
            alt: "My photo",
          }),
        ],
      ]);
    });
  });
});
