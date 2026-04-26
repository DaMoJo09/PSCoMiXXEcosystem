import { toast } from "sonner";

// Per-media-type caps. Images sit at modern iPhone photo size; video/audio
// get more headroom because asset-library use cases include short clips and
// voiceovers that legitimately run larger.
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024; // 20MB

export type ImageValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

function isHeicFile(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function isSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|CriOS|Android/.test(ua);
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

/**
 * Validates an uploaded image file. Optionally shows a toast with a
 * student-friendly explanation when invalid. When `allowVideo` / `allowAudio`
 * are set, those media types get their own larger size limits — the 12MB
 * image cap only applies to images.
 */
export function validateImageFile(
  file: File,
  opts: { showToast?: boolean; allowVideo?: boolean; allowAudio?: boolean } = {}
): ImageValidationResult {
  const { showToast = true, allowVideo = false, allowAudio = false } = opts;
  const heic = isHeicFile(file);
  const isImage = file.type.startsWith("image/") || heic;
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");

  const acceptable =
    isImage || (allowVideo && isVideo) || (allowAudio && isAudio);
  if (!acceptable) {
    const reason = "Please select an image file (PNG, JPG, WebP, or HEIC)";
    if (showToast) toast.error(reason);
    return { ok: false, reason };
  }

  let cap = MAX_IMAGE_BYTES;
  let kind = "Image";
  if (isVideo) { cap = MAX_VIDEO_BYTES; kind = "Video"; }
  else if (isAudio) { cap = MAX_AUDIO_BYTES; kind = "Audio"; }

  if (file.size > cap) {
    const reason = `${kind} is too large (max ${formatMb(cap)}). Try resizing or trimming it first.`;
    if (showToast) toast.error(reason);
    return { ok: false, reason };
  }

  if (heic && !isSafariBrowser()) {
    const reason =
      "HEIC photos don't display in this browser. Open the photo in your iPhone's Photos app, share/export it as JPEG, then upload that.";
    if (showToast) toast.error(reason, { duration: 8000 });
    return { ok: false, reason };
  }

  return { ok: true };
}
