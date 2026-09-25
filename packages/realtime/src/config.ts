import { getConfig } from "@nishchinte/config";
import type { RealtimeConfig, WebhooksConfig } from "./types";

let cachedRealtimeConfig: RealtimeConfig | null = null;
let cachedWebhooksConfig: WebhooksConfig | null = null;

/**
 * Type-safe realtime configuration helper for `nishchinte.config.ts`.
 *
 * Configures the in-memory/redis event bus, Server-Sent Events (SSE) path,
 * and the strict Prisma model Change Data Capture (CDC) table whitelist.
 *
 * @param config - Realtime configuration options.
 * @returns The resolved realtime configuration object.
 *
 * @example
 * ```typescript
 * import { defineConfig } from "@nishchinte/config";
 * import { realtime } from "@nishchinte/realtime";
 *
 * export default defineConfig({
 *   realtime: realtime({
 *     enabled: true,
 *     tables: ["InternalUser", "Order"],
 *     bus: "memory",
 *     ssePath: "/api/realtime",
 *   }),
 * });
 * ```
 */
export function realtime<TTable extends string = string>(
  config: RealtimeConfig<TTable> = {},
): RealtimeConfig<TTable> {
  return {
    enabled: config.enabled ?? true,
    bus: config.bus ?? "memory",
    tables: config.tables,
    ssePath: config.ssePath ?? "/api/realtime",
    ...config,
  };
}

export const defineRealtimeConfig = realtime;

/**
 * Type-safe outbound webhooks configuration helper for `nishchinte.config.ts`.
 *
 * Configures webhook subscriber destination URLs, per-endpoint table filters,
 * event mutation listeners, exponential retry backoff, and HMAC SHA-256 signatures.
 *
 * @param config - Webhooks configuration options.
 * @returns The resolved webhooks configuration object.
 *
 * @example
 * ```typescript
 * import { defineConfig } from "@nishchinte/config";
 * import { webhooks } from "@nishchinte/realtime";
 *
 * export default defineConfig({
 *   webhooks: webhooks({
 *     enabled: true,
 *     maxRetries: 3,
 *     retryDelayMs: 1000,
 *     headerName: "X-Nishchinte-Signature",
 *     endpoints: [
 *       {
 *         url: "https://api.example.com/webhooks/orders",
 *         tables: ["Order"],
 *         events: ["INSERT", "UPDATE"],
 *         secret: process.env.WEBHOOK_SECRET,
 *       },
 *     ],
 *   }),
 * });
 * ```
 */
export function webhooks<TTable extends string = string>(
  config: WebhooksConfig<TTable> = {},
): WebhooksConfig<TTable> {
  return {
    enabled: config.enabled ?? true,
    maxRetries: config.maxRetries ?? 3,
    retryDelayMs: config.retryDelayMs ?? 1000,
    timeoutMs: config.timeoutMs ?? 10000,
    headerName: config.headerName ?? "X-Nishchinte-Signature",
    endpoints: config.endpoints ?? [],
    ...config,
  };
}

export const defineWebhookConfig = webhooks;
export const defineWebhooksConfig = webhooks;

/**
 * Synchronously retrieves the active realtime configuration from `nishchinte.config.ts`.
 *
 * In development, automatically hot-reloads configuration changes within 1 second.
 *
 * @returns The active {@link RealtimeConfig}.
 */
export function getRealtimeConfig(): RealtimeConfig {
  try {
    const config = getConfig();
    if (config?.realtime !== undefined) {
      if (typeof config.realtime === "boolean") {
        return { enabled: config.realtime };
      } else {
        return realtime(config.realtime as RealtimeConfig);
      }
    }
  } catch {
    // Graceful fallback if config loader isn't initialized yet
  }

  // Realtime is opt-in by default
  return { enabled: false };
}

/**
 * Synchronously retrieves the active webhooks configuration from `nishchinte.config.ts`.
 *
 * In development, automatically hot-reloads configuration changes within 1 second.
 *
 * @returns The active {@link WebhooksConfig}.
 */
export function getWebhookConfig(): WebhooksConfig {
  try {
    const config = getConfig();
    if (config?.webhooks !== undefined) {
      if (typeof config.webhooks === "boolean") {
        return { enabled: config.webhooks };
      } else {
        return webhooks(config.webhooks as WebhooksConfig);
      }
    }
  } catch {
    // Graceful fallback if config loader isn't initialized yet
  }

  return { enabled: false };
}

export const getWebhooksConfig = getWebhookConfig;

/**
 * Checks if the realtime engine is enabled in the active project config.
 *
 * @returns `true` if realtime is enabled, `false` otherwise.
 */
export function isRealtimeEnabled(): boolean {
  return Boolean(getRealtimeConfig().enabled);
}

/**
 * Checks if the outbound webhooks engine is enabled in the active project config.
 *
 * @returns `true` if webhooks is enabled, `false` otherwise.
 */
export function isWebhooksEnabled(): boolean {
  return Boolean(getWebhookConfig().enabled);
}


