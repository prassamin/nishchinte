import { getMimeType } from "./mime";
import type { StorageFileInput, UploadOptions } from "./types";

/**
 * Cleans and normalizes a storage key or folder path.
 *
 * Strips leading/trailing slashes, redundant slashes, and initial "uploads/" prefix if present.
 */
export function cleanPath(input: string): string {
  if (!input) return "";
  return input
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/^uploads\/?/g, "")
    .replace(/\/+/g, "/");
}

/**
 * Joins multiple path segments into a clean relative storage key.
 */
export function joinStoragePath(...parts: string[]): string {
  return parts
    .map((p) => cleanPath(p))
    .filter(Boolean)
    .join("/");
}

/**
 * Sanitizes a filename to prevent directory traversal and invalid characters.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return "upload";
  return filename
    .replace(/\\/g, "/")
    .split("/")
    .pop()!
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

/**
 * Converts a Node.js or Web ReadableStream into a Buffer.
 */
export async function streamToBuffer(
  stream: NodeJS.ReadableStream | ReadableStream
): Promise<Buffer> {
  if ("getReader" in stream && typeof stream.getReader === "function") {
    // Web ReadableStream
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  // Node.js ReadableStream
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<any>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Normalizes any supported file input into a standardized Buffer with metadata.
 */
export async function normalizeFileInput(
  file: StorageFileInput,
  options: UploadOptions = {}
): Promise<{
  buffer: Buffer;
  filename: string;
  mimeType: string;
  relativeKey: string;
}> {
  let buffer: Buffer;
  let extractedName = options.filename;
  let extractedMime = options.mimeType;

  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else if (file instanceof Uint8Array) {
    buffer = Buffer.from(file.buffer, file.byteOffset, file.byteLength);
  } else if (file instanceof ArrayBuffer) {
    buffer = Buffer.from(file);
  } else if (
    typeof file === "object" &&
    file !== null &&
    "arrayBuffer" in file &&
    typeof (file as Blob).arrayBuffer === "function"
  ) {
    // Blob or Web File
    buffer = Buffer.from(await (file as Blob).arrayBuffer());
    if (!extractedName && "name" in file && typeof (file as any).name === "string") {
      extractedName = (file as any).name;
    }
    if (!extractedMime && "type" in file && typeof (file as Blob).type === "string") {
      extractedMime = (file as Blob).type;
    }
  } else if (
    typeof file === "object" &&
    file !== null &&
    (Symbol.asyncIterator in file || "getReader" in file)
  ) {
    // Stream
    buffer = await streamToBuffer(file as any);
  } else if (typeof file === "string") {
    // Check for base64 data URI
    const dataUriMatch = file.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      if (!extractedMime) extractedMime = dataUriMatch[1];
      buffer = Buffer.from(dataUriMatch[2], "base64");
    } else {
      buffer = Buffer.from(file, "utf-8");
    }
  } else {
    buffer = Buffer.from(file as any);
  }

  const safeName = sanitizeFilename(extractedName || "upload");
  const uniqueName = options.preserveFilename ? safeName : `${Date.now()}-${safeName}`;

  const resolvedMimeType =
    extractedMime && extractedMime !== "application/octet-stream"
      ? extractedMime
      : getMimeType(extractedName || safeName);

  const folder = cleanPath(options.path || "");
  const relativeKey = folder ? `${folder}/${uniqueName}` : uniqueName;

  return {
    buffer,
    filename: safeName,
    mimeType: resolvedMimeType,
    relativeKey,
  };
}
