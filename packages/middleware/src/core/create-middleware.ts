import { getConfig, type ResolvedNishchinteConfig, type NishchinteConfig } from "@nishchinte/config";
import type { NextRequest, NextResponse } from "next/server";
import type { CreateMiddlewareOptions, NishchinteMiddlewareFn } from "./types";
import { createBaseMiddleware } from "../middlewares/base";
import { composeMiddlewares } from "./composer";
import { scanMiddlewares } from "./scanner";

/**
 * Creates the Next.js root Edge/Proxy middleware with dynamic plugin discovery.
 *
 * Automatically inspects the provided configuration or `nishchinte.config.ts` by
 * dynamically scanning all registered plugins/objects for `.middleware` handlers
 * (e.g. auth session verification, admin panel route protection, multi-tenant routing)
 * and runs them through a unified Cookie & Header Merger Pipeline.
 *
 * Passing `config` directly (e.g. `createMiddleware(config)`) allows Next.js to include
 * your config and plugin dependencies in its hot-reload watch graph so that middleware
 * edits reflect instantly without restarting the server.
 *
 * @example
 * ```ts
 * // apps/www/src/proxy.ts
 * import config from "../nishchinte.config";
 * import { createMiddleware } from "@nishchinte/middleware";
 *
 * export default createMiddleware(config);
 * ```
 */
export function createMiddleware(
  optionsOrConfig?: CreateMiddlewareOptions | NishchinteConfig | ResolvedNishchinteConfig | unknown
) {
  let initialConfig: unknown = null;
  let options: CreateMiddlewareOptions = {};

  if (optionsOrConfig && typeof optionsOrConfig === "object") {
    const opts = optionsOrConfig as Record<string, unknown>;
    if (
      "config" in opts ||
      "before" in opts ||
      "after" in opts ||
      "baseHeaders" in opts ||
      "middlewares" in opts
    ) {
      options = opts as CreateMiddlewareOptions;
      if (options.config) {
        initialConfig =
          typeof options.config === "function"
            ? (options.config as () => unknown)()
            : options.config;
      }
    } else {
      initialConfig = optionsOrConfig;
    }
  }

  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const isDev = process.env.NODE_ENV !== "production";

    // Use passed config instance, or dynamically load in development
    let config: unknown = initialConfig;
    if (!config) {
      config = getConfig({ reload: isDev });
    }

    const middlewares: NishchinteMiddlewareFn[] = [];

    // 1. Base Headers Middleware (Origin, Full URL, Path)
    if (options.baseHeaders !== false) {
      middlewares.push(createBaseMiddleware());
    }

    // 2. Pre-middlewares (before)
    if (options.before) {
      if (Array.isArray(options.before)) {
        middlewares.push(...options.before);
      } else {
        middlewares.push(options.before);
      }
    }

    // 3. Dynamic Auto-Discovery: Scan any plugins/objects in config for `.middleware`
    if (config) {
      const pluginMiddlewares = scanMiddlewares(config);
      middlewares.push(...pluginMiddlewares);
    }

    // 4. Post-middlewares (after)
    if (options.after) {
      if (Array.isArray(options.after)) {
        middlewares.push(...options.after);
      } else {
        middlewares.push(options.after);
      }
    }

    // 5. Manual extra middlewares
    if (options.middlewares && options.middlewares.length > 0) {
      middlewares.push(...options.middlewares);
    }

    // Run composed pipeline
    const composed = composeMiddlewares(...middlewares);
    return composed(request);
  };
}

export const createProxy = createMiddleware;