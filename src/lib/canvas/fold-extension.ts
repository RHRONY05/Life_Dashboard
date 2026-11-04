import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export const foldPluginKey = new PluginKey<{
  pageId: string | null;
  foldedKeys: Set<string>;
}>("canvasHeadingFolding");

export function loadFoldsFromStorage(pageId: string | null): Set<string> {
  if (!pageId || typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`life-canvas-folds-${pageId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.map(String));
    }
  } catch {
    // Ignore invalid JSON or storage errors
  }
  return new Set();
}

export function saveFoldsToStorage(pageId: string | null, folds: Set<string>): void {
  if (!pageId || typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `life-canvas-folds-${pageId}`,
      JSON.stringify(Array.from(folds))
    );
  } catch {
    // Ignore storage errors
  }
}

export const FoldExtension = Extension.create({
  name: "canvasHeadingFolding",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: foldPluginKey,
        state: {
          init: () => ({
            pageId: null,
            foldedKeys: new Set<string>(),
          }),
          apply: (tr, prev) => {
            const meta = tr.getMeta(foldPluginKey);
            if (meta) {
              if (meta.toggleKey && prev.pageId) {
                const folds = loadFoldsFromStorage(prev.pageId);
                if (folds.has(meta.toggleKey)) {
                  folds.delete(meta.toggleKey);
                } else {
                  folds.add(meta.toggleKey);
                }
                saveFoldsToStorage(prev.pageId, folds);
                return {
                  pageId: prev.pageId,
                  foldedKeys: folds,
                };
              }
              return {
                pageId: meta.pageId !== undefined ? meta.pageId : prev.pageId,
                foldedKeys: meta.foldedKeys || prev.foldedKeys,
              };
            }
            return prev;
          },
        },
        props: {
          decorations: (state) => {
            const pluginState = foldPluginKey.getState(state);
            const foldedKeys = pluginState?.foldedKeys || new Set<string>();

            const decorations: Decoration[] = [];
            const doc = state.doc;

            interface TopBlock {
              node: ProseMirrorNode;
              pos: number;
              nodeSize: number;
              isHeading: boolean;
              level: number;
              key?: string;
              isFolded?: boolean;
            }

            const topBlocks: TopBlock[] = [];
            const headingIndices = new Map<string, number>();

            doc.forEach((node, offset) => {
              const pos = offset;
              const isHeading = node.type.name === "heading" && node.attrs.level <= 3;
              let level = 0;
              let key: string | undefined;
              let isFolded = false;

              if (isHeading) {
                level = node.attrs.level;
                const text = node.textContent.trim();
                const idx = headingIndices.get(text) || 0;
                headingIndices.set(text, idx + 1);
                key = `${text}#${idx}`;
                isFolded = foldedKeys.has(key);
              }

              topBlocks.push({
                node,
                pos,
                nodeSize: node.nodeSize,
                isHeading,
                level,
                key,
                isFolded,
              });
            });

            // Second pass: for each block, determine decorations
            for (let i = 0; i < topBlocks.length; i++) {
              const b = topBlocks[i];
              if (!b.isHeading || !b.key) continue;

              const headingKey = b.key;
              const headingPos = b.pos;
              const isFolded = Boolean(b.isFolded);

              // Add fold button widget at start of heading
              decorations.push(
                Decoration.widget(
                  headingPos + 1,
                  (view) => {
                    const span = document.createElement("span");
                    span.className = "fold";
                    span.setAttribute("role", "button");
                    span.setAttribute("tabindex", "-1");
                    span.setAttribute(
                      "aria-label",
                      isFolded ? "Expand section" : "Fold section"
                    );
                    span.innerHTML = isFolded
                      ? `<svg class="lucide lucide-chevron-right" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`
                      : `<svg class="lucide lucide-chevron-down" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;

                    span.addEventListener("mousedown", (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    });
                    span.addEventListener("click", (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      view.dispatch(
                        view.state.tr.setMeta(foldPluginKey, {
                          toggleKey: headingKey,
                        })
                      );
                    });
                    return span;
                  },
                  { side: -1 }
                )
              );

              if (isFolded) {
                // Count subsequent blocks until next heading of same or higher level (<= b.level)
                let foldedCount = 0;
                for (let j = i + 1; j < topBlocks.length; j++) {
                  const next = topBlocks[j];
                  if (next.isHeading && next.level <= b.level) {
                    break;
                  }
                  foldedCount++;
                  // Hide this block
                  decorations.push(
                    Decoration.node(next.pos, next.pos + next.nodeSize, {
                      class: "folded-hidden",
                      style: "display: none !important;",
                    })
                  );
                }

                // Add node decoration to heading
                decorations.push(
                  Decoration.node(headingPos, headingPos + b.nodeSize, {
                    class: "fh folded",
                    "data-folded": `${foldedCount} ${
                      foldedCount === 1 ? "item" : "items"
                    } folded`,
                  })
                );
              } else {
                // Non-folded heading
                decorations.push(
                  Decoration.node(headingPos, headingPos + b.nodeSize, {
                    class: "fh",
                  })
                );
              }
            }

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
