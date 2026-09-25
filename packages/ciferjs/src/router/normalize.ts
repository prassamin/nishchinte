/**
 * Normalizes Next.js directory and file segment names into router path expressions:
 * - `[param]` -> `:param`
 * - `[...slug]` -> `*`
 * - `(group)` -> ignored (Next.js route groups)
 */
export function normalizeSegment(name: string): string {
  // Ignore Next.js route groups, e.g. `(admin)` -> ""
  if (name.startsWith("(") && name.endsWith(")")) {
    return "";
  }
  // Wildcard catch-all: `[...slug]` -> `*`
  if (name.startsWith("[...") && name.endsWith("]")) {
    return "*";
  }
  // Dynamic route parameter: `[id]` -> `:id`
  if (name.startsWith("[") && name.endsWith("]")) {
    return `:${name.slice(1, -1)}`;
  }
  return name;
}
