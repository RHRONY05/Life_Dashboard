import { Node, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { CanvasImageView } from "@/components/canvas/CanvasImageView";
import { FoldExtension } from "@/lib/canvas/fold-extension";

export const CanvasImage = Node.create({
  name: "canvasImage",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      ref: {
        default: "",
      },
      alt: {
        default: "",
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      uploading: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span.cimg",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const img = el.querySelector("img");
          return {
            ref: img?.getAttribute("src") || "",
            alt: img?.getAttribute("alt") || "",
            width: img?.naturalWidth || null,
            height: img?.naturalHeight || null,
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (dom) => {
          const el = dom as HTMLImageElement;
          return {
            ref: el.getAttribute("src") || "",
            alt: el.getAttribute("alt") || "",
            width: el.naturalWidth || null,
            height: el.naturalHeight || null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { class: "cimg" }, ["img", HTMLAttributes]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CanvasImageView);
  },

  markdownTokenName: "image",
  parseMarkdown(token: { href?: string; text?: string }) {
    return {
      type: "canvasImage",
      attrs: {
        ref: token.href || "",
        alt: token.text || "",
        width: null,
        height: null,
        uploading: false,
      },
    };
  },
});

export function getCanvasExtensions(placeholderText?: string) {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      dropcursor: false,
      link: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: "https",
      shouldAutoLink: (url: string) => {
        return /^(https?:\/\/|www\.)/i.test(url.trim());
      },
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: false,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({
      placeholder:
        placeholderText ||
        "Paste anything here: AI chats, links, screenshots, code. It stays in this browser.",
      emptyEditorClass: "is-editor-empty",
    }),
    Markdown,
    CanvasImage,
    FoldExtension,
  ];
}
