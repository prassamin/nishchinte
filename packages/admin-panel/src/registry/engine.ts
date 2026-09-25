import { getConfig } from "@nishchinte/config";
import type {
  AdminRoute,
  MatchedAdminRoute,
  AdminRouteParams,
  AdminRoutesProvider,
  PanelDefinition,
  AdminLayoutComponent,
} from "./types";

function normalizePath(path: string): string {
  return path.trim().replace(/^\/+|\/+$/g, "");
}

interface CompiledRoute {
  route: AdminRoute;
  paramNames: string[];
  regex: RegExp;
  isDynamic: boolean;
}

// Panel Definitions Registry (maps panel name e.g. "default" -> { routes, layout })
const panelDefinitions = new Map<string, PanelDefinition>();

export function registerPanelDefinition(
  name: string,
  definition: PanelDefinition
): void {
  panelDefinitions.set(name, definition);
}

export function getPanelDefinition(name: string): PanelDefinition | undefined {
  return panelDefinitions.get(name);
}

export function getActivePanelName(): string {
  const config = getConfig();
  if (!config?.adminPanel) {
    return "default";
  }

  let panelName = "default";
  if (typeof config.adminPanel === "function") {
    try {
      const res = config.adminPanel();
      if (res && typeof res === "object" && "name" in res) {
        panelName = (res as { name?: string }).name || "default";
      }
    } catch {
      panelName = "default";
    }
  } else if (typeof config.adminPanel === "object" && "name" in config.adminPanel) {
    panelName = (config.adminPanel as { name?: string }).name || "default";
  } else if (typeof config.adminPanel === "string") {
    panelName = config.adminPanel;
  }

  return panelName;
}

export function getActivePanelDefinition(name?: string): PanelDefinition | undefined {
  const panelName = name || getActivePanelName();
  return panelDefinitions.get(panelName);
}

export class AdminRouteRegistry {
  private routes: AdminRoute[] = [];
  private providers: (() => AdminRoute[])[] = [];
  private compiledRoutes: CompiledRoute[] = [];

  /**
   * Register a single admin route definition
   */
  public register(route: AdminRoute): this {
    const normalized = {
      ...route,
      path: normalizePath(route.path),
    };

    // Remove existing if registered with exact path
    this.routes = this.routes.filter((r) => r.path !== normalized.path);
    this.routes.push(normalized);
    this.compile();
    return this;
  }

  /**
   * Register multiple admin route definitions or a dynamic provider/factory function
   */
  public registerMany(routesOrFactory: AdminRoutesProvider): this {
    if (typeof routesOrFactory === "function") {
      this.providers.push(routesOrFactory);
    } else {
      for (const route of routesOrFactory) {
        const normalized = {
          ...route,
          path: normalizePath(route.path),
        };
        this.routes = this.routes.filter((r) => r.path !== normalized.path);
        this.routes.push(normalized);
      }
    }
    this.compile();
    return this;
  }

  /**
   * Resolves and combines static routes, active panel routes, and provider function routes
   */
  private resolveAllRoutes(): AdminRoute[] {
    const allRoutes = [...this.routes];

    // 1. Auto-resolve active panel definition routes (e.g. default panel)
    const activePanel = getActivePanelDefinition();
    if (activePanel?.routes && Array.isArray(activePanel.routes)) {
      for (const route of activePanel.routes) {
        const normalized = {
          ...route,
          path: normalizePath(route.path),
        };
        const existingIndex = allRoutes.findIndex((r) => r.path === normalized.path);
        if (existingIndex >= 0) {
          allRoutes[existingIndex] = normalized;
        } else {
          allRoutes.push(normalized);
        }
      }
    }

    // 2. Resolve additional providers
    for (const provider of this.providers) {
      try {
        const providedRoutes = provider();
        if (Array.isArray(providedRoutes)) {
          for (const route of providedRoutes) {
            const normalized = {
              ...route,
              path: normalizePath(route.path),
            };
            const existingIndex = allRoutes.findIndex((r) => r.path === normalized.path);
            if (existingIndex >= 0) {
              allRoutes[existingIndex] = normalized;
            } else {
              allRoutes.push(normalized);
            }
          }
        }
      } catch (error) {
        console.error("[AdminRouteRegistry] Error resolving route provider:", error);
      }
    }

    return allRoutes;
  }

  /**
   * Compile routes into regex matchers sorted by specificity
   */
  private compile(): void {
    const allRoutes = this.resolveAllRoutes();

    this.compiledRoutes = allRoutes.map((route) => {
      const segments = route.path ? route.path.split("/") : [];
      const paramNames: string[] = [];
      let isDynamic = false;

      const patternSegments = segments.map((seg) => {
        if (seg.startsWith("*")) {
          isDynamic = true;
          paramNames.push(seg.slice(1));
          return "(.+)";
        }
        if (seg.startsWith("...")) {
          isDynamic = true;
          paramNames.push(seg.slice(3));
          return "(.+)";
        }
        if (seg.startsWith(":")) {
          isDynamic = true;
          paramNames.push(seg.slice(1));
          return "([^/]+)";
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      });

      const pattern = patternSegments.length > 0
        ? `^${patternSegments.join("/")}$`
        : "^$";

      return {
        route,
        paramNames,
        regex: new RegExp(pattern),
        isDynamic,
      };
    });

    // Sort: Static exact matches first, then dynamic matches with most segments
    this.compiledRoutes.sort((a, b) => {
      if (!a.isDynamic && b.isDynamic) return -1;
      if (a.isDynamic && !b.isDynamic) return 1;
      return b.route.path.split("/").length - a.route.path.split("/").length;
    });
  }

  /**
   * Match a relative admin URL path against the registry
   */
  public match(path: string): MatchedAdminRoute | null {
    const normalized = normalizePath(path);

    // Ensure compilation has occurred
    this.compile();

    for (const compiled of this.compiledRoutes) {
      const match = compiled.regex.exec(normalized);
      if (match) {
        const params: AdminRouteParams = {};
        compiled.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });

        return {
          route: compiled.route,
          params,
          path: normalized,
        };
      }
    }

    return null;
  }

  /**
   * Get all registered routes
   */
  public getAll(): AdminRoute[] {
    return this.resolveAllRoutes();
  }
}

// Global registry singleton
export const adminRegistry = new AdminRouteRegistry();

// Functional helpers
export const registerAdminRoute = (route: AdminRoute) => adminRegistry.register(route);
export const registerAdminRoutes = (routesOrFactory: AdminRoutesProvider) =>
  adminRegistry.registerMany(routesOrFactory);
export const matchAdminRoute = (path: string) => adminRegistry.match(path);
