"use client";

import React, { createContext, useContext } from "react";
import type {
  AdminRouteContextValue,
  AdminRouteParams,
  AdminSearchParams,
} from "./types";

import { useRequirePanelProvider } from "./provider";

const AdminRouteContext = createContext<AdminRouteContextValue | null>(null);

export function useAdminRouteContext(): AdminRouteContextValue {
  const context = useContext(AdminRouteContext);
  if (!context) {
    throw new Error("useAdminRouteContext must be used within an AdminClientProvider");
  }
  return context;
}

export function useAdminParams<T extends AdminRouteParams = AdminRouteParams>(): T {
  const { params } = useAdminRouteContext();
  return params as T;
}

export function useAdminSearchParams(): AdminSearchParams {
  const { searchParams } = useAdminRouteContext();
  return searchParams;
}

export function useAdminCurrentPath(): string {
  const { currentPath } = useAdminRouteContext();
  return currentPath;
}

export function useAdminMatchedPath(): string | null {
  const { matchedPath } = useAdminRouteContext();
  return matchedPath;
}

export function AdminClientProvider({
  value,
  children,
}: {
  value: AdminRouteContextValue;
  children: React.ReactNode;
}) {
  // Enforce PanelProvider when the active panel defines a provider
  useRequirePanelProvider();

  return (
    <AdminRouteContext.Provider value={value}>
      {children}
    </AdminRouteContext.Provider>
  );
}
