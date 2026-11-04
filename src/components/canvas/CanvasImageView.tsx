"use client";

import React, { useEffect, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { resolveIdbRef } from "@/lib/canvas/scratch-store";

export function CanvasImageView(props: NodeViewProps) {
  const { node, selected, editor, getPos } = props;
  const { ref, alt, width, height, uploading } = node.attrs;

  const [inRange, setInRange] = useState(false);

  useEffect(() => {
    if (!editor || typeof getPos !== "function") return;

    function checkSelection() {
      try {
        const pos = getPos();
        if (typeof pos !== "number") return;
        const { from, to } = editor.state.selection;
        // True if selection spans across this image node (e.g. Ctrl+A or drag select)
        const isSpanned = from <= pos && to >= pos + node.nodeSize && from !== to;
        setInRange(isSpanned);
      } catch {
        setInRange(false);
      }
    }

    checkSelection();
    editor.on("selectionUpdate", checkSelection);
    return () => {
      editor.off("selectionUpdate", checkSelection);
    };
  }, [editor, getPos, node.nodeSize]);

  const isSelected = selected || inRange;

  const initialSrc =
    typeof ref === "string" &&
    (ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("data:"))
      ? ref
      : typeof ref === "string" && ref.startsWith("sb:")
      ? `/api/notes/images/${ref.replace(/^sb:/, "")}`
      : "";

  const [src, setSrc] = useState<string>(initialSrc);

  useEffect(() => {
    let active = true;

    if (typeof ref === "string" && ref.startsWith("idb:")) {
      // In Scratch, resolve through IndexedDB
      const win = window as unknown as { __LIFE_USER_ID__?: string };
      const userId = win.__LIFE_USER_ID__ || "owner";
      resolveIdbRef(userId, ref).then((resolved) => {
        if (active) setSrc(resolved);
      });
    }

    return () => {
      active = false;
    };
  }, [ref]);

  return (
    <NodeViewWrapper as="span" className="inline-block my-2 max-w-full">
      <span className={clsx("cimg", isSelected && "sel", uploading && "uploading")}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt || "Canvas image"}
            className="shot block max-w-full h-auto rounded-sm border border-frame"
            style={{ width: width ? `${Math.min(width, 840)}px` : undefined }}
          />
        ) : (
          <span
            className="shot block bg-surface-2 border border-frame rounded-sm p-4 text-center text-xs text-ink-3"
            style={{ width: width ? `${Math.min(width, 400)}px` : "200px", height: "100px" }}
          >
            Loading image…
          </span>
        )}

        {uploading && (
          <span className="upill">
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading…
          </span>
        )}

        {!uploading && width && height && (
          <span className="size">
            {width} × {height}
          </span>
        )}
      </span>
    </NodeViewWrapper>
  );
}
