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

export async function loadScratch(userId: string): Promise<ScratchRecord | null> {
  if (!isIndexedDBAvailable()) return null;
  const db = await getScratchDB(userId);
  const data = await db.get("scratch", "main");
  return data || null;
}

export async function saveScratch(userId: string, doc: CanvasDocNode | unknown): Promise<ScratchRecord> {
  const record: ScratchRecord = {
    doc,
    updatedAt: new Date().toISOString(),
  };

  if (!isIndexedDBAvailable()) return record;
  const db = await getScratchDB(userId);
  await db.put("scratch", record, "main");
  return record;
}

export async function clearScratch(userId: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  const db = await getScratchDB(userId);
  const emptyDoc = {
    type: "doc",
    content: [{ type: "paragraph" }],
  };
  await db.put("scratch", { doc: emptyDoc, updatedAt: new Date().toISOString() }, "main");
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
