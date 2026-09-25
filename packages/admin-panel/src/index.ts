import { registerPanelDefinition } from "./registry/engine";
import { defaultPanelRoutes } from "./panels/default/routes";
import DefaultAdminLayout from "./panels/default/layout";
import { DefaultPanelProvider } from "./panels/default/provider";

// =============================================================
// REGISTER BUILT-IN DEFAULT PANEL
// Automatically available when adminPanel: defaultAdminPanel() is in config
// =============================================================
registerPanelDefinition("default", {
  routes: defaultPanelRoutes,
  layout: DefaultAdminLayout,
  provider: DefaultPanelProvider,
});

// =============================================================
// PUBLIC ROOT API
// =============================================================
export { AdminPanel } from "./registry/router";
export { AdminLayout } from "./registry/layout";
export { AdminPanelProvider } from "./registry/provider";
export { resolveMetadata } from "./registry/metadata";

// Types
export type { AdminPanelProps } from "./registry/router";
export type { AdminLayoutProps } from "./registry/layout";
export type { PanelProviderProps } from "./registry/provider";
export type { ResolveMetadataOptions } from "./registry/metadata";
export type {
  AdminRoute,
  AdminRouteProps,
  AdminLayoutComponent,
  PanelDefinition,
  PanelProviderComponent,
  PanelContextValue,
  AdminSearchParams,
  AdminRouteParams,
  AdminRoutesProvider,
  AdminRoutesFactory,
} from "./registry/types";
