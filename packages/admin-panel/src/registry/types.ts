import type { ComponentType, ReactNode } from "react";
import type { Metadata } from "next";

export type AdminRouteParams = Record<string, string>;
export type AdminSearchParams = Record<string, string | string[] | undefined>;

export interface AdminRouteProps {
  params: AdminRouteParams;
  searchParams: AdminSearchParams;
}

export type AdminLayoutComponent =
  | ComponentType<{ children: ReactNode }>
  | ((props: { children: ReactNode }) => Promise<ReactNode> | ReactNode);

export type AdminLayoutLoader =
  | AdminLayoutComponent
  | (() => Promise<{ default: AdminLayoutComponent } | AdminLayoutComponent>);

export interface AdminRoute {
  /** Route path relative to /admin (e.g. "", "products", "products/new", "products/categories/:slug") */
  path: string;
  /** React Component (Server Component / async or Client Component) */
  component:
    | ComponentType<AdminRouteProps>
    | ((props: AdminRouteProps) => Promise<ReactNode> | ReactNode);
  /** Optional nested layout for this specific route section */
  layout?: AdminLayoutComponent;
  /** Optional dynamic generateMetadata function imported directly from page.tsx */
  generateMetadata?: (props: AdminRouteProps) => Promise<Metadata> | Metadata;
  /** Optional static Next.js Metadata definition */
  metadata?: Metadata;
}

export type AdminRoutesFactory = () => AdminRoute[];
export type AdminRoutesProvider = AdminRoute[] | AdminRoutesFactory;

export type PanelProviderComponent =
  | ComponentType<{ children: ReactNode }>
  | ((props: { children: ReactNode }) => ReactNode);

export interface PanelDefinition {
  routes: AdminRoute[];
  layout?: AdminLayoutComponent;
  provider?: PanelProviderComponent;
}

export interface PanelContextValue {
  isPanelProviderMounted: boolean;
  panelName: string;
}

export interface MatchedAdminRoute {
  route: AdminRoute;
  params: AdminRouteParams;
  path: string;
}

export interface AdminRouteContextValue {
  params: AdminRouteParams;
  searchParams: AdminSearchParams;
  currentPath: string;
  matchedPath: string | null;
}
