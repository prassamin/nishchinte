import { type ReactNode } from "react";
import { getConfig } from "@nishchinte/config";
import { getActivePanelDefinition } from "./engine";
import DefaultAdminLayout from "../panels/default/layout";

export interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Root Admin Layout wrapper.
 * Automatically inspects the active admin panel from `nishchinte.config.ts`
 * and applies the resolved panel layout.
 *
 * Use this in `apps/www/src/app/admin/layout.tsx` to automatically bind panel layouts:
 *
 * @example
 * ```tsx
 * // apps/www/src/app/admin/layout.tsx
 * export { AdminLayout as default } from "@nishchinte/admin-panel";
 * ```
 */
export async function AdminLayout({ children }: AdminLayoutProps) {
  const config = getConfig();

  if (!config?.adminPanel) {
    return <>{children}</>;
  }

  const activeDef = getActivePanelDefinition();
  const PanelLayout = activeDef?.layout ?? DefaultAdminLayout;

  if (PanelLayout) {
    return <PanelLayout>{children}</PanelLayout>;
  }

  return <>{children}</>;
}
