/**
 * Options for slug generation.
 */
export interface SlugifyOptions {
  /** Convert to lowercase (default: true) */
  lower?: boolean;
  /** Replacement character for spaces and special chars (default: "-") */
  replacement?: string;
  /** Trim leading and trailing whitespace (default: true) */
  trim?: boolean;
}

/**
 * Converts a string into a clean, URL-friendly slug.
 * Handles accents, unicode normalization, special characters, and consecutive hyphens.
 *
 * @param text - The string to slugify (e.g. "Men's Casual Shirt - Black & White")
 * @param options - Customization options
 * @returns Clean URL slug (e.g. "mens-casual-shirt-black-white")
 */
export function slugify(text: string, options: SlugifyOptions = {}): string {
  const {
    lower = true,
    replacement = "-",
    trim = true,
  } = options;

  let str = text || "";

  if (trim) {
    str = str.trim();
  }

  if (lower) {
    str = str.toLowerCase();
  }

  // Normalize Unicode characters (e.g., café -> cafe, crème -> creme)
  str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Replace invalid characters with space
  str = str.replace(/[^a-z0-9\s-]/g, "");

  // Replace whitespace and multiple consecutive dashes with single replacement
  str = str.replace(/[\s-]+/g, replacement);

  // Trim dashes from start and end
  str = str.replace(/^-+|-+$/g, "");

  return str;
}

/**
 * Alias for slugify to sanitize/clean an input slug string.
 */
export const sanitizeSlug = slugify;

/**
 * Splits a slash-delimited path, slugifies each segment individually, and joins them back with slashes.
 * Example: "T-Shirt / Women's / Summer Sale" -> "t-shirt/womens/summer-sale"
 */
export function slugifyPath(path: string): string {
  if (!path) return "";
  return path
    .split("/")
    .map((seg) => slugify(seg))
    .filter(Boolean)
    .join("/");
}

/**
 * Extracts the leaf segment from a full hierarchical slug.
 * Example: "t-shirt/womens/summer" -> "summer"
 */
export function getLeafSegment(slugOrPath: string): string {
  if (!slugOrPath) return "";
  const parts = slugOrPath.trim().replace(/^\/+|\/+$/g, "").split("/");
  return parts[parts.length - 1] || "";
}

/**
 * Extracts the parent path from a full hierarchical slug.
 * Example: "t-shirt/womens/summer" -> "t-shirt/womens"
 * Example: "t-shirt" -> ""
 */
export function getParentPath(slugOrPath: string): string {
  if (!slugOrPath) return "";
  const parts = slugOrPath.trim().replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

/**
 * Combines a parent slug path and a child leaf segment into a single canonical slug path.
 * Example: ("t-shirt/womens", "summer") -> "t-shirt/womens/summer"
 * Example: (null, "t-shirt") -> "t-shirt"
 */
export function buildHierarchicalSlug(parentSlug?: string | null, childSegment?: string | null): string {
  const cleanParent = parentSlug ? slugifyPath(parentSlug) : "";
  const cleanChild = childSegment ? slugify(getLeafSegment(childSegment)) : "";

  if (!cleanParent) return cleanChild;
  if (!cleanChild) return cleanParent;
  return `${cleanParent}/${cleanChild}`;
}