import type { Metadata } from "next";
import type { AdminSearchParams } from "./types";
import { adminRegistry } from "./engine";

export interface ResolveMetadataOptions {
  /** The route path or slug array from Next.js page params */
  path: string | string[];
  /** URL search params */
  searchParams?: AdminSearchParams;
  /** App/Brand title suffix (e.g., "Nishchinte Admin") */
  fallbackTitle?: string;
  /** Default description */
  fallbackDescription?: string;
}

/**
 * Resolves dynamic metadata for any registered admin route.
 * Intended to be called inside Next.js `generateMetadata` in `app/admin/[[...slug]]/page.tsx`.
 */
export async function resolveMetadata({
  path,
  searchParams = {},
  fallbackTitle = "Admin",
  fallbackDescription,
}: ResolveMetadataOptions): Promise<Metadata> {
  const rawPath = Array.isArray(path) ? path.join("/") : (path || "");
  const matched = adminRegistry.match(rawPath);

  if (!matched) {
    return {
      title: `404 - Not Found | ${fallbackTitle}`,
      description: "Page not found in admin panel",
    };
  }

  const { route, params } = matched;

  // 1. Dynamic generateMetadata function (imported directly from page.tsx)
  if (route.generateMetadata) {
    try {
      const generated = await route.generateMetadata({
        params,
        searchParams,
      });
      return generated;
    } catch (error) {
      console.error(`[AdminMetadata] Error in generateMetadata for /admin/${rawPath}:`, error);
    }
  }

  // 2. Static metadata object
  if (route.metadata) {
    return route.metadata;
  }

  // 3. Fallback
  return {
    title: fallbackTitle,
    description: fallbackDescription,
  };
}
