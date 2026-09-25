/**
 * Removes leading/trailing slashes and normalizes internal path separators.
 */
export function cleanPath(inputPath: string = ""): string {
  return inputPath.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

/**
 * Safely sanitizes a filename for storage and filesystem use.
 */
export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Joins path segments into a clean storage path without duplicate slashes.
 */
export function joinStoragePath(...parts: string[]): string {
  return parts
    .map((p) => cleanPath(p))
    .filter(Boolean)
    .join("/");
}
