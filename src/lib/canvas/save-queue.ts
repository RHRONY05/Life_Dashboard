export interface SavePayload {
  title: string;
  doc: Record<string, unknown> | null;
  bodyMd: string;
  parentId?: string | null;
  pinned?: boolean;
}

export type SaveStatusResult<T = unknown> =
  | { kind: "saved"; note: T }
  | { kind: "stale_conflict"; note: T }
  | { kind: "error"; error: unknown }
  | { kind: "skipped" };

export interface PageQueue {
  noteId: string;
  baseUpdatedAt: string;
  inFlight: boolean;
  dirty: boolean;
  pendingSave?: SavePayload;
  lastSavedTitle: string;
  lastSavedDocJson: string;
  lastSavedParentId?: string | null;
  lastSavedPinned?: boolean;
  lastSentBodyMd: string;
}

// In-memory plain object mapping noteId -> PageQueue (07 §8.9 rule 2: not React state)
const queues = new Map<string, PageQueue>();

export function getOrCreateQueue(
  noteId: string,
  initialNote?: {
    updatedAt: string;
    title: string;
    doc: Record<string, unknown> | null;
    bodyMd?: string;
    parentId?: string | null;
    pinned?: boolean;
  }
): PageQueue {
  let queue = queues.get(noteId);
  if (!queue) {
    queue = {
      noteId,
      baseUpdatedAt: initialNote?.updatedAt || "",
      inFlight: false,
      dirty: false,
      lastSavedTitle: initialNote?.title || "",
      lastSavedDocJson: initialNote?.doc ? JSON.stringify(initialNote.doc) : "",
      lastSavedParentId: initialNote?.parentId ?? null,
      lastSavedPinned: initialNote?.pinned ?? false,
      lastSentBodyMd: initialNote?.bodyMd || "",
    };
    queues.set(noteId, queue);
  } else if (initialNote?.updatedAt && !queue.inFlight && !queue.dirty) {
    // Sync baseUpdatedAt if idle
    queue.baseUpdatedAt = initialNote.updatedAt;
    if (initialNote.title !== undefined) queue.lastSavedTitle = initialNote.title;
    if (initialNote.doc !== undefined)
      queue.lastSavedDocJson = initialNote.doc ? JSON.stringify(initialNote.doc) : "";
    if (initialNote.parentId !== undefined)
      queue.lastSavedParentId = initialNote.parentId;
    if (initialNote.pinned !== undefined)
      queue.lastSavedPinned = initialNote.pinned;
    if (initialNote.bodyMd !== undefined)
      queue.lastSentBodyMd = initialNote.bodyMd;
  }
  return queue;
}

export function updateQueueBaseUpdatedAt(noteId: string, updatedAt: string): void {
  const q = queues.get(noteId);
  if (q) {
    q.baseUpdatedAt = updatedAt;
  }
}

export function clearQueue(noteId: string): void {
  queues.delete(noteId);
}

export async function enqueuePageSave<T = unknown>(
  noteId: string,
  payload: SavePayload,
  saveFn: (noteId: string, body: Record<string, unknown>) => Promise<Response>,
  onResult: (result: SaveStatusResult<T>) => void
): Promise<void> {
  const queue = getOrCreateQueue(noteId);

  const docJson = payload.doc ? JSON.stringify(payload.doc) : "";
  const title = payload.title.trim();
  const parentId = payload.parentId !== undefined ? payload.parentId : queue.lastSavedParentId;
  const pinned = payload.pinned !== undefined ? payload.pinned : queue.lastSavedPinned;

  // Rule 3: Skip PATCH when title, doc, parentId, and pinned equal the last saved ones
  if (
    !queue.dirty &&
    queue.lastSavedTitle === title &&
    queue.lastSavedDocJson === docJson &&
    queue.lastSavedParentId === parentId &&
    queue.lastSavedPinned === pinned
  ) {
    onResult({ kind: "skipped" });
    return;
  }

  // Rule 1: At most one PATCH in flight per page
  if (queue.inFlight) {
    queue.dirty = true;
    queue.pendingSave = {
      title,
      doc: payload.doc,
      bodyMd: payload.bodyMd,
      parentId,
      pinned,
    };
    return;
  }

  queue.inFlight = true;
  queue.dirty = false;
  queue.pendingSave = undefined;
  queue.lastSentBodyMd = payload.bodyMd;

  try {
    const res = await saveFn(noteId, {
      baseUpdatedAt: queue.baseUpdatedAt,
      title,
      doc: payload.doc,
      bodyMd: payload.bodyMd,
      parentId,
      pinned,
    });

    if (res.ok) {
      const updatedNote = await res.json();
      // Rule 2: baseUpdatedAt is always the updatedAt from the last successful response, set before anything re-renders
      queue.baseUpdatedAt = updatedNote.updatedAt;
      queue.lastSavedTitle = updatedNote.title;
      queue.lastSavedDocJson = updatedNote.doc ? JSON.stringify(updatedNote.doc) : "";
      queue.lastSavedParentId = updatedNote.parentId ?? null;
      queue.lastSavedPinned = updatedNote.pinned ?? false;
      queue.inFlight = false;

      onResult({ kind: "saved", note: updatedNote });

      // If changes occurred during save, trigger one more PATCH
      if (queue.dirty && queue.pendingSave) {
        const next = queue.pendingSave;
        queue.dirty = false;
        queue.pendingSave = undefined;
        enqueuePageSave(noteId, next, saveFn, onResult);
      }
    } else if (res.status === 409) {
      const errData = await res.json().catch(() => null);
      const conflictNote = errData?.details?.note;

      // Rule 6: A 409 stale whose note.bodyMd equals the last Markdown we sent is our own echo: take its updatedAt and continue silently
      if (
        conflictNote &&
        typeof conflictNote.bodyMd === "string" &&
        conflictNote.bodyMd === queue.lastSentBodyMd
      ) {
        queue.baseUpdatedAt = conflictNote.updatedAt;
        queue.lastSavedTitle = conflictNote.title;
        queue.lastSavedDocJson = conflictNote.doc ? JSON.stringify(conflictNote.doc) : "";
        queue.inFlight = false;

        if (queue.dirty && queue.pendingSave) {
          const next = queue.pendingSave;
          queue.dirty = false;
          queue.pendingSave = undefined;
          enqueuePageSave(noteId, next, saveFn, onResult);
        } else {
          onResult({ kind: "saved", note: conflictNote });
        }
      } else {
        // Genuine conflict
        queue.inFlight = false;
        queue.dirty = false;
        queue.pendingSave = undefined;
        onResult({ kind: "stale_conflict", note: conflictNote });
      }
    } else {
      queue.inFlight = false;
      onResult({ kind: "error", error: new Error(`Save failed with status ${res.status}`) });
    }
  } catch (err) {
    queue.inFlight = false;
    onResult({ kind: "error", error: err });
  }
}
