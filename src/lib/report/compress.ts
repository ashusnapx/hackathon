"use client";

/**
 * Get a screenshot under the portal's ceiling before it is ever rejected for
 * being over it.
 *
 * A modern phone photographs a bank SMS at eight to twelve megabytes. The live
 * portal accepts ten per piece of evidence and five for the identity document,
 * and tells you only after the upload has failed — by which point the session
 * may also have expired. Nothing about that is the citizen's problem to solve,
 * so we solve it: downscale to a size where the text in a screenshot is still
 * legible, re-encode, and report honestly what was done to the file.
 *
 * The four-megabyte target sits under both limits and, more to the point, is
 * the difference between an upload that completes on a rural connection and one
 * that does not.
 *
 * Deliberately not applied to PDFs — re-encoding a document the police will
 * read is a worse outcome than a large upload.
 */

const MAX_EDGE = 2000;
const TARGET_BYTES = 4 * 1024 * 1024;
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45];

export interface CompressResult {
  file: File;
  originalBytes: number;
  bytes: number;
  /** False when the file was left exactly as it was. */
  changed: boolean;
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function compressImage(file: File): Promise<CompressResult> {
  const originalBytes = file.size;
  const untouched: CompressResult = { file, originalBytes, bytes: originalBytes, changed: false };

  if (!file.type.startsWith("image/") || file.size <= TARGET_BYTES) return untouched;

  try {
    const bitmap = await loadBitmap(file);
    const w = "width" in bitmap ? bitmap.width : 0;
    const h = "height" in bitmap ? bitmap.height : 0;
    if (!w || !h) return untouched;

    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return untouched;
    // White beneath, so a transparent PNG screenshot does not become black text
    // on black once it is flattened into JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    if ("close" in bitmap) bitmap.close();

    for (const q of QUALITY_STEPS) {
      const blob = await toBlob(canvas, q);
      if (!blob) break;
      if (blob.size <= TARGET_BYTES || q === QUALITY_STEPS[QUALITY_STEPS.length - 1]) {
        if (blob.size >= originalBytes) return untouched;
        const renamed = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        return {
          file: new File([blob], renamed, { type: "image/jpeg", lastModified: file.lastModified }),
          originalBytes,
          bytes: blob.size,
          changed: true,
        };
      }
    }
    return untouched;
  } catch {
    // A file we cannot decode is still a file the citizen may need to send.
    return untouched;
  }
}

export const formatBytes = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
