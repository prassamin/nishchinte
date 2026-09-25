import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolves the absolute path to the target `routes` directory.
 */
export function resolveRoutesDirectory(customDir?: string): string {
  if (customDir && fs.existsSync(/*turbopackIgnore: true*/ customDir)) {
    return path.resolve(customDir);
  }

  // 1. Relative to this module file (ESM source)
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
      const currentFile = fileURLToPath(import.meta.url);
      const localRoutes = path.join(path.dirname(currentFile), "routes");
      if (fs.existsSync(/*turbopackIgnore: true*/ localRoutes)) {
        return localRoutes;
      }
    }
  } catch {
    // Continue fallback
  }

  // 2. Monorepo and CWD fallbacks
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "packages/server/src/routes"),
    path.join(cwd, "src/routes"),
    path.join(cwd, "routes"),
    path.resolve(cwd, "../../packages/server/src/routes"),
    path.resolve(cwd, "../packages/server/src/routes"),
    path.resolve(cwd, "../server/src/routes"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
      return candidate;
    }
  }

  return "";
}
