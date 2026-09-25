import type { NishchinteMiddlewareFn } from "./types";

/**
 * Dynamically and recursively scans any configuration tree, object, or array
 * to discover all middleware functions registered under the reserved `.middleware` key.
 *
 * This completely decouples middleware orchestration from specific plugin names,
 * allowing any existing or newly introduced plugin (auth, adminPanel, storefront,
 * analytics, multi-tenant, custom third-party plugins, etc.) to inject its middleware
 * automatically into the Next.js execution pipeline.
 *
 * @param target - The config object or tree to scan (e.g. result of `getConfig()`)
 * @param visited - Set of visited objects to prevent circular reference cycles
 * @param discovered - Set of collected unique middleware functions preserving execution order
 * @returns Array of discovered middleware functions
 */
export function scanMiddlewares(
  target: unknown,
  visited = new Set<object>(),
  discovered = new Set<NishchinteMiddlewareFn>()
): NishchinteMiddlewareFn[] {
  if (!target || typeof target !== "object") {
    return Array.from(discovered);
  }

  // Prevent infinite cycles on circular references
  if (visited.has(target)) {
    return Array.from(discovered);
  }
  visited.add(target);

  // If array, scan each item in sequence
  if (Array.isArray(target)) {
    for (const item of target) {
      scanMiddlewares(item, visited, discovered);
    }
    return Array.from(discovered);
  }

  const record = target as Record<string, unknown>;

  // If the current object has a .middleware function, collect it
  if (typeof record.middleware === "function") {
    discovered.add(record.middleware as NishchinteMiddlewareFn);
  }

  // Dynamically inspect all child properties
  for (const [key, val] of Object.entries(record)) {
    if (key !== "middleware" && val && typeof val === "object") {
      scanMiddlewares(val, visited, discovered);
    }
  }

  return Array.from(discovered);
}
