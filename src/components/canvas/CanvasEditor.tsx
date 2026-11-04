"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import clsx from "clsx";
import {
  Copy,
  MoreHorizontal,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookmarkPlus,
  CopyPlus,
} from "lucide-react";
import { toast } from "sonner";
import { getCanvasExtensions } from "@/lib/canvas/editor";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { NotesPane } from "@/components/canvas/NotesPane";
import { docToMarkdown, docToPlainText } from "@/lib/canvas/markdown";
import { enqueuePageSave, getOrCreateQueue } from "@/lib/canvas/save-queue";
import { analyzePaste } from "@/lib/canvas/paste";
import { processImageFile } from "@/lib/canvas/images";
import { imageRefs, titleFromText } from "@/lib/domain/canvas";
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

export function CanvasEditor({ userId }: CanvasEditorProps) {
  // Navigation & View state
  const [mobileTab, setMobileTab] = useState<"scratch" | "notes">("scratch");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<NoteDto | null>(null);
  const [activeNoteTitle, setActiveNoteTitle] = useState<string>("");

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
  const [imageCount, setImageCount] = useState<number>(0);
  const [isIdbSupported] = useState<boolean>(() => isIndexedDBAvailable());

  // References
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const activeNoteRef = useRef<NoteDto | null>(null);
  const activeNoteTitleRef = useRef<string>(activeNoteTitle);
  const activeNoteIdRef = useRef<string | null>(activeNoteId);
  const shiftDownRef = useRef<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftDownRef.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftDownRef.current = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    activeNoteRef.current = activeNote;
    activeNoteTitleRef.current = activeNoteTitle;
    activeNoteIdRef.current = activeNoteId;
  }, [activeNote, activeNoteTitle, activeNoteId]);

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
          setNotes(data.notes);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

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
              setActiveNote(updated);
              setActiveNoteTitle(updated.title);
              setStaleConflictNote(null);
              setNoteSaveStatus("saved");

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
              setStaleConflictNote(result.note);
              setNoteSaveStatus("error");
            } else if (result.kind === "skipped") {
              setNoteSaveStatus("saved");
            } else if (result.kind === "error") {
              setNoteSaveStatus("error");
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
    const currentId = activeNoteIdRef.current;
    const currentNote = activeNoteRef.current;
    const currentTitle = activeNoteTitleRef.current;
    if (!currentId || !currentNote || !editorRef.current) return;

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
      if (!currentId) throw new Error("No active note");

      const processed = await processImageFile(file);
      const formData = new FormData();
      formData.append("file", processed.blob, file.name);

      const res = await fetch(`/api/notes/${currentId}/images`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to upload note image.");
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
      },
      clipboardTextSerializer: (slice) => {
        return docToPlainText(slice);
      },
      handlePaste: (view, event) => {
        if (isReadOnly) return true;
        if (shiftDownRef.current) return false; // Ctrl+Shift+V plain text paste
        const analysis = analyzePaste(event);

        if (analysis.kind === "images") {
          event.preventDefault();
          const files = analysis.data as File[];
          (async () => {
            for (const file of files) {
              try {
                if (activeNoteIdRef.current) {
                  // In a Note: upload directly
                  const res = await handleNoteImageUpload(file);
                  editorRef.current
                    ?.chain()
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
                  // In Scratch: store in IndexedDB
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
                        alt: file.name,
                        width: processed.width,
                        height: processed.height,
                      },
                    })
                    .run();
                }
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Failed to paste image.";
                toast.error(msg);
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
        // Active Note: 800ms debounce save
        setNoteSaveStatus("saving");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          triggerNoteSave();
        }, 800);
      } else {
        // Scratch: 500ms debounce save to IndexedDB
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

  // Initial load: Load Scratch from IndexedDB on mount
  useEffect(() => {
    if (!editor || activeNoteIdRef.current) return;

    let active = true;
    loadScratch(userId)
      .then((saved) => {
        if (!active) return;
        if (saved && saved.doc) {
          editor.commands.setContent(saved.doc);
          setImageCount(imageRefs(saved.doc).length);
        } else {
          editor.commands.setContent({
            type: "doc",
            content: [{ type: "paragraph" }],
          });
        }
      })
      .catch(() => {
        if (!active) return;
        editor.commands.setContent({
          type: "doc",
          content: [{ type: "paragraph" }],
        });
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
    };
  }, [editor, isReadOnly, userId, noteSaveStatus, triggerNoteSave]);

  // Select Scratch
  const handleSelectScratch = useCallback(async () => {
    if (activeNoteIdRef.current && editorRef.current) {
      triggerNoteSave();
    }

    setActiveNoteId(null);
    setActiveNote(null);
    setActiveNoteTitle("");
    setStaleConflictNote(null);
    setMobileTab("scratch");

    if (editorRef.current) {
      const saved = await loadScratch(userId);
      if (saved && saved.doc) {
        editorRef.current.commands.setContent(saved.doc);
        setImageCount(imageRefs(saved.doc).length);
      } else {
        editorRef.current.commands.setContent({
          type: "doc",
          content: [{ type: "paragraph" }],
        });
        setImageCount(0);
      }
    }
  }, [userId, triggerNoteSave]);

  // Select Note
  const handleSelectNote = useCallback(
    async (noteId: string) => {
      if (!activeNoteIdRef.current && editorRef.current) {
        try {
          await saveScratch(userId, editorRef.current.getJSON());
        } catch {}
      } else if (activeNoteIdRef.current && editorRef.current) {
        triggerNoteSave();
      }

      try {
        const res = await fetch(`/api/notes/${noteId}`);
        if (!res.ok) {
          toast.error("Could not load note.");
          return;
        }

        const noteData: NoteDto = await res.json();
        getOrCreateQueue(noteData.id, noteData);
        setActiveNoteId(noteData.id);
        setActiveNote(noteData);
        setActiveNoteTitle(noteData.title);
        setStaleConflictNote(null);
        setNoteSaveStatus("saved");
        setMobileTab("scratch"); // switch view to editor on mobile

        if (editorRef.current) {
          if (noteData.doc) {
            editorRef.current.commands.setContent(noteData.doc, { emitUpdate: false });
            setImageCount(imageRefs(noteData.doc).length);
          } else {
            // Agent-created note without doc: initialize from markdown
            editorRef.current.commands.setContent(noteData.bodyMd || "", {
              contentType: "markdown",
              emitUpdate: false,
            });
            setImageCount(0);
          }
        }
      } catch {
        toast.error("Could not load note.");
      }
    },
    [userId, triggerNoteSave]
  );

  // Copy as Markdown
  const handleCopyAsMarkdown = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON();
    const md = docToMarkdown(json);
    navigator.clipboard.writeText(md).then(() => {
      const lineCount = md.split("\n").filter((l) => l.trim().length > 0).length;
      toast(`Copied as Markdown · ${lineCount} lines`);
    });
  }, [editor]);

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

  // Save as note (from Scratch, 07 §8.7)
  const handleSaveAsNote = useCallback(async () => {
    if (!editor) return;
    if (notes.length >= 300) {
      toast.error("300 notes is the maximum. Delete old ones first.");
      return;
    }

    const json = editor.getJSON();
    const md = docToMarkdown(json);
    const title = titleFromText(md, new Date());

    try {
      // 1. Create note row
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
        toast.error(err.message || "Failed to save note.");
        return;
      }

      const createdNote: NoteDto = await createRes.json();

      // 2. Upload any local idb: images to the note's storage
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
            formData.append("file", stored.blob, `image-${imgId}.${stored.type.split("/")[1] || "webp"}`);
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

        // Swap refs in updatedDoc
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

        // 3. Update the note with swapped image refs
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

      // 4. Refresh notes list
      await fetchNotes();

      if (uploadFailures > 0) {
        toast(`Saved, but ${uploadFailures} image couldn't be uploaded.`);
      }

      // 5. Toast with Open and Clear Scratch actions
      toast(`Saved as “${title}”`, {
        action: {
          label: "Open",
          onClick: () => {
            handleSelectNote(createdNote.id);
          },
        },
      });
    } catch {
      toast.error("Failed to save note.");
    }
  }, [editor, notes.length, userId, fetchNotes, handleSelectNote]);

  // Copy to Scratch (from Note)
  const handleCopyToScratch = useCallback(async () => {
    if (!editor) return;
    const currentJson = editor.getJSON();
    const scratchSaved = await loadScratch(userId);
    const scratchDoc: { type: string; content?: unknown[] } =
      (scratchSaved?.doc as { type: string; content?: unknown[] }) || {
        type: "doc",
        content: [{ type: "paragraph" }],
      };

    // Append note contents to scratch doc
    if (Array.isArray(currentJson.content)) {
      scratchDoc.content = [
        ...(scratchDoc.content || []),
        ...JSON.parse(JSON.stringify(currentJson.content)),
      ];
    }

    await saveScratch(userId, scratchDoc);
    toast("Copied to Scratch");
  }, [editor, userId]);

  // Delete note
  const handleDeleteNoteConfirm = useCallback(async () => {
    if (!activeNote) return;

    try {
      const res = await fetch(`/api/notes/${activeNote.id}`, {
        method: "DELETE",
      });

      if (res.ok || res.status === 204) {
        toast("Note deleted");
        setIsDeleteDialogOpen(false);
        handleSelectScratch();
        fetchNotes();
      } else {
        toast.error("Could not delete note.");
      }
    } catch {
      toast.error("Could not delete note.");
    }
  }, [activeNote, handleSelectScratch, fetchNotes]);

  // Global keyboard shortcuts: Ctrl+Alt+M (Copy Markdown), Ctrl+Shift+C (Copy Selection Markdown), & Ctrl+S (Save as note / save now)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        handleCopyAsMarkdown();
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "c" || e.key === "C")) {
        if (editorRef.current && !editorRef.current.state.selection.empty) {
          e.preventDefault();
          const slice = editorRef.current.state.selection.content();
          const md = docToMarkdown(
            { type: "doc", content: slice.toJSON()?.content || [] },
            { images: "placeholder" }
          ).trim();
          if (md) {
            navigator.clipboard.writeText(md);
            toast("Copied as Markdown");
          }
        }
      }

      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (activeNoteIdRef.current) {
          triggerNoteSave();
        } else {
          handleSaveAsNote();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCopyAsMarkdown, handleSaveAsNote, triggerNoteSave]);

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
            Browser storage is full. Save Scratch as a note or clear it.
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

      {/* 409 Stale Conflict Banner */}
      {staleConflictNote && (
        <Banner variant="warn" className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 stroke-[2] flex-none" />
            <span>This note changed somewhere else.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2.5 py-1 text-xs font-bold bg-surface border border-line rounded hover:bg-surface-2 cursor-pointer"
              onClick={() => {
                if (editor) {
                  if (staleConflictNote.doc) {
                    editor.commands.setContent(staleConflictNote.doc);
                  } else {
                    editor.commands.setContent(staleConflictNote.bodyMd || "");
                  }
                }
                setActiveNote(staleConflictNote);
                setActiveNoteTitle(staleConflictNote.title);
                setStaleConflictNote(null);
                setNoteSaveStatus("saved");
              }}
            >
              Load latest
            </button>
            <button
              type="button"
              className="px-2.5 py-1 text-xs font-bold bg-accent text-accent-ink rounded hover:bg-accent-hover cursor-pointer"
              onClick={() => {
                // Re-send with the server's updatedAt as baseUpdatedAt
                if (editor) {
                  performNoteSave(
                    activeNote!.id,
                    staleConflictNote,
                    editor.getJSON(),
                    activeNoteTitle
                  );
                }
              }}
            >
              Keep mine
            </button>
          </div>
        </Banner>
      )}

      {/* Mobile Top Controls (< 768px) */}
      <div className="md:hidden flex flex-col gap-2 mb-3">
        <div className="flex items-center justify-between gap-2">
          {activeNoteId ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <IconButton
                aria-label="Back to Notes"
                onClick={handleSelectScratch}
              >
                <ArrowLeft className="w-4 h-4" />
              </IconButton>
              <input
                type="text"
                value={activeNoteTitle}
                onChange={(e) => setActiveNoteTitle(e.target.value)}
                onBlur={() => {
                  if (!activeNoteTitle.trim() && activeNote) {
                    setActiveNoteTitle(activeNote.title);
                  } else {
                    triggerNoteSave();
                  }
                }}
                className="ntitle text-sm font-bold bg-transparent border-b border-transparent focus:border-frame focus:outline-none flex-1 truncate"
                placeholder="Untitled note"
              />
            </div>
          ) : (
            /* Mobile Segmented Control (Scratch / Notes) */
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
                Notes <span className="c text-ink-3">{notes.length}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 flex-none">
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
                {activeNoteId ? (
                  <>
                    <DropdownMenuItem
                      onClick={handleCopyToScratch}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <CopyPlus className="w-4 h-4" />
                      <span>Copy to Scratch</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-danger flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete note</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={handleSaveAsNote}
                      className="flex items-center gap-2 cursor-pointer"
                      disabled={isReadOnly}
                    >
                      <BookmarkPlus className="w-4 h-4" />
                      <span>Save as note</span>
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
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />
        </div>

        {/* Editor Card (Desktop: Always visible / Mobile: Visible when 'scratch' tab is active or editing note) */}
        <div
          className={clsx(
            "md:block min-w-0",
            mobileTab === "scratch" || activeNoteId ? "block" : "hidden"
          )}
        >
          <section
            className="ecard bg-surface border border-frame rounded-lg shadow-md flex flex-col overflow-hidden"
            aria-label={activeNoteId ? "Note editor" : "Scratch"}
          >
            {/* Desktop Ecard Head (>= 768px) */}
            <div className="ecard-head hidden md:flex items-center gap-3 px-5 py-3 border-b border-frame select-none">
              {activeNoteId ? (
                <input
                  type="text"
                  value={activeNoteTitle}
                  onChange={(e) => setActiveNoteTitle(e.target.value)}
                  onBlur={() => {
                    if (!activeNoteTitle.trim() && activeNote) {
                      setActiveNoteTitle(activeNote.title);
                    } else {
                      triggerNoteSave();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  className="ntitle text-base font-bold bg-transparent border border-transparent hover:border-line-strong rounded px-2 py-0.5 focus:border-frame focus:outline-none"
                  placeholder="Untitled note"
                />
              ) : (
                <h2 className="font-display font-extrabold text-sm uppercase tracking-tight">
                  Scratch
                </h2>
              )}

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

              <span className="spacer flex-1" />

              {/* Action Buttons */}
              <button
                type="button"
                id="copy-markdown-btn"
                className="btn btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded shadow-[2px_2px_0_var(--signal)] bg-accent text-accent-ink hover:bg-accent-hover cursor-pointer"
                onClick={handleCopyAsMarkdown}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy as Markdown</span>
              </button>

              {!activeNoteId && (
                <button
                  type="button"
                  id="save-as-note-btn"
                  className="btn btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded border border-frame bg-surface hover:bg-surface-2 cursor-pointer"
                  onClick={handleSaveAsNote}
                  disabled={isReadOnly}
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save as note</span>
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton aria-label="More options">
                    <MoreHorizontal className="w-4 h-4" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {activeNoteId ? (
                    <>
                      <DropdownMenuItem
                        onClick={handleCopyToScratch}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <CopyPlus className="w-4 h-4" />
                        <span>Copy to Scratch</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-danger flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete note</span>
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
              <div className="prose w-full cursor-text focus:outline-none">
                <EditorContent editor={editor} className="min-h-[500px] cursor-text focus:outline-none" />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Delete Note Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete note</DialogTitle>
            <DialogDescription>
              Delete &ldquo;{activeNote?.title}&rdquo;? Its images are deleted
              too.
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
              Delete note
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
