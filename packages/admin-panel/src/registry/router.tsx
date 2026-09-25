import React from "react";
import { notFound } from "next/navigation";
import type { AdminRouteContextValue, AdminSearchParams } from "./types";
import { adminRegistry } from "./engine";
import { AdminClientProvider } from "./context";

export interface AdminPanelProps {
  /** Relative path from /admin (e.g. "products", "products/categories/fashion", or "") */
  path: string | string[];
  /** URL search parameters */
  searchParams?: AdminSearchParams;
  /** Optional custom not found fallback component instead of calling next/navigation notFound() */
  fallback?: React.ReactNode;
}

/**
 * Server Component Router for Admin Panel.
 * Runs on the server (SSR / RSC), matches routes, and renders
 * Server Components (page.tsx) or Client Components (view.tsx).
 *
 * If no route matches, it invokes Next.js native `notFound()` to trigger `not-found.tsx`.
 */
export async function AdminPanel({
  path,
  searchParams = {},
  fallback,
}: AdminPanelProps) {
  const rawPath = Array.isArray(path) ? path.join("/") : (path || "");
  const matched = adminRegistry.match(rawPath);

  const contextValue: AdminRouteContextValue = {
    params: matched?.params ?? {},
    searchParams,
    currentPath: rawPath,
    matchedPath: matched?.route.path ?? null,
  };

  if (!matched) {
    if (fallback) {
      return (
        <AdminClientProvider value={contextValue}>
          {fallback}
        </AdminClientProvider>
      );
    }
    // Triggers Next.js native not-found.tsx boundary with HTTP 404
    notFound();
  }

  const { route, params: routeParams } = matched;
  const RouteComponent = route.component;
  const RouteLayout = route.layout;

  const content = <RouteComponent params={routeParams} searchParams={searchParams} />;

  return (
    <AdminClientProvider value={contextValue}>
      {RouteLayout ? <RouteLayout>{content}</RouteLayout> : content}
    </AdminClientProvider>
  );
}
