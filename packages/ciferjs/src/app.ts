import { Hono } from "hono";
import type { CiferOptions } from "./core/types";
import type { CiferContextMap, CiferContext } from "./core/context";
import { createAutoRouter } from "./router/scanner";

export interface CiferApp<TContext extends Record<string, any> = CiferContextMap> extends Hono {
  _contextType: CiferContext<Record<string, string | string[]>, TContext>;
}

/**
 * Creates an instance of the Cifer Server Application with file-based routing.
 *
 * - In Development: Automatically discovers new, edited, or deleted routes on every request (Hot Route Reloading).
 * - In Production: Compiles static route tree once for maximum performance.
 */
export function createCifer<TContext extends Record<string, any> = CiferContextMap>(
  options?: CiferOptions<TContext>,
): CiferApp<TContext> {
  const isProd = process.env.NODE_ENV === "production";
  let prodRouterPromise: Promise<Hono> | null = null;

  const app = new Hono() as CiferApp<TContext>;

  app.all("*", async (c) => {
    const router = isProd
      ? await (prodRouterPromise ??= createAutoRouter(options as any))
      : await createAutoRouter({ ...options, dev: true } as any);

    // 1. Try with the raw incoming request
    const res = await router.fetch(c.req.raw);
    if (res.status !== 404) {
      return res;
    }

    // 2. If 404 and URL pathname has /api prefix (e.g. mounted in Next.js /api), strip and retry
    const url = new URL(c.req.raw.url);
    if (url.pathname.startsWith("/api/")) {
      url.pathname = url.pathname.replace(/^\/api/, "");
      const strippedReq = new Request(url.toString(), c.req.raw);
      const retryRes = await router.fetch(strippedReq);
      if (retryRes.status !== 404) {
        return retryRes;
      }
    }

    return res;
  });

  return app;
}

/**
 * Alias for createCifer.
 */
export const createServer = createCifer;