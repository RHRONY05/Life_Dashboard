"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import clsx from "clsx";
import {
  Copy,
  MoreHorizontal,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  FilePlus,
  CopyPlus,
  FileText,
  ClipboardPaste,
  X,
  Plus,
  Pin,
  PinOff,
  ChevronDown,
  GitCompare,
  Bot,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { getCanvasExtensions } from "@/lib/canvas/editor";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { NotesPane } from "@/components/canvas/NotesPane";
import { docToMarkdown, docToPlainText } from "@/lib/canvas/markdown";
import {
  enqueuePageSave,
  getOrCreateQueue,
  updateQueueBaseUpdatedAt,
} from "@/lib/canvas/save-queue";
import { analyzePaste } from "@/lib/canvas/paste";
import { processImageFile } from "@/lib/canvas/images";
import { imageRefs, titleFromText, buildTree, findNodeInTree } from "@/lib/domain/canvas";
import {
  foldPluginKey,
  loadFoldsFromStorage,
} from "@/lib/canvas/fold-extension";
import {
  isIndexedDBAvailable,
  loadScratch,
  saveScratch,
  saveImageToIdb,
  deleteUnreferencedImages,
  revokeObjectUrls,
} from "@/lib/canvas/scratch-store";
import { Banner } from "@/components/ui/Banner";
import { IconButton } from "@/components/ui/IconButton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { NoteDto, NoteSummaryDto } from "@/lib/schemas";

interface CanvasEditorProps {
  userId: string;
}

// Module-level lock holder to prevent React 19 StrictMode mount/cleanup race conditions
let tabLockRelease: (() => void) | null = null;

function formatRelativeDate(iso?: string): string {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

export function CanvasEditor({ userId }: CanvasEditorProps) {
  // Navigation & View state
  const [mobileTab, setMobileTab] = useState<"scratch" | "notes">("scratch");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<NoteDto | null>(null);
  const [activeNoteTitle, setActiveNoteTitle] = useState<string>("");
  const initialActiveNoteIdRef = useRef<string | null>(null);
  const isTabsRestoredRef = useRef<boolean>(false);

  // Tabs state: up to 8 page tabs + Scratch (Scratch is active when activeNoteId === null)
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const tabLruOrderRef = useRef<string[]>([]);
  const tabScrollMapRef = useRef<Map<string | null, number>>(new Map());
  const [loadingNoteId, setLoadingNoteId] = useState<string | null>(null);
  const noteCacheRef = useRef<Map<string, NoteDto>>(new Map());
  const scratchDocRef = useRef<JSONContent | null>(null);

  // Notes list state
  const [notes, setNotes] = useState<NoteSummaryDto[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scratch & Concurrency state
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [isLockedByOther, setIsLockedByOther] = useState<boolean>(false);
  const [isStorageFull, setIsStorageFull] = useState<boolean>(false);
  const [scratchSaveStatus, setScratchSaveStatus] = useState<"saved" | "saving">("saved");
  const [noteSaveStatus, setNoteSaveStatus] = useState<
    "saved" | "saving" | "error" | "offline"
  >("saved");
  const [staleConflictNote, setStaleConflictNote] = useState<NoteDto | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isUndoConfirmOpen, setIsUndoConfirmOpen] = useState<boolean>(false);
  const [imageCount, setImageCount] = useState<number>(0);
  const [isIdbSupported] = useState<boolean>(() => isIndexedDBAvailable());

  // References
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const activeNoteRef = useRef<NoteDto | null>(null);
  const activeNoteTitleRef = useRef<string>(activeNoteTitle);
  const activeNoteIdRef = useRef<string | null>(activeNoteId);
  const openTabsRef = useRef<string[]>(openTabs);
  const isLoadingNoteRef = useRef<boolean>(false);

  useEffect(() => {
    activeNoteRef.current = activeNote;
    activeNoteTitleRef.current = activeNoteTitle;
    activeNoteIdRef.current = activeNoteId;
    openTabsRef.current = openTabs;
  }, [activeNote, activeNoteTitle, activeNoteId, openTabs]);

  // Expose userId globally for CanvasImageView resolution
  useEffect(() => {
    const win = window as unknown as { __LIFE_USER_ID__?: string };
    win.__LIFE_USER_ID__ = userId;
    return () => {
      delete win.__LIFE_USER_ID__;
      revokeObjectUrls();
    };
  }, [userId]);

  // Initial fetch of notes
  useEffect(() => {
    let ignore = false;
    fetch("/api/notes")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data?.notes) {
          const fetchedNotes: NoteSummaryDto[] = data.notes;
          setNotes(fetchedNotes);

          // Restore tabs from localStorage
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem(`life-canvas-tabs-${userId}`);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.open)) {
                  // Only keep note IDs that actually exist
                  const validIds = parsed.open.filter((id: string) =>
                    fetchedNotes.some((n) => n.id === id)
                  );
                  setOpenTabs(validIds.slice(0, 8));
                  tabLruOrderRef.current = [...validIds];

                  if (
                    parsed.active &&
                    fetchedNotes.some((n) => n.id === parsed.active)
                  ) {
                    initialActiveNoteIdRef.current = parsed.active;
                  }
                }
              }
            } catch {
              // ignore
            }
            isTabsRestoredRef.current = true;
          }
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [userId]);

  // Persist open tabs to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !isTabsRestoredRef.current) return;
    try {
      localStorage.setItem(
        `life-canvas-tabs-${userId}`,
        JSON.stringify({
          open: openTabs,
          active: activeNoteId,
        })
      );
    } catch {
      // ignore
    }
  }, [openTabs, activeNoteId, userId]);

  // Fetch notes function
  const fetchNotes = useCallback(async (q?: string) => {
    try {
      const url =
        q && q.trim().length > 0
          ? `/api/notes?q=${encodeURIComponent(q.trim())}`
          : "/api/notes";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch {
      // offline / transient error
    }
  }, []);

  // Debounced search
  const handleSearchChange = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
      searchDebounceTimerRef.current = setTimeout(() => {
        fetchNotes(q);
      }, 200);
    },
    [fetchNotes]
  );

  // Note save worker
  const performNoteSave = useCallback(
    async (
      noteId: string,
      currentNote: NoteDto,
      docJson: Record<string, unknown>,
      titleText: string
    ) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setNoteSaveStatus("offline");
        return;
      }

      setNoteSaveStatus("saving");
      try {
        const md = docToMarkdown(docJson, { images: "refs" });
        await enqueuePageSave<NoteDto>(
          noteId,
          {
            title: titleText.trim() || currentNote.title,
            doc: docJson,
            bodyMd: md,
          },
          async (id, body) => {
            return fetch(`/api/notes/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
          },
          (result) => {
            if (result.kind === "saved") {
              const updated = result.note;
              noteCacheRef.current.set(updated.id, updated);
              if (activeNoteIdRef.current === updated.id) {
                setActiveNote(updated);
                setActiveNoteTitle(updated.title);
                activeNoteTitleRef.current = updated.title;
                setStaleConflictNote(null);
                setNoteSaveStatus("saved");
              }

              // Update notes summary list in state
              setNotes((prev) =>
                prev.map((n) =>
                  n.id === updated.id
                    ? {
                        ...n,
                        title: updated.title,
                        snippet: updated.snippet,
                        updatedAt: updated.updatedAt,
                      }
                    : n
                )
              );
            } else if (result.kind === "stale_conflict") {
              if (activeNoteIdRef.current === result.note.id) {
                setStaleConflictNote(result.note);
                setNoteSaveStatus("error");
              }
            } else if (result.kind === "skipped") {
              if (activeNoteIdRef.current === noteId) {
                setNoteSaveStatus("saved");
              }
            } else if (result.kind === "error") {
              if (activeNoteIdRef.current === noteId) {
                setNoteSaveStatus("error");
              }
            }
          }
        );
      } catch {
        setNoteSaveStatus("error");
      }
    },
    []
  );

  const triggerNoteSave = useCallback(() => {
    if (isLoadingNoteRef.current) return;
    const currentId = activeNoteIdRef.current;
    const currentNote = activeNoteRef.current;
    const currentTitle = activeNoteTitleRef.current;
    if (!currentId || !currentNote || !editorRef.current) return;
    if (currentNote.id !== currentId) return;

    const docJson = editorRef.current.getJSON();
    performNoteSave(currentId, currentNote, docJson, currentTitle);
  }, [performNoteSave]);

  // Network online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      if (noteSaveStatus === "offline" && activeNoteIdRef.current) {
        triggerNoteSave();
      }
    };
    const handleOffline = () => {
      if (activeNoteIdRef.current) {
        setNoteSaveStatus("offline");
      }
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [noteSaveStatus, triggerNoteSave]);

  // Request Web Lock for Scratch tab ownership and setup BroadcastChannel
  useEffect(() => {
    let unmounted = false;

    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("life-scratch-tabs");
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === "stolen") {
          if (!activeNoteIdRef.current && editorRef.current) {
            try {
              saveScratch(userId, editorRef.current.getJSON());
            } catch {}
          }
          setIsReadOnly(true);
          setIsLockedByOther(true);
        }
      };
    }

    if (typeof navigator !== "undefined" && "locks" in navigator) {
      if (!tabLockRelease) {
        const acquire = () => {
          if (unmounted) return;

          navigator.locks
            .request("life-scratch", { ifAvailable: true }, async (lock) => {
              if (unmounted) return;

              if (!lock) {
                setTimeout(() => {
                  if (unmounted) return;
                  navigator.locks
                    .request("life-scratch", { ifAvailable: true }, async (retryLock) => {
                      if (unmounted) return;
                      if (!retryLock) {
                        setIsReadOnly(true);
                        setIsLockedByOther(true);
                        return;
                      }

                      setIsReadOnly(false);
                      setIsLockedByOther(false);

                      return new Promise<void>((resolve) => {
                        tabLockRelease = resolve;
                      });
                    })
                    .catch(() => {
                      if (!unmounted) {
                        setIsReadOnly(true);
                        setIsLockedByOther(true);
                      }
                    });
                }, 60);
                return;
              }

              setIsReadOnly(false);
              setIsLockedByOther(false);

              return new Promise<void>((resolve) => {
                tabLockRelease = resolve;
              });
            })
            .catch((err) => {
              if (err.name !== "AbortError") {
                if (!unmounted) {
                  setIsReadOnly(true);
                  setIsLockedByOther(true);
                }
              }
            });
        };

        acquire();
      }
    }

    const handleUnload = () => {
      if (tabLockRelease) {
        tabLockRelease();
        tabLockRelease = null;
      }
    };
    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      unmounted = true;
      if (tabLockRelease) {
        tabLockRelease();
        tabLockRelease = null;
      }
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
      if (channel) {
        channel.close();
      }
    };
  }, [userId]);

  const handleUseHere = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({ type: "stolen" });
    }

    if (tabLockRelease) {
      tabLockRelease();
      tabLockRelease = null;
    }

    if (typeof navigator !== "undefined" && "locks" in navigator) {
      navigator.locks
        .request("life-scratch", { steal: true }, async (lock) => {
          if (!lock) return;
          setIsReadOnly(false);
          setIsLockedByOther(false);

          return new Promise<void>((resolve) => {
            tabLockRelease = resolve;
          });
        })
        .catch(() => {});
    } else {
      setIsReadOnly(false);
      setIsLockedByOther(false);
    }
  }, []);

  // Request persistence
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  // Image upload handler for notes (replaces local paste/picker in notes)
  const handleNoteImageUpload = useCallback(
    async (file: File): Promise<{ ref: string; width?: number; height?: number }> => {
      const currentId = activeNoteIdRef.current;
      if (!currentId) throw new Error("No active page");

      const processed = await processImageFile(file);
      const formData = new FormData();
      formData.append("file", processed.blob, file.name);

      const res = await fetch(`/api/notes/${currentId}/images`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to upload image.");
      }

      const data = await res.json();
      return {
        ref: data.ref,
        width: processed.width,
        height: processed.height,
      };
    },
    []
  );

  // Tiptap Editor instance
  const editor = useEditor({
    extensions: getCanvasExtensions(),
    autofocus: "end",
    immediatelyRender: false,
    editable: !isReadOnly,
    editorProps: {
      attributes: {
        class: "focus:outline-none outline-none min-h-[500px] cursor-text",
        "aria-label": "Canvas editor",
        role: "textbox",
        "tabindex": "0",
      },
      clipboardTextSerializer: (slice) => {
        return docToPlainText(slice);
      },
      handlePaste: (view, event) => {
        const analysis = analyzePaste(event);

        if (analysis.kind === "plain") {
          return false;
        }

        if (analysis.kind === "images") {
          event.preventDefault();
          const files = (analysis.data as File[]) || [];

          (async () => {
            for (const file of files) {
              if (!activeNoteIdRef.current) {
                // Scratch: store in IndexedDB
                try {
                  const processed = await processImageFile(file);
                  const id = crypto.randomUUID();
                  const ref = await saveImageToIdb(userId, id, processed);
                  editorRef.current
                    ?.chain()
                    .focus()
                    .insertContent({
                      type: "canvasImage",
                      attrs: {
                        ref,
                        width: processed.width,
                        height: processed.height,
                        uploading: false,
                      },
                    })
                    .run();
                } catch (err: unknown) {
                  if (err && typeof err === "object" && "name" in err && err.name === "QuotaExceededError") {
                    setIsStorageFull(true);
                  }
                  toast.error("Failed to store image in browser storage.");
                }
              } else {
                // Saved Page: upload to server
                try {
                  const up = await handleNoteImageUpload(file);
                  editorRef.current
                    ?.chain()
                    .focus()
                    .insertContent({
                      type: "canvasImage",
                      attrs: {
                        ref: up.ref,
                        width: up.width,
                        height: up.height,
                        uploading: false,
                      },
                    })
                    .run();
                  triggerNoteSave();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : "Failed to upload image.";
                  toast.error(msg);
                }
              }
            }
          })();
          return true;
        }

        if (analysis.kind === "markdown") {
          event.preventDefault();
          const md = analysis.data as string;
          editorRef.current
            ?.chain()
            .focus()
            .insertContent(md, { contentType: "markdown" })
            .run();
          return true;
        }

        if (analysis.kind === "html") {
          event.preventDefault();
          const html = analysis.data as string;
          editorRef.current
            ?.chain()
            .focus()
            .insertContent(html, { contentType: "html" })
            .run();
          return true;
        }

        if (analysis.kind === "vscode") {
          event.preventDefault();
          const data = analysis.data as { language: string; text: string };
          editorRef.current
            ?.chain()
            .focus()
            .insertContent({
              type: "codeBlock",
              attrs: { language: data.language || "" },
              content: [{ type: "text", text: data.text }],
            })
            .run();
          return true;
        }

        if (analysis.kind === "url") {
          const url = analysis.data as string;
          const { state } = view;
          const { from, to } = state.selection;
          if (from !== to) {
            event.preventDefault();
            editorRef.current?.chain().focus().setLink({ href: url }).run();
            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      const count = imageRefs(json).length;
      setImageCount(count);

      if (activeNoteIdRef.current) {
        if (isLoadingNoteRef.current) return;
        if (!activeNoteRef.current || activeNoteRef.current.id !== activeNoteIdRef.current) return;
        // Active Page: 800ms debounce save
        setNoteSaveStatus("saving");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          triggerNoteSave();
        }, 800);
      } else {
        // Scratch: Keep in-memory ref immediately in sync!
        scratchDocRef.current = json;

        // 500ms debounce save to IndexedDB & localStorage
        setScratchSaveStatus("saving");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
          try {
            await saveScratch(userId, json);
            setScratchSaveStatus("saved");
            setIsStorageFull(false);
          } catch (err: unknown) {
            if (err && typeof err === "object" && "name" in err && err.name === "QuotaExceededError") {
              setIsStorageFull(true);
            }
            setScratchSaveStatus("saved");
          }
        }, 500);
      }
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Update editor editable state when read-only status changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly);
    }
  }, [editor, isReadOnly]);

  // Initial load: Load Scratch from IndexedDB on mount if no active note
  useEffect(() => {
    if (!editor || activeNoteIdRef.current) return;

    let active = true;
    loadScratch(userId)
      .then((saved) => {
        if (!active) return;
        if (saved && saved.doc) {
          scratchDocRef.current = saved.doc as JSONContent;
          editor.commands.setContent(saved.doc, { emitUpdate: false });
          setImageCount(imageRefs(saved.doc).length);
        } else {
          editor.commands.setContent({
            type: "doc",
            content: [{ type: "paragraph" }],
          }, { emitUpdate: false });
        }
      })
      .catch(() => {
        if (!active) return;
        editor.commands.setContent({
          type: "doc",
          content: [{ type: "paragraph" }],
        }, { emitUpdate: false });
      });

    return () => {
      active = false;
    };
  }, [editor, userId]);

  // Visibility and pagehide save for Scratch & Note
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (activeNoteIdRef.current) {
          triggerNoteSave();
        } else if (editor && !isReadOnly) {
          try {
            saveScratch(userId, editor.getJSON());
          } catch {}
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeNoteIdRef.current && noteSaveStatus === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Flush pending Scratch save on unmount if on Scratch
      if (!activeNoteIdRef.current && editorRef.current && !isReadOnly) {
        try {
          const currentDoc = editorRef.current.getJSON();
          scratchDocRef.current = currentDoc;
          saveScratch(userId, currentDoc);
        } catch {}
      }
    };
  }, [editor, isReadOnly, userId, noteSaveStatus, triggerNoteSave]);

  // Select Scratch
  const handleSelectScratch = useCallback(async () => {
    const outgoingId = activeNoteIdRef.current;
    // If already on Scratch, don't interrupt active typing or clear pending saves
    if (outgoingId === null) {
      setMobileTab("scratch");
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const outgoingNote = activeNoteRef.current;
    const outgoingTitle = activeNoteTitleRef.current;

    if (outgoingId && outgoingNote && outgoingNote.id === outgoingId && editorRef.current) {
      const outgoingDoc = editorRef.current.getJSON();
      performNoteSave(outgoingId, outgoingNote, outgoingDoc, outgoingTitle);
      tabScrollMapRef.current.set(outgoingId, window.scrollY);
    }

    activeNoteIdRef.current = null;
    activeNoteRef.current = null;
    isLoadingNoteRef.current = false;
    setActiveNoteId(null);
    setActiveNote(null);
    setActiveNoteTitle("");
    setStaleConflictNote(null);
    setMobileTab("scratch");
    setLoadingNoteId(null);

    if (editorRef.current) {
      // Clear folds on Scratch
      const tr = editorRef.current.state.tr.setMeta(foldPluginKey, {
        pageId: null,
        foldedKeys: new Set(),
      });
      editorRef.current.view.dispatch(tr);

      // Fast-path: if scratch doc is in memory cache, restore immediately in 0ms!
      if (scratchDocRef.current) {
        editorRef.current.commands.setContent(scratchDocRef.current, { emitUpdate: false });
        setImageCount(imageRefs(scratchDocRef.current).length);
        const prevScroll = tabScrollMapRef.current.get(null) ?? 0;
        window.scrollTo({ top: prevScroll });
      }

      // Revalidate from IndexedDB
      try {
        const saved = await loadScratch(userId);
        if (saved && saved.doc) {
          scratchDocRef.current = saved.doc as JSONContent;
          if (editorRef.current && activeNoteIdRef.current === null) {
            editorRef.current.commands.setContent(saved.doc, { emitUpdate: false });
            setImageCount(imageRefs(saved.doc).length);
          }
        } else if (!scratchDocRef.current && editorRef.current) {
          editorRef.current.commands.setContent(
            {
              type: "doc",
              content: [{ type: "paragraph" }],
            },
            { emitUpdate: false }
          );
          setImageCount(0);
        }
      } catch {}

      // Restore Scratch scroll
      const prevScroll = tabScrollMapRef.current.get(null) ?? 0;
      window.scrollTo({ top: prevScroll });
    }
  }, [userId, performNoteSave]);

  const handleBackToPages = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const outgoingId = activeNoteIdRef.current;
    const outgoingNote = activeNoteRef.current;
    const outgoingTitle = activeNoteTitleRef.current;

    if (outgoingId && outgoingNote && outgoingNote.id === outgoingId && editorRef.current) {
      const outgoingDoc = editorRef.current.getJSON();
      performNoteSave(outgoingId, outgoingNote, outgoingDoc, outgoingTitle);
      tabScrollMapRef.current.set(outgoingId, window.scrollY);
    }

    activeNoteIdRef.current = null;
    activeNoteRef.current = null;
    isLoadingNoteRef.current = false;
    setActiveNoteId(null);
    setActiveNote(null);
    setActiveNoteTitle("");
    setStaleConflictNote(null);
    setMobileTab("notes");
  }, [performNoteSave]);

  // Select Note / Page
  const handleSelectNote = useCallback(
    async (noteId: string) => {
      // 0. Cancel any pending debounce save timer immediately
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const outgoingId = activeNoteIdRef.current;
      const outgoingNote = activeNoteRef.current;
      const outgoingTitle = activeNoteTitleRef.current;

      // 1. Flush outgoing note save or Scratch save cleanly
      if (!outgoingId && editorRef.current) {
        try {
          const scratchJson = editorRef.current.getJSON();
          scratchDocRef.current = scratchJson;
          await saveScratch(userId, scratchJson);
          tabScrollMapRef.current.set(null, window.scrollY);
        } catch {}
      } else if (outgoingId && outgoingNote && outgoingNote.id === outgoingId && editorRef.current) {
        const outgoingDoc = editorRef.current.getJSON();
        performNoteSave(outgoingId, outgoingNote, outgoingDoc, outgoingTitle);
        tabScrollMapRef.current.set(outgoingId, window.scrollY);
      }

      if (outgoingId === noteId) {
        return;
      }

      // 2. INSTANT OPTIMISTIC TAB HIGHLIGHT (0ms)
      activeNoteIdRef.current = noteId;
      setActiveNoteId(noteId);
      const noteSummary = notes.find((n) => n.id === noteId);
      if (noteSummary) {
        setActiveNoteTitle(noteSummary.title);
        activeNoteTitleRef.current = noteSummary.title;
      }

      // Add to openTabs immediately so the tab lights up in 0ms!
      setOpenTabs((prev) => {
        if (prev.includes(noteId)) {
          return prev;
        }
        let nextTabs = [...prev];
        if (nextTabs.length >= 8) {
          const lruList = tabLruOrderRef.current;
          const evictCandidate = lruList.find(
            (id) => id !== outgoingId && nextTabs.includes(id)
          );
          const toEvict = evictCandidate || nextTabs[0];
          nextTabs = nextTabs.filter((id) => id !== toEvict);
        }
        const activeIdx = outgoingId ? nextTabs.indexOf(outgoingId) : -1;
        if (activeIdx >= 0) {
          nextTabs.splice(activeIdx + 1, 0, noteId);
        } else {
          nextTabs.push(noteId);
        }
        return nextTabs;
      });

      // Update LRU tracking
      tabLruOrderRef.current = [
        ...tabLruOrderRef.current.filter((id) => id !== noteId),
        noteId,
      ];
      setMobileTab("scratch");

      // 3. FAST PATH: Check memory cache
      const cached = noteCacheRef.current.get(noteId);
      if (cached) {
        isLoadingNoteRef.current = false;
        activeNoteRef.current = cached;
        setActiveNote(cached);
        setActiveNoteTitle(cached.title);
        activeNoteTitleRef.current = cached.title;
        setLoadingNoteId(null);
        getOrCreateQueue(cached.id, cached);

        if (editorRef.current) {
          if (cached.doc) {
            editorRef.current.commands.setContent(cached.doc, { emitUpdate: false });
            setImageCount(imageRefs(cached.doc).length);
          } else {
            editorRef.current.commands.setContent(cached.bodyMd || "", {
              contentType: "markdown",
              emitUpdate: false,
            });
            setImageCount(0);
          }

          const folds = loadFoldsFromStorage(cached.id);
          const tr = editorRef.current.state.tr.setMeta(foldPluginKey, {
            pageId: cached.id,
            foldedKeys: folds,
          });
          editorRef.current.view.dispatch(tr);

          const prevScroll = tabScrollMapRef.current.get(cached.id) ?? 0;
          window.scrollTo({ top: prevScroll });
        }
      } else {
        // Cache miss: clear activeNoteRef so no stray saves can fire, clear editor
        isLoadingNoteRef.current = true;
        activeNoteRef.current = null;
        setLoadingNoteId(noteId);
        if (editorRef.current) {
          editorRef.current.commands.setContent(
            { type: "doc", content: [{ type: "paragraph" }] },
            { emitUpdate: false }
          );
          setImageCount(0);
        }
      }

      // 4. Background fetch / revalidate
      try {
        const res = await fetch(`/api/notes/${noteId}`);
        if (!res.ok) {
          if (!cached) {
            toast.error("Could not load page.");
            setLoadingNoteId(null);
            isLoadingNoteRef.current = false;
          }
          return;
        }

        const noteData: NoteDto = await res.json();
        noteCacheRef.current.set(noteData.id, noteData);
        getOrCreateQueue(noteData.id, noteData);

        // Only update editor if user is STILL on this note
        if (activeNoteIdRef.current === noteId) {
          isLoadingNoteRef.current = false;
          // Preserve any local title edits made while fetch was in flight
          const currentTitle = activeNoteTitleRef.current;
          const hasLocalTitleEdit = currentTitle && currentTitle !== noteData.title && currentTitle.trim().length > 0;
          const resolvedTitle = hasLocalTitleEdit ? currentTitle : noteData.title;

          const updatedNote = { ...noteData, title: resolvedTitle };
          noteCacheRef.current.set(noteId, updatedNote);
          activeNoteRef.current = updatedNote;
          setActiveNote(updatedNote);
          setActiveNoteTitle(resolvedTitle);
          activeNoteTitleRef.current = resolvedTitle;
          setStaleConflictNote(null);
          setNoteSaveStatus("saved");
          setLoadingNoteId(null);

          if (editorRef.current) {
            if (noteData.doc) {
              editorRef.current.commands.setContent(noteData.doc, { emitUpdate: false });
              setImageCount(imageRefs(noteData.doc).length);
            } else {
              editorRef.current.commands.setContent(noteData.bodyMd || "", {
                contentType: "markdown",
                emitUpdate: false,
              });
              setImageCount(0);
            }

            const folds = loadFoldsFromStorage(noteData.id);
            const tr = editorRef.current.state.tr.setMeta(foldPluginKey, {
              pageId: noteData.id,
              foldedKeys: folds,
            });
            editorRef.current.view.dispatch(tr);

            const prevScroll = tabScrollMapRef.current.get(noteData.id) ?? 0;
            window.scrollTo({ top: prevScroll });
          }
        }
      } catch {
        if (!cached) {
          toast.error("Failed to load page.");
          setLoadingNoteId(null);
          isLoadingNoteRef.current = false;
        }
      }
    },
    [userId, performNoteSave, notes]
  );

  // Restore active tab note if initially requested
  useEffect(() => {
    if (initialActiveNoteIdRef.current && editor) {
      const id = initialActiveNoteIdRef.current;
      initialActiveNoteIdRef.current = null;
      handleSelectNote(id);
    }
  }, [editor, handleSelectNote]);

  // Close tab
  const handleCloseTab = useCallback(
    (tabId: string) => {
      // Flush save of closing tab if active
      if (activeNoteIdRef.current === tabId) {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        const outgoingNote = activeNoteRef.current;
        const outgoingTitle = activeNoteTitleRef.current;
        if (outgoingNote && outgoingNote.id === tabId && editorRef.current) {
          const outgoingDoc = editorRef.current.getJSON();
          performNoteSave(tabId, outgoingNote, outgoingDoc, outgoingTitle);
        }
        const currentTabs = openTabsRef.current;
        const idx = currentTabs.indexOf(tabId);
        const nextId = idx > 0 ? currentTabs[idx - 1] : null;
        if (nextId) {
          handleSelectNote(nextId);
        } else {
          handleSelectScratch();
        }
      }

      setOpenTabs((prev) => prev.filter((id) => id !== tabId));
      tabLruOrderRef.current = tabLruOrderRef.current.filter((id) => id !== tabId);
      tabScrollMapRef.current.delete(tabId);
    },
    [handleSelectNote, handleSelectScratch, performNoteSave]
  );

  // New Page
  const handleNewPage = useCallback(
    async (parentId: string | null = null) => {
      if (notes.length >= 300) {
        toast.error("300 pages is the maximum. Delete old ones first.");
        return;
      }

      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Untitled",
            parentId: parentId || null,
            bodyMd: "",
            doc: { type: "doc", content: [{ type: "paragraph" }] },
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.message || "Failed to create page.");
          return;
        }

        const created: NoteDto = await res.json();
        noteCacheRef.current.set(created.id, created);
        await fetchNotes();
        toast("Page created");
        await handleSelectNote(created.id);
      } catch {
        toast.error("Failed to create page.");
      }
    },
    [notes.length, fetchNotes, handleSelectNote]
  );

  // Pin / Unpin toggle
  const handlePinToggle = useCallback(
    async (id: string, pinned: boolean) => {
      if (pinned) {
        const count = notes.filter((n) => n.pinned).length;
        if (count >= 5) {
          toast.error("5 pinned pages is the maximum. Unpin one first.");
          return;
        }
      }

      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned }),
        });

        if (res.ok) {
          toast(pinned ? "Page pinned" : "Page unpinned");
          await fetchNotes();
          if (activeNoteIdRef.current === id) {
            const updated = await res.json();
            setActiveNote(updated);
          }
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.message || "Failed to update page.");
        }
      } catch {
        toast.error("Failed to update page.");
      }
    },
    [notes, fetchNotes]
  );

  // Move to
  const handleMoveTo = useCallback(
    async (id: string, targetParentId: string | null) => {
      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: targetParentId }),
        });

        if (res.ok) {
          toast("Page moved");
          await fetchNotes();
          if (activeNoteIdRef.current === id) {
            const updated = await res.json();
            setActiveNote(updated);
          }
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.message || "Failed to move page.");
        }
      } catch {
        toast.error("Failed to move page.");
      }
    },
    [fetchNotes]
  );

  // Delete note
  const handleDeleteNoteConfirm = useCallback(async () => {
    if (!activeNote) return;

    try {
      const res = await fetch(`/api/notes/${activeNote.id}`, {
        method: "DELETE",
      });

      if (res.ok || res.status === 204) {
        toast("Page deleted");
        setIsDeleteDialogOpen(false);
        const deletedId = activeNote.id;
        setOpenTabs((prev) => prev.filter((id) => id !== deletedId));
        handleSelectScratch();
        fetchNotes();
      } else {
        toast.error("Could not delete page.");
      }
    } catch {
      toast.error("Could not delete page.");
    }
  }, [activeNote, handleSelectScratch, fetchNotes]);

  // See theirs (drop unsaved typing, load latest from server)
  const handleSeeTheirs = useCallback(() => {
    if (!staleConflictNote || !activeNoteIdRef.current) return;
    const incoming = staleConflictNote;
    updateQueueBaseUpdatedAt(incoming.id, incoming.updatedAt);
    setActiveNote(incoming);
    setActiveNoteTitle(incoming.title);
    setStaleConflictNote(null);
    setNoteSaveStatus("saved");
    if (editorRef.current) {
      if (incoming.doc) {
        editorRef.current.commands.setContent(incoming.doc, { emitUpdate: false });
        setImageCount(imageRefs(incoming.doc).length);
      } else {
        editorRef.current.commands.setContent(incoming.bodyMd || "", {
          contentType: "markdown",
          emitUpdate: false,
        });
        setImageCount(0);
      }
    }
  }, [staleConflictNote]);

  // Keep mine (overwrite server with current typing)
  const handleKeepMine = useCallback(() => {
    if (!staleConflictNote || !activeNoteIdRef.current || !editorRef.current) return;
    const incoming = staleConflictNote;
    setStaleConflictNote(null);
    updateQueueBaseUpdatedAt(activeNoteIdRef.current, incoming.updatedAt);
    performNoteSave(
      activeNoteIdRef.current,
      incoming,
      editorRef.current.getJSON(),
      activeNoteTitleRef.current
    );
  }, [staleConflictNote, performNoteSave]);

  // Undo agent edit
  const handleConfirmUndo = useCallback(async () => {
    if (!activeNote) return;
    const actorName = activeNote.prevBy || "Agent";
    setIsUndoConfirmOpen(false);
    try {
      const res = await fetch(`/api/notes/${activeNote.id}/undo-agent-edit`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Failed to undo edit.");
        return;
      }
      const undoneNote: NoteDto = await res.json();
      updateQueueBaseUpdatedAt(undoneNote.id, undoneNote.updatedAt);
      setActiveNote(undoneNote);
      setActiveNoteTitle(undoneNote.title);
      setStaleConflictNote(null);
      setNoteSaveStatus("saved");
      if (editorRef.current) {
        if (undoneNote.doc) {
          editorRef.current.commands.setContent(undoneNote.doc, { emitUpdate: false });
          setImageCount(imageRefs(undoneNote.doc).length);
        } else {
          editorRef.current.commands.setContent(undoneNote.bodyMd || "", {
            contentType: "markdown",
            emitUpdate: false,
          });
          setImageCount(0);
        }
      }
      toast(`${actorName}'s edit undone`);
      fetchNotes();
    } catch {
      toast.error("Failed to undo edit.");
    }
  }, [activeNote, fetchNotes]);

  // 60s background polling + visibilitychange (07 §8.9 rule 7)
  useEffect(() => {
    if (!activeNoteId) return;

    let cancelled = false;

    const checkRefresh = async () => {
      if (document.visibilityState !== "visible") return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      if (!activeNoteRef.current) return;

      const currentId = activeNoteIdRef.current;
      if (!currentId) return;

      const queue = getOrCreateQueue(currentId);
      const base = queue.baseUpdatedAt || activeNoteRef.current.updatedAt;

      try {
        const res = await fetch(
          `/api/notes/${currentId}?since=${encodeURIComponent(base)}`
        );
        if (cancelled) return;
        if (res.status === 204) {
          return;
        }
        if (res.ok) {
          const incoming: NoteDto = await res.json();
          if (cancelled) return;

          const docJson = editorRef.current
            ? JSON.stringify(editorRef.current.getJSON())
            : "";
          const isDocUnsaved = docJson !== queue.lastSavedDocJson;
          const isTitleUnsaved =
            activeNoteTitleRef.current !== queue.lastSavedTitle;
          const hasUnsavedEdits =
            queue.inFlight || queue.dirty || isDocUnsaved || isTitleUnsaved;

          if (!hasUnsavedEdits) {
            updateQueueBaseUpdatedAt(incoming.id, incoming.updatedAt);
            setActiveNote(incoming);
            setActiveNoteTitle(incoming.title);
            setStaleConflictNote(null);
            if (editorRef.current) {
              if (incoming.doc) {
                editorRef.current.commands.setContent(incoming.doc, {
                  emitUpdate: false,
                });
                setImageCount(imageRefs(incoming.doc).length);
              } else {
                editorRef.current.commands.setContent(
                  incoming.bodyMd || "",
                  {
                    contentType: "markdown",
                    emitUpdate: false,
                  }
                );
                setImageCount(0);
              }
            }
            const actorName =
              incoming.prevBy || incoming.createdBy || "Muse";
            toast(`${incoming.title} was updated by ${actorName}`);
            fetchNotes();
          } else {
            setStaleConflictNote(incoming);
          }
        }
      } catch {
        // network / transient error
      }
    };

    const intervalId = setInterval(checkRefresh, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkRefresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeNoteId, fetchNotes]);

  // Copy as Markdown
  const handleCopyAsMarkdown = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON();
    const md = docToMarkdown(json, { images: "refs" });
    navigator.clipboard.writeText(md).then(() => {
      const lineCount = md.split("\n").filter((l) => l.trim().length > 0).length;
      toast(`Copied as Markdown · ${lineCount} lines`);
    });
  }, [editor]);


  // Export as PDF
  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  // Clear Scratch
  const handleClearScratch = useCallback(() => {
    if (!editor || isReadOnly) return;
    const prevDoc = editor.getJSON();

    editor.commands.setContent({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
    saveScratch(userId, editor.getJSON());

    toast("Scratch cleared", {
      duration: 10000,
      action: {
        label: "Undo",
        onClick: () => {
          editor.commands.setContent(prevDoc);
          saveScratch(userId, prevDoc);
        },
      },
      onDismiss: () => {
        deleteUnreferencedImages(userId, editor.getJSON());
      },
      onAutoClose: () => {
        deleteUnreferencedImages(userId, editor.getJSON());
      },
    });
  }, [editor, isReadOnly, userId]);

  // Save as page (from Scratch)
  const handleSaveAsPage = useCallback(async () => {
    if (!editor) return;
    if (notes.length >= 300) {
      toast.error("300 pages is the maximum. Delete old ones first.");
      return;
    }

    const json = editor.getJSON();
    const md = docToMarkdown(json, { images: "refs" });
    const title = titleFromText(md, new Date());

    try {
      const createRes = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          bodyMd: md,
          doc: json,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        toast.error(err.message || "Failed to save page.");
        return;
      }

      const createdNote: NoteDto = await createRes.json();

      // Upload local idb images to page storage
      const updatedDoc = JSON.parse(JSON.stringify(json));
      const refs = imageRefs(updatedDoc);
      const idbRefs = refs.filter((r) => r.startsWith("idb:"));
      let uploadFailures = 0;

      if (idbRefs.length > 0) {
        const { getImageFromIdb } = await import("@/lib/canvas/scratch-store");
        const replacedMap: Record<string, string> = {};

        for (const idbRef of idbRefs) {
          const imgId = idbRef.replace(/^idb:/, "");
          const stored = await getImageFromIdb(userId, imgId);
          if (stored) {
            const formData = new FormData();
            formData.append(
              "file",
              stored.blob,
              `image-${imgId}.${stored.type.split("/")[1] || "webp"}`
            );
            const upRes = await fetch(`/api/notes/${createdNote.id}/images`, {
              method: "POST",
              body: formData,
            });
            if (upRes.ok) {
              const upData = await upRes.json();
              replacedMap[idbRef] = upData.ref;
            } else {
              uploadFailures++;
            }
          }
        }

        const walk = (node: Record<string, unknown>) => {
          if (
            node.type === "canvasImage" &&
            node.attrs &&
            typeof (node.attrs as Record<string, unknown>).ref === "string"
          ) {
            const attrs = node.attrs as Record<string, unknown>;
            const current = attrs.ref as string;
            if (replacedMap[current]) {
              attrs.ref = replacedMap[current];
            }
          }
          if (Array.isArray(node.content)) {
            for (const child of node.content) {
              walk(child as Record<string, unknown>);
            }
          }
        };
        walk(updatedDoc);

        await fetch(`/api/notes/${createdNote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseUpdatedAt: createdNote.updatedAt,
            doc: updatedDoc,
            bodyMd: docToMarkdown(updatedDoc),
          }),
        });
      }

      await fetchNotes();

      if (uploadFailures > 0) {
        toast(`Saved, but ${uploadFailures} image couldn't be uploaded.`);
      }

      toast(`Saved as “${title}”`, {
        action: {
          label: "Open",
          onClick: () => {
            handleSelectNote(createdNote.id);
          },
        },
      });
    } catch {
      toast.error("Failed to save page.");
    }
  }, [editor, notes.length, userId, fetchNotes, handleSelectNote]);

  // Copy to Scratch
  const handleCopyToScratch = useCallback(async () => {
    if (!editor) return;
    const currentJson = editor.getJSON();
    const scratchSaved = await loadScratch(userId);
    const scratchDoc: { type: string; content?: unknown[] } =
      (scratchSaved?.doc as { type: string; content?: unknown[] }) || {
        type: "doc",
        content: [{ type: "paragraph" }],
      };

    if (Array.isArray(currentJson.content)) {
      scratchDoc.content = [
        ...(scratchDoc.content || []),
        ...JSON.parse(JSON.stringify(currentJson.content)),
      ];
    }

    await saveScratch(userId, scratchDoc);
    toast("Copied to Scratch");
  }, [editor, userId]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+P / Cmd+P: Export as PDF
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        handleExportPdf();
      }

      // Ctrl+Alt+M: Copy page as Markdown
      if (e.ctrlKey && e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        handleCopyAsMarkdown();
      }

      // Ctrl+Alt+N: New page
      if (e.ctrlKey && e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        handleNewPage(null);
      }

      // Ctrl+Shift+C: Copy selection as Markdown
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "c" || e.key === "C")
      ) {
        if (editorRef.current && !editorRef.current.state.selection.empty) {
          e.preventDefault();
          const slice = editorRef.current.state.selection.content();
          const md = docToMarkdown(
            { type: "doc", content: slice.toJSON()?.content || [] },
            { images: "refs" }
          ).trim();
          if (md) {
            navigator.clipboard.writeText(md);
            toast("Copied as Markdown");
          }
        }
      }

      // Ctrl+S: Save as page / Save page
      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (activeNoteIdRef.current) {
          triggerNoteSave();
        } else {
          handleSaveAsPage();
        }
      }

      // Alt+1 ... Alt+9: Switch tabs
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (e.key >= "1" && e.key <= "9") {
          e.preventDefault();
          const num = parseInt(e.key, 10);
          if (num === 1) {
            handleSelectScratch();
          } else {
            const targetId = openTabsRef.current[num - 2];
            if (targetId) {
              handleSelectNote(targetId);
            }
          }
        } else if (e.key === "w" || e.key === "W") {
          if (activeNoteIdRef.current) {
            e.preventDefault();
            handleCloseTab(activeNoteIdRef.current);
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleCopyAsMarkdown,
    handleExportPdf,
    handleSaveAsPage,
    handleNewPage,
    handleSelectScratch,
    handleSelectNote,
    handleCloseTab,
    triggerNoteSave,
  ]);

  // Breadcrumbs calculation
  const breadcrumbs = useMemo(() => {
    if (!activeNote || !activeNote.parentId) return [];
    const crumbs: Array<{ id: string; title: string }> = [];
    let currId: string | null = activeNote.parentId;
    while (currId) {
      const parent = notes.find((n) => n.id === currId);
      if (!parent) break;
      crumbs.unshift({ id: parent.id, title: parent.title });
      currId = parent.parentId || null;
    }
    return crumbs;
  }, [activeNote, notes]);

  // Tree and active node calculation
  const tree = useMemo(() => buildTree(notes), [notes]);
  const activeNode = useMemo(() => {
    if (!activeNote) return null;
    return findNodeInTree(tree, activeNote.id);
  }, [activeNote, tree]);

  // Direct child pages calculation
  const childPages = useMemo(() => {
    if (!activeNote) return [];
    return notes.filter((n) => n.parentId === activeNote.id);
  }, [activeNote, notes]);

  return (
    <div className="canvas-main flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8">
      {/* State Banners */}
      {!isIdbSupported && !activeNoteId && (
        <Banner variant="warn" className="mb-4">
          <AlertTriangle className="w-4 h-4 stroke-[2]" />
          <span>
            This browser won&apos;t keep Scratch. It&apos;s lost when you close
            the tab.
          </span>
        </Banner>
      )}

      {isStorageFull && !activeNoteId && (
        <Banner variant="danger" className="mb-4">
          <AlertCircle className="w-4 h-4 stroke-[2]" />
          <span>
            Browser storage is full. Save Scratch as a page or clear it.
          </span>
        </Banner>
      )}

      {isLockedByOther && !activeNoteId && (
        <div className="mb-4 p-3 bg-accent-soft text-accent-text border border-frame rounded-md flex items-center justify-between text-sm font-semibold">
          <span>Scratch is open in another tab.</span>
          <button
            type="button"
            onClick={handleUseHere}
            className="px-3 py-1 bg-frame text-white text-xs font-bold rounded hover:opacity-90 transition-opacity cursor-pointer"
          >
            Use here
          </button>
        </div>
      )}

      {/* Mobile Top Controls (< 768px) */}
      <div className="md:hidden flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between gap-2">
          {activeNoteId ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <IconButton
                aria-label="Back to Pages"
                onClick={handleBackToPages}
              >
                <ArrowLeft className="w-4 h-4" />
              </IconButton>

              {/* Mobile Tab Switcher Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs font-bold bg-surface border border-line px-2 py-1 rounded max-w-[140px] truncate cursor-pointer"
                  >
                    <span className="truncate">{activeNoteTitle || "Untitled"}</span>
                    <ChevronDown className="w-3 h-3 text-ink-3 flex-none" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onClick={handleSelectScratch}
                    className="flex items-center gap-2 cursor-pointer font-semibold"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    <span>Scratch</span>
                  </DropdownMenuItem>
                  {openTabs.map((tid) => {
                    const n = notes.find((item) => item.id === tid);
                    return (
                      <DropdownMenuItem
                        key={tid}
                        onClick={() => handleSelectNote(tid)}
                        className={clsx(
                          "flex items-center justify-between cursor-pointer",
                          activeNoteId === tid && "bg-accent-soft text-accent-text font-bold"
                        )}
                      >
                        <span className="truncate">{n?.title || "Untitled"}</span>
                        <button
                          type="button"
                          className="w-4 h-4 text-ink-3 hover:text-ink cursor-pointer ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseTab(tid);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <input
                type="text"
                value={activeNoteTitle}
                onChange={(e) => {
                  setActiveNoteTitle(e.target.value);
                  activeNoteTitleRef.current = e.target.value;
                }}
                onBlur={() => {
                  if (!activeNoteTitle.trim() && activeNote) {
                    setActiveNoteTitle(activeNote.title);
                    activeNoteTitleRef.current = activeNote.title;
                  } else if (activeNote && activeNote.id === activeNoteIdRef.current) {
                    triggerNoteSave();
                  }
                }}
                className="ntitle text-sm font-bold bg-transparent border-b border-transparent focus:border-frame focus:outline-none flex-1 truncate"
                placeholder="Untitled page"
              />
            </div>
          ) : (
            /* Mobile Segmented Control (Scratch / Pages) */
            <div className="seg block flex-1 flex bg-surface border border-line rounded-md p-0.5">
              <button
                type="button"
                className={clsx(
                  "flex-1 py-1.5 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
                  mobileTab === "scratch"
                    ? "bg-accent-soft text-accent-text font-bold"
                    : "text-ink-2"
                )}
                onClick={() => setMobileTab("scratch")}
              >
                Scratch
              </button>
              <button
                type="button"
                className={clsx(
                  "flex-1 py-1.5 text-xs font-semibold rounded text-center transition-colors cursor-pointer",
                  mobileTab === "notes"
                    ? "bg-accent-soft text-accent-text font-bold"
                    : "text-ink-2"
                )}
                onClick={() => setMobileTab("notes")}
              >
                Pages <span className="c text-ink-3">{notes.length}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 flex-none">
            <IconButton
              aria-label="Export as PDF"
              onClick={handleExportPdf}
              title="Export as PDF"
            >
              <FileDown className="w-4 h-4" />
            </IconButton>

            <IconButton
              aria-label="Copy as Markdown"
              onClick={handleCopyAsMarkdown}
            >
              <Copy className="w-4 h-4" />
            </IconButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton aria-label="More options">
                  <MoreHorizontal className="w-4 h-4" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeNoteId && activeNote ? (
                  <>
                    {activeNode && activeNode.depth < 3 && (
                      <DropdownMenuItem
                        onClick={() => handleNewPage(activeNote.id)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New sub-page</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handlePinToggle(activeNote.id, !activeNote.pinned)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      {activeNote.pinned ? (
                        <>
                          <PinOff className="w-4 h-4" />
                          <span>Unpin</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-4 h-4" />
                          <span>Pin</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleExportPdf}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Export as PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCopyToScratch}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <CopyPlus className="w-4 h-4" />
                      <span>Copy to Scratch</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-danger flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete page</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={handleSaveAsPage}
                      className="flex items-center gap-2 cursor-pointer"
                      disabled={isReadOnly}
                    >
                      <FilePlus className="w-4 h-4" />
                      <span>Save as page</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleExportPdf}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Export as PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleExportPdf}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Export as PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleClearScratch}
                      className="text-danger flex items-center gap-2 cursor-pointer"
                      disabled={isReadOnly}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear Scratch</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Breadcrumb */}
        {activeNoteId && breadcrumbs.length > 0 && (
          <nav className="m-crumbs flex items-center gap-1 text-xs text-ink-3 px-1" aria-label="Breadcrumb">
            {breadcrumbs.map((b) => (
              <React.Fragment key={b.id}>
                <button
                  type="button"
                  onClick={() => handleSelectNote(b.id)}
                  className="text-ink-2 hover:underline cursor-pointer"
                >
                  {b.title}
                </button>
                <span>›</span>
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Mobile Status Row */}
        {(mobileTab === "scratch" || activeNoteId) && (
          <div className="m-status flex items-center justify-between px-1 text-xs text-ink-3">
            {activeNoteId ? (
              <span
                className={clsx(
                  "save-status",
                  noteSaveStatus === "saving" && "busy",
                  noteSaveStatus === "error" && "err",
                  noteSaveStatus === "offline" && "off"
                )}
              >
                <span className="dot" />
                {noteSaveStatus === "saving"
                  ? "Saving…"
                  : noteSaveStatus === "error"
                  ? "Couldn't save · Retry"
                  : noteSaveStatus === "offline"
                  ? "Offline · saves when you're back"
                  : "Saved"}
              </span>
            ) : (
              <span
                className={clsx(
                  "save-status",
                  scratchSaveStatus === "saving" && "busy"
                )}
              >
                <span className="dot" />
                {scratchSaveStatus === "saving"
                  ? "Saving…"
                  : "Saved · this browser"}
              </span>
            )}
            {imageCount > 0 && (
              <span className="save-status">
                {imageCount} {imageCount === 1 ? "image" : "images"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="canvas-wrap grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Pane (Desktop: Always visible / Mobile: Visible when 'notes' tab is active and not editing note) */}
        <div
          className={clsx(
            "md:block",
            mobileTab === "notes" && !activeNoteId ? "block" : "hidden"
          )}
        >
          <NotesPane
            notes={notes}
            activeNoteId={activeNoteId}
            onSelectScratch={handleSelectScratch}
            onSelectNote={handleSelectNote}
            onNewPage={handleNewPage}
            onPinToggle={handlePinToggle}
            onMoveTo={handleMoveTo}
            onDeleteNote={(id) => {
              if (activeNoteId === id) {
                handleDeleteNoteConfirm();
              } else {
                fetch(`/api/notes/${id}`, { method: "DELETE" }).then(() => {
                  toast("Page deleted");
                  setOpenTabs((prev) => prev.filter((t) => t !== id));
                  fetchNotes();
                });
              }
            }}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            userId={userId}
          />
        </div>

        {/* Desktop Tab Bar & Editor Card */}
        <div
          className={clsx(
            "md:flex md:flex-col gap-2.5 min-w-0",
            mobileTab === "scratch" || activeNoteId ? "block" : "hidden"
          )}
        >
          {/* Tab Bar (Desktop >= 768px) */}
          <div className="ptabs hidden md:flex" role="tablist" aria-label="Open pages">
            {/* Scratch tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeNoteId === null}
              onClick={handleSelectScratch}
              className={clsx(
                "ptab scratch cursor-pointer",
                activeNoteId === null && "on"
              )}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Scratch</span>
            </button>

            {/* Page tabs */}
            {openTabs.map((tid) => {
              const noteSummary = notes.find((n) => n.id === tid);
              const title =
                activeNoteId === tid && activeNoteTitle
                  ? activeNoteTitle
                  : noteSummary?.title || "Untitled";
              const isSelected = activeNoteId === tid;

              return (
                <div
                  key={tid}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectNote(tid)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      handleCloseTab(tid);
                    }
                  }}
                  className={clsx(
                    "ptab cursor-pointer select-none group",
                    isSelected && "on"
                  )}
                >
                  <FileText className="w-3.5 h-3.5 flex-none" />
                  <span title={title}>{title}</span>
                  <button
                    type="button"
                    className="x"
                    aria-label={`Close ${title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tid);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            <span className="count">
              {openTabs.length} / 8 · <kbd>Alt 1–9</kbd>
            </span>
          </div>

          {/* Editor Card */}
          <section
            className="ecard bg-surface border border-frame rounded-lg shadow-md flex flex-col overflow-hidden relative"
            aria-label={activeNoteId ? "Page editor" : "Scratch"}
          >
            {loadingNoteId && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent animate-pulse z-30" />
            )}
            {/* Desktop Ecard Head (>= 768px) */}
            <div className="ecard-head hidden md:flex items-center gap-3 px-5 py-3 border-b border-frame select-none">
              <div className="title-col flex-1 min-w-0">
                {/* Breadcrumbs */}
                {activeNoteId && breadcrumbs.length > 0 && (
                  <nav className="crumbs" aria-label="Breadcrumb">
                    {breadcrumbs.map((b) => (
                      <React.Fragment key={b.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectNote(b.id)}
                          className="hover:underline cursor-pointer"
                        >
                          {b.title}
                        </button>
                        <span>›</span>
                      </React.Fragment>
                    ))}
                  </nav>
                )}

                {activeNoteId ? (
                  <input
                    type="text"
                    value={activeNoteTitle}
                    onChange={(e) => {
                  setActiveNoteTitle(e.target.value);
                  activeNoteTitleRef.current = e.target.value;
                }}
                    onBlur={() => {
                      if (!activeNoteTitle.trim() && activeNote) {
                        setActiveNoteTitle(activeNote.title);
                      } else if (activeNote && activeNote.id === activeNoteIdRef.current) {
                        triggerNoteSave();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    className="ntitle text-base font-bold bg-transparent border border-transparent hover:border-line-strong rounded px-2 py-0.5 focus:border-frame focus:outline-none w-full"
                    placeholder="Untitled page"
                  />
                ) : (
                  <h2 className="font-display font-extrabold text-sm uppercase tracking-tight">
                    Scratch
                  </h2>
                )}
              </div>

              {activeNoteId ? (
                <span
                  className={clsx(
                    "save-status flex-none",
                    noteSaveStatus === "saving" && "busy",
                    noteSaveStatus === "error" && "err",
                    noteSaveStatus === "offline" && "off"
                  )}
                >
                  <span className="dot" />
                  {noteSaveStatus === "saving" ? (
                    "Saving…"
                  ) : noteSaveStatus === "error" ? (
                    <button
                      type="button"
                      onClick={triggerNoteSave}
                      className="underline font-semibold cursor-pointer"
                    >
                      Couldn&apos;t save · Retry
                    </button>
                  ) : noteSaveStatus === "offline" ? (
                    "Offline · saves when you're back"
                  ) : (
                    "Saved"
                  )}
                </span>
              ) : (
                <span
                  className={clsx(
                    "save-status flex-none",
                    scratchSaveStatus === "saving" && "busy"
                  )}
                >
                  <span className="dot" />
                  {scratchSaveStatus === "saving"
                    ? "Saving…"
                    : "Saved · this browser"}
                </span>
              )}

              {/* Action Buttons */}
              <button
                type="button"
                id="copy-markdown-btn"
                className="btn btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded shadow-[2px_2px_0_var(--signal)] bg-accent text-accent-ink hover:bg-accent-hover cursor-pointer flex-none"
                onClick={handleCopyAsMarkdown}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy as Markdown</span>
              </button>

              <button
                type="button"
                id="export-pdf-btn"
                className="btn btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded border border-frame bg-surface hover:bg-surface-2 cursor-pointer flex-none"
                onClick={handleExportPdf}
                title="Export or print as PDF (Ctrl+P)"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>

              {!activeNoteId && (
                <button
                  type="button"
                  id="save-as-note-btn"
                  className="btn btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded border border-frame bg-surface hover:bg-surface-2 cursor-pointer flex-none"
                  onClick={handleSaveAsPage}
                  disabled={isReadOnly}
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Save as page</span>
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton aria-label="More options" className="flex-none">
                    <MoreHorizontal className="w-4 h-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {activeNoteId && activeNote ? (
                    <>
                      {activeNode && activeNode.depth < 3 && (
                        <DropdownMenuItem
                          onClick={() => handleNewPage(activeNote.id)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>New sub-page</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handlePinToggle(activeNote.id, !activeNote.pinned)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        {activeNote.pinned ? (
                          <>
                            <PinOff className="w-4 h-4" />
                            <span>Unpin</span>
                          </>
                        ) : (
                          <>
                            <Pin className="w-4 h-4" />
                            <span>Pin</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleExportPdf}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Export as PDF</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleCopyToScratch}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <CopyPlus className="w-4 h-4" />
                        <span>Copy to Scratch</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-danger flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete page</span>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={handleClearScratch}
                      className="text-danger flex items-center gap-2 cursor-pointer"
                      disabled={isReadOnly}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear Scratch</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Conflict Line (06 / V3d) */}
            {staleConflictNote && (
              <div className="conflict-line">
                <GitCompare className="w-3.5 h-3.5 flex-none" />
                <span>
                  {staleConflictNote.prevBy || staleConflictNote.createdBy || "Someone"}{" "}
                  changed this page while you were typing.
                </span>
                <button type="button" onClick={handleSeeTheirs}>
                  See theirs
                </button>
                <span>·</span>
                <button type="button" onClick={handleKeepMine}>
                  Keep mine
                </button>
              </div>
            )}

            {/* Agent Line (06 / V3d) */}
            {activeNote && activeNote.prevBy && !staleConflictNote && (
              <div className="agent-line">
                <Bot className="w-3.5 h-3.5 text-ink-3 flex-none" />
                <span>
                  Edited by <b>{activeNote.prevBy}</b> ·{" "}
                  {formatRelativeDate(activeNote.prevAt || activeNote.updatedAt)} ·{" "}
                  <button
                    type="button"
                    onClick={() => setIsUndoConfirmOpen(true)}
                  >
                    Undo
                  </button>
                </span>
              </div>
            )}

            {/* Toolbar */}
            <CanvasToolbar
              editor={editor}
              userId={userId}
              disabled={isReadOnly}
              onUploadImage={activeNoteId ? handleNoteImageUpload : undefined}
            />

            {/* Prose Editor Content Area */}
            <div
              className="canvas-writing-surface flex-1 min-h-[550px] w-full max-w-[840px] mx-auto p-4 md:p-8 cursor-text focus:outline-none"
              onClick={(e) => {
                if (
                  e.target === e.currentTarget ||
                  (e.target as HTMLElement).classList.contains("canvas-writing-surface") ||
                  (e.target as HTMLElement).classList.contains("prose")
                ) {
                  editorRef.current?.commands.focus("end");
                }
              }}
            >
                            <div className="print-only-header">
                <h1>{activeNoteTitle || (activeNoteId ? "Untitled Note" : "Scratch Note")}</h1>
                <p>
                  Life Dashboard · {new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {loadingNoteId ? (
                <div className="w-full py-6 space-y-4 animate-fade-in select-none">
                  <div className="sk h-9 w-64 rounded-md mb-6" />
                  <div className="sk h-4 w-full rounded" />
                  <div className="sk h-4 w-11/12 rounded" />
                  <div className="sk h-4 w-4/5 rounded" />
                  <div className="sk h-4 w-full rounded mt-6" />
                  <div className="sk h-4 w-3/4 rounded" />
                  <div className="sk h-4 w-5/6 rounded" />
                </div>
              ) : (
                <div className="prose w-full cursor-text focus:outline-none">
                  <EditorContent
                    editor={editor}
                    className="min-h-[500px] cursor-text focus:outline-none"
                  />

                  {/* Sub-pages list (only for depth 1 or 2) */}
                {activeNote && activeNode && activeNode.depth < 3 && (
                  <div className="subpages">
                    <div className="lbl">Sub-pages</div>
                    {childPages.map((child) => {
                      const grandChildren = notes.filter(
                        (n) => n.parentId === child.id
                      );
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleSelectNote(child.id)}
                          className="w-full text-left cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{child.title}</span>
                          <span className="d">
                            {grandChildren.length > 0
                              ? `${grandChildren.length} ${
                                  grandChildren.length === 1
                                    ? "sub-page"
                                    : "sub-pages"
                                } · ${formatRelativeDate(child.updatedAt)}`
                              : formatRelativeDate(child.updatedAt)}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleNewPage(activeNote.id)}
                      className="add cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New sub-page</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </section>
        </div>
      </div>

      {/* Delete Page Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete page</DialogTitle>
            <DialogDescription>
              {activeNote && (() => {
                const subCount = notes.filter((n) => n.parentId === activeNote.id).length;
                if (subCount > 0) {
                  return `Delete “${activeNote.title}” and its ${subCount} ${
                    subCount === 1 ? "sub-page" : "sub-pages"
                  }? Their images are deleted too.`;
                }
                return `Delete “${activeNote.title}”? Its images are deleted too.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="px-4 py-2 text-xs font-semibold rounded border border-line hover:bg-surface-2 cursor-pointer"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-delete-note-btn"
              className="px-4 py-2 text-xs font-bold rounded bg-danger text-white hover:opacity-90 cursor-pointer"
              onClick={handleDeleteNoteConfirm}
            >
              Delete page
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Undo Agent Edit Confirmation Dialog */}
      <Dialog open={isUndoConfirmOpen} onOpenChange={setIsUndoConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Undo edit</DialogTitle>
            <DialogDescription>
              Undo {activeNote?.prevBy || "agent"}&apos;s edit? Changes you made after it are lost too.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 text-xs font-semibold rounded border border-line hover:bg-surface-2 cursor-pointer"
              onClick={() => setIsUndoConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-undo-agent-edit-btn"
              className="px-4 py-2 text-xs font-bold rounded bg-danger text-white hover:opacity-90 cursor-pointer"
              onClick={handleConfirmUndo}
            >
              Undo edit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
