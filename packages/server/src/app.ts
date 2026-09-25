import { createCifer, Hono, type CiferOptions, type CiferApp } from "ciferjs";
import { prisma, type PrismaClient } from "@nishchinte/db";
import { getConfig, type NishchinteConfig } from "@nishchinte/config";
import { getStorageClient, type StorageClient } from "./lib/storage";
import {
  createRequestAuth,
  type RequestBoundAuth,
} from "@nishchinte/auth/server";
import { createRealtimeSSEResponse } from "@nishchinte/realtime/server";
import { getRealtimeConfig } from "@nishchinte/realtime";

declare module "ciferjs" {
  interface CiferContextMap {
    prisma: PrismaClient;
    config: NishchinteConfig;
    storage: StorageClient;
    auth: RequestBoundAuth;
  }
}

/**
 * Creates an instance of the Nishchinte Server Application powered by Cifer.js.
 */
export function createApp(options?: CiferOptions) {
  const ciferApp = createCifer({
    ...options,
    context: async (c) => {
      const config = getConfig();
      const storage = getStorageClient();
      const auth = createRequestAuth(c);
      return {
        prisma,
        config,
        storage,
        auth,
        ...(options?.context ? await options.context(c) : {}),
      };
    },
  });

  const app = new Hono() as CiferApp;

  // Dynamically serve Realtime Server-Sent Events (SSE) stream based on active nishchinte.config.ts
  app.get("*", async (c, next) => {
    const realtimeConfig = getRealtimeConfig();
    if (realtimeConfig.enabled) {
      const configuredPath = realtimeConfig.ssePath || "/api/realtime";
      const normalizedPath = configuredPath.startsWith("/api")
        ? configuredPath.slice(4) // "/api/v1/sse" -> "/v1/sse"
        : configuredPath;

      const url = new URL(c.req.url);
      const pathname = url.pathname;
      const reqPath = c.req.path;

      const matchesConfigured =
        pathname === configuredPath ||
        pathname === normalizedPath ||
        reqPath === configuredPath ||
        reqPath === normalizedPath;

      const matchesDefault =
        pathname === "/api/realtime" ||
        pathname === "/realtime" ||
        reqPath === "/api/realtime" ||
        reqPath === "/realtime";

      if (matchesConfigured || matchesDefault) {
        return createRealtimeSSEResponse(c.req.raw);
      }
    }
    return next();
  });

  // Delegate all other routes to Cifer file-based router
  app.route("/", ciferApp);

  return app;
}

/**
 * Default singleton instance of the Nishchinte Server Application.
 */
export const app = createApp();
