"use client";

import React, { createContext, useContext } from "react";
import { DefaultPanelProvider } from "../panels/default/provider";
import { getActivePanelName } from "./engine";
import type { PanelContextValue, PanelProviderComponent } from "./types";

export const PanelProviderContext = createContext<PanelContextValue | null>(
  null,
);

// Panel Providers Registry (maps panel name e.g. "default" -> ProviderComponent)
const panelProviders = new Map<string, PanelProviderComponent>([
  ["default", DefaultPanelProvider],
]);

export function registerPanelProvider(
  name: string,
  provider: PanelProviderComponent,
): void {
  panelProviders.set(name, provider);
}

export function getPanelProvider(
  name: string = "default",
): PanelProviderComponent | undefined {
  return (
    panelProviders.get(name) ??
    (name === "default" ? DefaultPanelProvider : undefined)
  );
}

export interface PanelProviderProps {
  children: React.ReactNode;
  /** Optional override for active panel name */
  panelName?: string;
}

/**
 * Hook to inspect whether the component tree is properly wrapped with <PanelProvider>.
 */
export function usePanelContext(): PanelContextValue {
  const context = useContext(PanelProviderContext);
  return context ?? { isPanelProviderMounted: false, panelName: "default" };
}

/**
 * Hook that requires <PanelProvider> to be present in the component tree when the active panel specifies a provider.
 * Throws a descriptive developer error if <PanelProvider> was omitted where the panel is used.
 */
export function useRequirePanelProvider(): void {
  const panelContext = useContext(PanelProviderContext);
  const panelName = getActivePanelName();
  const provider = getPanelProvider(panelName);

  if (provider && !panelContext?.isPanelProviderMounted) {
    throw new Error(
      `[Nishchinte Admin] App must be wrapped with PanelProvider.\n` +
        `The active admin panel "${panelName}" defines a panel provider, but <AdminPanelProvider> was not found in the component tree.\n`,
    );
  }
}

/**
 * Universal Panel Provider for Nishchinte Admin Panel.
 *
 * Automatically inspects the active panel definition from `nishchinte.config.ts`
 * and mounts the panel's registered `provider` (e.g. QueryClient, Theme, Confirm).
 *
 * @example
 * ```tsx
 * // apps/www/src/app/admin/layout.tsx
 * import { AdminLayout, PanelProvider } from "@nishchinte/admin-panel";
 * import type { ReactNode } from "react";
 *
 * export default function Layout({ children }: { children: ReactNode }) {
 *   return (
 *     <PanelProvider>
 *       <AdminLayout>{children}</AdminLayout>
 *     </PanelProvider>
 *   );
 * }
 * ```
 */
export function AdminPanelProvider({
  children,
  panelName,
}: PanelProviderProps) {
  const activeName = panelName || getActivePanelName();
  const ProviderComponent = getPanelProvider(activeName);

  const contextValue: PanelContextValue = {
    isPanelProviderMounted: true,
    panelName: activeName,
  };

  const content = (
    <PanelProviderContext.Provider value={contextValue}>
      {children}
    </PanelProviderContext.Provider>
  );

  if (ProviderComponent) {
    return <ProviderComponent>{content}</ProviderComponent>;
  }

  return content;
}
