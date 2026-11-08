import { openDB, type IDBPDatabase } from "idb";
import { imageRefs, type CanvasDocNode } from "@/lib/domain/canvas";
import { SCRATCH_MAX_IMAGES, SCRATCH_MAX_BYTES } from "@/lib/canvas/images";

export interface ScratchRecord {
  doc: CanvasDocNode | unknown;
  updatedAt: string;
}

export interface ImageRecord {
  blob: Blob;
  type: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface StorageStats {
  count: number;
  totalBytes: number;
}

let dbInstance: IDBPDatabase | null = null;
let currentDbName = "";

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== "undefined" && "indexedDB" in window && indexedDB !== null;
  } catch {
    return false;
  }
}

export async function getScratchDB(userId: string): Promise<IDBPDatabase> {
  const dbName = `life-canvas-${userId}`;
  if (dbInstance && currentDbName === dbName) {
    return dbInstance;
  }

  currentDbName = dbName;
  dbInstance = await openDB(dbName, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("scratch")) {
        db.createObjectStore("scratch");
      }
      if (!db.objectStoreNames.contains("images")) {
        db.createObjectStore("images");
      }
    },
  });

  return dbInstance;
}

function getLocalStorageKey(userId: string): string {
  return userId ? `life-scratch-backup-${userId}` : "life-scratch-backup-default";
}

function saveToLocalStorageBackup(userId: string, record: ScratchRecord): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const serialized = JSON.stringify(record);
    if (serialized.length < 2 * 1024 * 1024) {
      window.localStorage.setItem(getLocalStorageKey(userId), serialized);
      window.localStorage.setItem("life-scratch-backup-latest", serialized);
    }
  } catch {
    // ignore quota or private browsing errors
  }
}

function loadFromLocalStorageBackup(userId: string): ScratchRecord | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw =
      window.localStorage.getItem(getLocalStorageKey(userId)) ||
      window.localStorage.getItem("life-scratch-backup-latest");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isDocEmpty(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return true;
  const d = doc as { content?: Array<{ type?: string; text?: string; content?: unknown[] }> };
  if (!d.content || !Array.isArray(d.content) || d.content.length === 0) return true;
  if (d.content.length === 1) {
    const first = d.content[0];
    if (first.type === "paragraph" && (!first.content || first.content.length === 0) && !first.text) {
      return true;
    }
  }
  return false;
}

export async function loadScratch(userId: string): Promise<ScratchRecord | null> {
  let idbData: ScratchRecord | null = null;
  if (isIndexedDBAvailable()) {
    try {
      const db = await getScratchDB(userId);
      idbData = (await db.get("scratch", "main")) || null;
    } catch (err) {
      console.warn("IndexedDB load failed, falling back to localStorage", err);
    }
  }

  const localBackup = loadFromLocalStorageBackup(userId);

  if (idbData && localBackup) {
    const isIdbEmpty = isDocEmpty(idbData.doc);
    const isLocalEmpty = isDocEmpty(localBackup.doc);

    // If IDB was wiped with an empty doc but localStorage has real content, recover from localStorage!
    if (isIdbEmpty && !isLocalEmpty) {
      return localBackup;
    }
    if (!isIdbEmpty && isLocalEmpty) {
      return idbData;
    }

    const idbTime = new Date(idbData.updatedAt || 0).getTime();
    const localTime = new Date(localBackup.updatedAt || 0).getTime();
    return localTime > idbTime ? localBackup : idbData;
  }

  return idbData || localBackup || null;
}

export async function saveScratch(userId: string, doc: CanvasDocNode | unknown): Promise<ScratchRecord> {
  const record: ScratchRecord = {
    doc,
    updatedAt: new Date().toISOString(),
  };

  // Synchronously mirror to localStorage as immediate fail-safe
  saveToLocalStorageBackup(userId, record);

  if (!isIndexedDBAvailable()) return record;
  try {
    const db = await getScratchDB(userId);
    await db.put("scratch", record, "main");
  } catch (err) {
    console.warn("IndexedDB save failed, backed up in localStorage", err);
  }
  return record;
}

export async function clearScratch(userId: string): Promise<void> {
  const emptyDoc = {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
  const record: ScratchRecord = {
    doc: emptyDoc,
    updatedAt: new Date().toISOString(),
  };

  saveToLocalStorageBackup(userId, record);

  if (!isIndexedDBAvailable()) return;
  try {
    const db = await getScratchDB(userId);
    await db.put("scratch", record, "main");
  } catch {}
}

export async function saveImageToIdb(
  userId: string,
  id: string,
  data: { blob: Blob; type: string; width: number; height: number }
): Promise<string> {
  if (!isIndexedDBAvailable()) return `idb:${id}`;
  const db = await getScratchDB(userId);

  // Check limits
  const stats = await getStorageStats(userId);
  if (stats.count >= SCRATCH_MAX_IMAGES || stats.totalBytes + data.blob.size > SCRATCH_MAX_BYTES) {
    throw new Error("Scratch is full. Save it as a note or clear it.");
  }

  const record: ImageRecord = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  await db.put("images", record, id);

  const url = URL.createObjectURL(data.blob);
  objectUrlCache.set(id, url);
  blobToDataUrl(data.blob).then((dataUrl) => {
    dataUrlCache.set(id, dataUrl);
  });

  return `idb:${id}`;
}

export async function getImageFromIdb(
  userId: string,
  id: string
): Promise<ImageRecord | null> {
  if (!isIndexedDBAvailable()) return null;
  const db = await getScratchDB(userId);
  return (await db.get("images", id)) || null;
}

export async function getStorageStats(userId: string): Promise<StorageStats> {
  if (!isIndexedDBAvailable()) return { count: 0, totalBytes: 0 };
  const db = await getScratchDB(userId);
  const keys = await db.getAllKeys("images");
  let totalBytes = 0;
  for (const key of keys) {
    const item = await db.get("images", key);
    if (item?.blob) {
      totalBytes += item.blob.size;
    }
  }
  return {
    count: keys.length,
    totalBytes,
  };
}

export async function deleteUnreferencedImages(userId: string, doc: CanvasDocNode | unknown): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  const db = await getScratchDB(userId);
  const refs = imageRefs(doc);
  const referencedIdbIds = new Set(
    refs
      .filter((r) => r.startsWith("idb:"))
      .map((r) => r.replace(/^idb:/, ""))
  );

  const keys = await db.getAllKeys("images");
  for (const key of keys) {
    const id = String(key);
    if (!referencedIdbIds.has(id)) {
      await db.delete("images", key);
    }
  }
}

// Object URL and Data URL cache to resolve `idb:<uuid>` in the DOM and clipboard
const objectUrlCache = new Map<string, string>();
const dataUrlCache = new Map<string, string>();

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.readAsDataURL(blob);
  });
}

export function getIdbCachedUrl(ref: string): string | undefined {
  if (!ref.startsWith("idb:")) return undefined;
  const id = ref.replace(/^idb:/, "");
  return dataUrlCache.get(id) || objectUrlCache.get(id);
}

export async function resolveIdbRef(userId: string, ref: string): Promise<string> {
  if (!ref.startsWith("idb:")) return ref;
  const id = ref.replace(/^idb:/, "");

  if (objectUrlCache.has(id)) {
    return objectUrlCache.get(id)!;
  }

  const record = await getImageFromIdb(userId, id);
  if (!record || !record.blob) {
    return "";
  }

  const url = URL.createObjectURL(record.blob);
  objectUrlCache.set(id, url);
  if (!dataUrlCache.has(id)) {
    blobToDataUrl(record.blob).then((dataUrl) => {
      dataUrlCache.set(id, dataUrl);
    });
  }
  return url;
}

export function revokeObjectUrls(): void {
  for (const url of objectUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();
}
