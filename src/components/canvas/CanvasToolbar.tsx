"use client";

import React, { useRef } from "react";
import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  ListTodo,
  TextQuote,
  SquareCode,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { processImageFile } from "@/lib/canvas/images";
import { saveImageToIdb } from "@/lib/canvas/scratch-store";
import { toast } from "sonner";

interface CanvasToolbarProps {
  editor: Editor | null;
  userId: string;
  disabled?: boolean;
  onUploadImage?: (file: File) => Promise<{ ref: string; width?: number; height?: number }>;
}

export function CanvasToolbar({
  editor,
  userId,
  disabled,
  onUploadImage,
}: CanvasToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const handleLink = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter link URL:", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleImagePicker = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (onUploadImage) {
          const res = await onUploadImage(file);
          editor
            .chain()
            .focus()
            .insertContent({
              type: "canvasImage",
              attrs: {
                ref: res.ref,
                alt: file.name,
                width: res.width,
                height: res.height,
              },
            })
            .run();
        } else {
          const processed = await processImageFile(file);
          const id = crypto.randomUUID();
          const ref = await saveImageToIdb(userId, id, processed);
          editor
            .chain()
            .focus()
            .insertContent({
              type: "canvasImage",
              attrs: {
                ref,
                alt: file.name,
                width: processed.width,
                height: processed.height,
              },
            })
            .run();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to add image.";
        toast.error(msg);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="etoolbar" role="toolbar" aria-label="Formatting">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleImagePicker}
      />

      {/* Headings */}
      <button
        type="button"
        className={clsx("tb", editor.isActive("heading", { level: 1 }) && "on")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        disabled={disabled}
        aria-label="Heading 1"
      >
        H1
      </button>
      <button
        type="button"
        className={clsx("tb", editor.isActive("heading", { level: 2 }) && "on")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        disabled={disabled}
        aria-label="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        className={clsx("tb", editor.isActive("heading", { level: 3 }) && "on")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        disabled={disabled}
        aria-label="Heading 3"
      >
        H3
      </button>

      <span className="tb-sep" />

      {/* Inline styles */}
      <button
        type="button"
        className={clsx("tb", editor.isActive("bold") && "on")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={disabled}
        aria-label="Bold"
      >
        <Bold className="w-[17px] h-[17px]" />
      </button>
      <button
        type="button"
        className={clsx("tb", editor.isActive("italic") && "on")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={disabled}
        aria-label="Italic"
      >
        <Italic className="w-[17px] h-[17px]" />
      </button>
      <button
        type="button"
        className={clsx("tb", editor.isActive("strike") && "on")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={disabled}
        aria-label="Strikethrough"
      >
        <Strikethrough className="w-[17px] h-[17px]" />
      </button>
      <button
        type="button"
        className={clsx("tb", editor.isActive("code") && "on")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={disabled}
        aria-label="Inline code"
      >
        <Code className="w-[17px] h-[17px]" />
      </button>

      <span className="tb-sep" />

      {/* Lists */}
      <button
        type="button"
        className={clsx("tb", editor.isActive("bulletList") && "on")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={disabled}
        aria-label="Bullet list"
      >
        <List className="w-[17px] h-[17px]" />
      </button>
      <button
        type="button"
        className={clsx("tb", editor.isActive("orderedList") && "on")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        disabled={disabled}
        aria-label="Numbered list"
      >
        <ListOrdered className="w-[17px] h-[17px]" />
      </button>
      <button
        type="button"
        className={clsx("tb", editor.isActive("taskList") && "on")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        disabled={disabled}
        aria-label="Checklist"
      >
        <ListTodo className="w-[17px] h-[17px]" />
      </button>

      <span className="tb-sep" />

      {/* Blocks */}
      <button
        type="button"
        className={clsx("tb", editor.isActive("blockquote") && "on")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={disabled}
        aria-label="Quote"
      >
        <TextQuote className="w-[17px] h-[17px]" />
      </button>
      <button
        type="button"
        className={clsx("tb", editor.isActive("codeBlock") && "on")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        disabled={disabled}
        aria-label="Code block"
      >
        <SquareCode className="w-[17px] h-[17px]" />
      </button>

      <span className="tb-sep" />

      {/* Link and Image */}
      <button
        type="button"
        className={clsx("tb", editor.isActive("link") && "on")}
        onClick={handleLink}
        disabled={disabled}
        aria-label="Link"
      >
        <LinkIcon className="w-[17px] h-[17px]" />
      </button>
      <button
        type="button"
        className="tb"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        aria-label="Image"
      >
        <ImageIcon className="w-[17px] h-[17px]" />
      </button>

      <span className="hint hidden lg:inline">
        Paste anything · <kbd>Ctrl Shift V</kbd> plain text
      </span>
    </div>
  );
}
