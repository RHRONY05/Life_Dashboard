import { fitWithin } from "@/lib/domain/canvas";

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export const MAX_IMAGE_BYTES = 1048576; // 1 MB
export const SCRATCH_MAX_IMAGES = 40;
export const SCRATCH_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const NOTE_MAX_IMAGES = 30;

export interface ProcessedImage {
  blob: Blob;
  type: string;
  width: number;
  height: number;
}

export async function processImageFile(file: File | Blob): Promise<ProcessedImage> {
  const mimeType = file.type.toLowerCase();
  if (!ACCEPTED_IMAGE_TYPES.includes(mimeType)) {
    throw new Error("Only images can be pasted here.");
  }

  // GIF images are kept as-is to preserve animation
  if (mimeType === "image/gif") {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("That image is too big, even after shrinking (max 1 MB).");
    }

    const { width, height } = await getImageDimensions(file);
    return {
      blob: file,
      type: "image/gif",
      width,
      height,
    };
  }

  // Non-GIF: scale down and convert to WebP
  let bitmap: ImageBitmap;
  if (typeof createImageBitmap === "function") {
    bitmap = await createImageBitmap(file);
  } else {
    // Fallback for environments without createImageBitmap
    const img = await loadImageElement(file);
    const { w, h } = fitWithin(img.naturalWidth, img.naturalHeight, 1600);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");
    ctx.drawImage(img, 0, 0, w, h);
    return compressCanvas(canvas, w, h);
  }

  const { w, h } = fitWithin(bitmap.width, bitmap.height, 1600);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Could not process image.");
  }

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return compressCanvas(canvas, w, h);
}

async function compressCanvas(
  canvas: HTMLCanvasElement,
  w: number,
  h: number
): Promise<ProcessedImage> {
  // Try 0.82 quality first
  let blob = await canvasToBlob(canvas, "image/webp", 0.82);

  // If over 1 MB, try 0.60
  if (blob && blob.size > MAX_IMAGE_BYTES) {
    blob = await canvasToBlob(canvas, "image/webp", 0.60);
  }

  if (!blob || blob.size > MAX_IMAGE_BYTES) {
    throw new Error("That image is too big, even after shrinking (max 1 MB).");
  }

  return {
    blob,
    type: "image/webp",
    width: w,
    height: h,
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image."));
    };
    img.src = url;
  });
}

function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image."));
    };
    img.src = url;
  });
}
