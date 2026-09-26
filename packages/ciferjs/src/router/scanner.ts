import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { createJiti } from "jiti";
import { HTTP_METHODS, type CiferOptions } from "../core/types";
import { CiferRequest } from "../core/request";
import { CiferResponse } from "../core/response";
import { CiferContext } from "../core/context";
import { normalizeSegment } from "./normalize";
import { resolveRoutesDirectory } from "./resolver";

/**
 * Resolves the path to the ciferjs package dist entry for jiti alias.
 */
function resolveCiferEntry(): string | undefined {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const dir = path.dirname(currentFile);
    const candidates = [
      path.join(dir, "index.cjs"),
      path.resolve(dir, "../dist/index.cjs"),
      path.resolve(dir, "../../ciferjs/dist/index.cjs"),
      path.join(dir, "index.js"),
      path.resolve(dir, "../dist/index.js"),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
        return candidate;
      }
    }
  } catch {
    // Continue fallback
  }
  return undefined;
}

/**
 * Scans the filesystem routes directory and constructs a Hono application
 * routing requests to Cifer (req, ctx) route handlers.
 */
export async function createAutoRouter(options: CiferOptions = {}): Promise<Hono> {
  const app = options.basePath ? new Hono().basePath(options.basePath) : new Hono();
  const routesDir = resolveRoutesDirectory(options.routesDir);

  if (!routesDir) {
    return app;
  }

  const isDev = options.dev ?? (process.env.NODE_ENV !== "production");
  const ciferEntry = resolveCiferEntry();

  const jiti = createJiti(routesDir || process.cwd(), {
    moduleCache: !isDev,
    fsCache: !isDev,
    alias: ciferEntry ? { ciferjs: ciferEntry } : undefined,
  });

  async function scan(currentDir: string, currentRoutePath: string = "") {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        const segment = normalizeSegment(entry.name);
        const nextRoute = segment
          ? currentRoutePath
            ? `${currentRoutePath}/${segment}`
            : `/${segment}`
          : currentRoutePath;

        await scan(fullPath, nextRoute);
      } else if (
        entry.isFile() &&
        (entry.name === "route.ts" || entry.name === "route.js" || entry.name === "route.mjs")
      ) {
        try {
          const fileSource = fs.readFileSync(fullPath, "utf-8");
          const mod: any = jiti.evalModule(fileSource, { filename: fullPath });
          const routePattern = currentRoutePath || "/";

          // 1. If route file exports a Hono sub-app as default export
          if (mod.default && typeof mod.default.fetch === "function") {
            app.route(routePattern, mod.default);
          }

          // 2. Register individual HTTP methods (Next.js App Router style)
          for (const method of HTTP_METHODS) {
            const handler = mod[method];
            if (typeof handler === "function") {
              app.on(method, routePattern, async (c) => {
                const req = new CiferRequest(c);
                const customServices = options.context ? await options.context(c) : {};
                const params = c.req.param();
                const ctx = new CiferContext(c, params, customServices);

                const result = await handler(req, ctx);

                // Intercept improper use of CiferResponse.next() inside route handlers
                if (result instanceof Response && result.headers.get("x-middleware-next") === "1") {
                  console.error(
                    `❌ [Cifer.js] Error: CiferResponse.next() was returned from route handler at "${fullPath}". CiferResponse.next() is only supported in middleware, not in route.ts handlers. Please return CiferResponse.json() or a valid response payload instead.`,
                  );
                  return CiferResponse.json(
                    {
                      error: "CiferResponse.next() was used in a route handler. This is only supported in middleware.",
                      route: routePattern,
                      file: fullPath,
                    },
                    { status: 500 },
                  );
                }

                // If handler returned a standard Web Response or CiferResponse
                if (result instanceof Response) {
                  c.res.headers.forEach((value, key) => {
                    if (key.toLowerCase() === "set-cookie") {
                      result.headers.append(key, value);
                    } else if (!result.headers.has(key)) {
                      result.headers.set(key, value);
                    }
                  });
                  return result;
                }

                // If handler returned a plain JavaScript object
                if (result !== undefined && typeof result === "object") {
                  return c.json(result);
                }

                // If handler returned a plain string
                if (typeof result === "string") {
                  return c.text(result);
                }

                return c.body(null, 204);
              });
            }
          }
        } catch (err: any) {
          console.error(
            `❌ [Cifer.js] Failed to load route "${fullPath}":`,
            err?.message || err,
          );
        }
      }
    }
  }

  await scan(routesDir);
  return app;
}
