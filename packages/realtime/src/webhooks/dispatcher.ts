import { signWebhookPayload } from "./signature";
import { getWebhookConfig } from "../config";
import type { RealtimePayload, WebhookEndpoint, WebhookConfig } from "../types";
import { MemoryEventBus, globalEventBus } from "../bus/emitter";

export interface DeliveryResult {
  endpointId: string;
  url: string;
  success: boolean;
  status?: number;
  attempts: number;
  durationMs: number;
  error?: string;
  responseBody?: string;
}

export type WebhookLogger = (result: DeliveryResult, payload: RealtimePayload) => void | Promise<void>;

let endpointCounter = 1;

function resolveEndpointId(endpoint: WebhookEndpoint): string {
  if (endpoint.id && endpoint.id.trim().length > 0) {
    return endpoint.id.trim();
  }
  try {
    const u = new URL(endpoint.url);
    const hostname = u.hostname.replace(/[^a-zA-Z0-9]/g, "-");
    return `wh_${hostname}_${endpointCounter++}`;
  } catch {
    return `wh_ep_${endpointCounter++}`;
  }
}

export class WebhookDispatcher {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  public config: WebhookConfig;
  private logger?: WebhookLogger;
  private bus: MemoryEventBus;
  private unsubscribeBus?: () => void;

  constructor(options: {
    config?: WebhookConfig;
    endpoints?: WebhookEndpoint[];
    logger?: WebhookLogger;
    bus?: MemoryEventBus;
  } = {}) {
    this.config = {
      enabled: options.config?.enabled ?? true,
      maxRetries: options.config?.maxRetries ?? 3,
      retryDelayMs: options.config?.retryDelayMs ?? 1000,
      timeoutMs: options.config?.timeoutMs ?? 10000,
      headerName: options.config?.headerName ?? "X-Nishchinte-Signature",
      headers: options.config?.headers,
    };
    this.logger = options.logger;
    this.bus = options.bus || globalEventBus;

    if (options.endpoints) {
      for (const ep of options.endpoints) {
        this.addEndpoint(ep);
      }
    }

    this.startListening();
  }

  public addEndpoint(endpoint: WebhookEndpoint): void {
    const generatedId = resolveEndpointId(endpoint);
    const key = `${generatedId}:::${endpoint.url}`;
    this.endpoints.set(key, {
      ...endpoint,
      id: generatedId,
    });
  }

  public removeEndpoint(idOrUrl: string): void {
    for (const [key, ep] of this.endpoints.entries()) {
      if (ep.id === idOrUrl || ep.url === idOrUrl || key === idOrUrl) {
        this.endpoints.delete(key);
      }
    }
  }

  public setEndpoints(endpoints: WebhookEndpoint[]): void {
    this.endpoints.clear();
    for (const ep of endpoints) {
      this.addEndpoint(ep);
    }
  }

  private startListening(): void {
    if (this.unsubscribeBus) {
      this.unsubscribeBus();
    }
    this.unsubscribeBus = this.bus.subscribe("*", (payload) => {
      this.dispatch(payload).catch((err) => {
        console.error("[WebhookDispatcher] Dispatch error:", err);
      });
    });
  }

  public async dispatch(payload: RealtimePayload): Promise<DeliveryResult[]> {
    try {
      const currentConfig = getWebhookConfig();
      if (currentConfig.endpoints) {
        this.setEndpoints(currentConfig.endpoints);
      }
      if (currentConfig.enabled !== undefined) {
        this.config = {
          ...this.config,
          ...currentConfig,
        };
      }
    } catch {}

    if (this.config.enabled === false) return [];

    const eventKey = `${payload.table.toLowerCase()}.${payload.eventType.toLowerCase()}`;
    const matchingEndpoints: WebhookEndpoint[] = [];

    for (const ep of this.endpoints.values()) {
      if (ep.isActive === false) continue;

      // 1. Table filter per endpoint
      if (ep.tables && ep.tables.length > 0) {
        const matchesTable = ep.tables.some((t) => {
          const lower = t.toLowerCase().trim();
          return lower === "*" || lower === payload.table.toLowerCase();
        });
        if (!matchesTable) continue;
      }

      // 2. Events filter per endpoint
      const events = ep.events && ep.events.length > 0 ? ep.events : ["*"];
      if (this.matchesPattern(events, payload.table, payload.eventType, eventKey)) {
        matchingEndpoints.push(ep);
      }
    }

    if (matchingEndpoints.length === 0) return [];

    const deliveryPromises = matchingEndpoints.map((ep) => this.deliverWithRetry(ep, payload));
    return Promise.all(deliveryPromises);
  }

  private matchesPattern(
    patterns: string[],
    table: string,
    eventType: string,
    eventKey: string,
  ): boolean {
    const t = table.toLowerCase();
    const e = eventType.toLowerCase();

    for (const pattern of patterns) {
      const p = pattern.toLowerCase().trim();
      if (p === "*" || p === "*.*") return true;
      if (p === e) return true; // Direct operation type like "INSERT", "UPDATE", "DELETE"
      if (p === eventKey) return true; // e.g. "internaluser.update"
      if (p === `${t}.*` || p === `${t}:*`) return true;
      if (p === `*.${e}` || p === `*:${e}`) return true;
    }
    return false;
  }

  private async deliverWithRetry(
    endpoint: WebhookEndpoint,
    payload: RealtimePayload,
  ): Promise<DeliveryResult> {
    const rawPayload = JSON.stringify(payload);
    const maxRetries = this.config.maxRetries ?? 3;
    let attempts = 0;
    let lastError: string | undefined;
    let lastStatus: number | undefined;
    let lastResponseBody: string | undefined;

    const startTime = Date.now();

    while (attempts < maxRetries) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs || 10000);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "Nishchinte-Webhook/1.0",
          "X-Nishchinte-Event": `${payload.table}.${payload.eventType}`,
          "X-Nishchinte-Delivery": payload.id,
          "X-Nishchinte-Attempt": String(attempts),
          ...(endpoint.headers || {}),
        };

        if (endpoint.secret) {
          const headerName = this.config.headerName || "X-Nishchinte-Signature";
          headers[headerName] = signWebhookPayload(rawPayload, endpoint.secret);
        }

        const response = await fetch(endpoint.url, {
          method: "POST",
          headers,
          body: rawPayload,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        lastStatus = response.status;
        lastResponseBody = await response.text().catch(() => "");

        if (response.ok) {
          const result: DeliveryResult = {
            endpointId: endpoint.id || endpoint.url,
            url: endpoint.url,
            success: true,
            status: lastStatus,
            attempts,
            durationMs: Date.now() - startTime,
            responseBody: lastResponseBody.slice(0, 1000),
          };

          if (this.logger) {
            await this.logger(result, payload);
          }
          return result;
        } else {
          lastError = `HTTP ${response.status}: ${lastResponseBody.slice(0, 200)}`;
          console.warn(
            `⚠️ [Webhook] Delivery attempt ${attempts} failed for ${endpoint.url}: ${lastError}`,
          );
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(
          `⚠️ [Webhook] Delivery attempt ${attempts} network error for ${endpoint.url}:`,
          lastError,
        );
      }

      // Exponential backoff before next attempt
      if (attempts < maxRetries) {
        const delay = (this.config.retryDelayMs || 1000) * Math.pow(2, attempts - 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    const failedResult: DeliveryResult = {
      endpointId: endpoint.id || endpoint.url,
      url: endpoint.url,
      success: false,
      status: lastStatus,
      attempts,
      durationMs: Date.now() - startTime,
      error: lastError,
      responseBody: lastResponseBody?.slice(0, 1000),
    };

    console.error(
      `❌ [Webhook] Failed to deliver ${payload.table}.${payload.eventType} to ${endpoint.url} after ${attempts} attempts. Error: ${lastError}`,
    );

    if (this.logger) {
      await this.logger(failedResult, payload);
    }
    return failedResult;
  }

  public destroy(): void {
    if (this.unsubscribeBus) {
      this.unsubscribeBus();
      this.unsubscribeBus = undefined;
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __nishchinte_webhook_dispatcher__: WebhookDispatcher | undefined;
}

/**
 * Retrieves the global singleton WebhookDispatcher initialized from project config.
 */
export function getWebhookDispatcher(): WebhookDispatcher {
  const config = getWebhookConfig();

  if (globalThis.__nishchinte_webhook_dispatcher__) {
    if (config.endpoints) {
      globalThis.__nishchinte_webhook_dispatcher__.setEndpoints(config.endpoints);
    }
    if (config.enabled !== undefined) {
      globalThis.__nishchinte_webhook_dispatcher__.config = {
        ...globalThis.__nishchinte_webhook_dispatcher__.config,
        ...config,
      };
    }
    return globalThis.__nishchinte_webhook_dispatcher__;
  }

  globalThis.__nishchinte_webhook_dispatcher__ = new WebhookDispatcher({
    config: config,
    endpoints: config.endpoints,
    bus: globalEventBus,
  });

  return globalThis.__nishchinte_webhook_dispatcher__;
}
