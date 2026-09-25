import { getConfig } from "@nishchinte/config";
import { createRealtimeExtension } from "@nishchinte/realtime";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/client/client";
import type { SqlDriverAdapterFactory } from "@prisma/client/runtime/client";

declare global {
  // eslint-disable-next-line no-var
  var __nishchinte_prisma__: PrismaClient | undefined;
}

/**
 * Creates a new PrismaClient instance connected with the appropriate adapter.
 */
export function createDbClient(options?: {
  url?: string;
  adapter?: SqlDriverAdapterFactory;
}): PrismaClient {
  const config = getConfig();
  const dbConfig =
    typeof config.database === "string"
      ? { url: config.database }
      : config.database;

  const connectionString = options?.url || dbConfig?.url;

  if (!connectionString) {
    throw new Error(
      "❌ [Nishchinte DB] Database connection string is missing. Please define `database: { url: ... }` in your `nishchinte.config.ts`.",
    );
  }

  const adapter =
    options?.adapter ||
    (dbConfig?.adapter as any) ||
    new PrismaMariaDb(connectionString);

  const rawClient = new PrismaClient({ adapter });

  const realtimeConfig =
    typeof config.realtime === "boolean"
      ? { enabled: config.realtime }
      : config.realtime;

  const webhooksConfig =
    typeof config.webhooks === "boolean"
      ? { enabled: config.webhooks }
      : config.webhooks;

  const isCdcEnabled = Boolean(realtimeConfig?.enabled || webhooksConfig?.enabled);

  if (isCdcEnabled) {
    try {
      return rawClient.$extends(
        createRealtimeExtension({
          enabled: isCdcEnabled,
          bus: realtimeConfig?.bus,
          tables: realtimeConfig?.tables,
        }),
      ) as unknown as PrismaClient;
    } catch (err) {
      console.error("[Nishchinte DB] Failed to attach realtime extension:", err);
      return rawClient;
    }
  }

  return rawClient;
}

/**
 * Lazily retrieves the global singleton PrismaClient instance.
 * Preserves connections across Next.js / hot-reloading dev environments.
 */
export function getDb(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return createDbClient();
  }

  if (!globalThis.__nishchinte_prisma__) {
    globalThis.__nishchinte_prisma__ = createDbClient();
  }

  return globalThis.__nishchinte_prisma__;
}

/**
 * Proxy singleton for direct database access.
 *
 * @example
 * ```typescript
 * import { prisma, db } from "@nishchinte/db";
 *
 * const products = await prisma.product.findMany();
 * ```
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const db = prisma;