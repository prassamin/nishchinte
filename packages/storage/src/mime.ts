import type { AllowedStorageType } from "./types";

/**
 * Map of standard file extensions to their corresponding MIME types.
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  ico: "image/x-icon",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",

  // Videos
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",

  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",

  // Documents & Data
  pdf: "application/pdf",
  json: "application/json",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  ts: "application/typescript",
  tsx: "application/typescript",
  zip: "application/zip",
  tar: "application/x-tar",
  gz: "application/gzip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Fonts
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
};

/**
 * Resolves the MIME content type for a given filename or path.
 *
 * @param filenameOrPath - The filename or path containing a file extension.
 * @param fallback - Fallback MIME type when extension is unrecognized.
 * @returns Standard MIME type string.
 */
export function getMimeType(
  filenameOrPath: string,
  fallback: string = "application/octet-stream"
): string {
  if (!filenameOrPath) return fallback;
  const ext = filenameOrPath.split(".").pop()?.toLowerCase() || "";
  return MIME_TYPE_MAP[ext] || fallback;
}

const DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "md",
  "json",
  "xml",
  "rtf",
  "odt",
  "ods",
  "odp",
]);

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/xml",
  "application/rtf",
]);

/**
 * Checks whether a file's MIME type or filename matches an allowed type rule.
 *
 * Supports:
 * - Category shorthand: `"image"`, `"video"`, `"audio"`, `"text"`, `"font"`, `"document"`, `"application"`
 * - Wildcard category: `"image/*"`, `"video/*"`, `"audio/*"`, `"*"`
 * - Exact MIME type: `"image/jpeg"`, `"application/pdf"`
 * - File extension: `"png"`, `".png"`, `"jpg"`, `"pdf"`
 *
 * @param mimeType - File MIME type string (e.g. `"image/png"`).
 * @param filename - File name or path (e.g. `"product-1.png"`).
 * @param allowed - Allowed type rule or array of rules.
 * @returns `true` if the item satisfies any of the allowed rules, or `true` if no filter is provided.
 */
export function matchesAllowedType(
  mimeType: string,
  filename: string,
  allowed?: AllowedStorageType | AllowedStorageType[]
): boolean {
  if (!allowed) return true;
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];
  if (allowedList.length === 0) return true;

  const normalizedMime = (mimeType || "").toLowerCase().trim();
  const [topLevel] = normalizedMime.split("/");
  const ext = (filename.split(".").pop() || "").toLowerCase().trim();

  return allowedList.some((rule) => {
    if (!rule) return false;
    const r = rule.trim().toLowerCase().replace(/^\./, "");

    // Wildcards
    if (r === "*" || r === "*/*") return true;

    // Document alias
    if (r === "document" || r === "doc" || r === "documents") {
      return (
        DOCUMENT_EXTENSIONS.has(ext) ||
        DOCUMENT_MIME_TYPES.has(normalizedMime)
      );
    }

    // Top-level category shorthand (e.g. "image", "video", "audio", "font", "text", "application")
    if (r === topLevel) return true;

    // Wildcard category (e.g. "image/*", "video/*")
    if (r === `${topLevel}/*`) return true;

    // Exact MIME match (e.g. "image/jpeg")
    if (r === normalizedMime) return true;

    // Extension match (e.g. "png", "jpg", "pdf")
    if (r === ext) return true;

    return false;
  });
}
