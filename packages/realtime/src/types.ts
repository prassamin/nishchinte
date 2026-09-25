/**
 * Realtime database mutation event types.
 */
export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE" | "*";

/**
 * Change Data Capture (CDC) event payload broadcast across event bus and SSE/Webhooks.
 */
export interface RealtimePayload<T = Record<string, unknown>> {
  /**
   * Unique event delivery ID.
   */
  id: string;

  /**
   * Prisma model name (e.g. `InternalUser`, `Order`).
   */
  table: string;

  /**
   * Type of database mutation.
   */
  eventType: "INSERT" | "UPDATE" | "DELETE";

  /**
   * Optional database schema name.
   */
  schema?: string;

  /**
   * Previous record data before mutation (available for DELETE/UPDATE operations).
   */
  oldData?: T | null;

  /**
   * New record data after mutation (available for INSERT/UPDATE operations).
   */
  newData?: T | null;

  /**
   * ISO 8601 timestamp string when the event occurred.
   */
  timestamp: string;
}

/**
 * Callback listener invoked when a realtime database event occurs.
 */
export type RealtimeCallback<T = Record<string, unknown>> = (
  payload: RealtimePayload<T>,
) => void | Promise<void>;

/**
 * Column filter rule for realtime channel subscriptions.
 */
export interface FilterRule {
  /**
   * Column or field name to match against (e.g. `"status"`, `"userId"`).
   */
  column: string;

  /**
   * Filter comparison operator.
   */
  operator: "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte";

  /**
   * Expected value to match against.
   */
  value: unknown;
}

/**
 * Options for subscribing to a realtime table channel.
 */
export interface ChannelSubscriptionOptions {
  /**
   * Specific event type to filter (`"INSERT"`, `"UPDATE"`, `"DELETE"`, `"*"`).
   * @default "*"
   */
  event?: RealtimeEventType;

  /**
   * Optional column value filter rule.
   */
  filter?: FilterRule;
}

/**
 * Active realtime subscription handle.
 */
export interface RealtimeSubscription {
  id: string;
  table: string;
  event: RealtimeEventType;
  filter?: FilterRule;
  callback: RealtimeCallback<any>;
  unsubscribe: () => void;
}

/**
 * Realtime topic channel for listening to database mutations.
 *
 * @example
 * ```typescript
 * const channel = realtime.channel("InternalUser");
 *
 * channel
 *   .on("UPDATE", (payload) => {
 *     console.log("User updated:", payload.newData);
 *   })
 *   .subscribe();
 * ```
 */
export interface RealtimeChannel<T = Record<string, unknown>> {
  readonly topic: string;

  /**
   * Registers an event listener for specific mutation types on this channel.
   *
   * @param event - The event type (`"INSERT"`, `"UPDATE"`, `"DELETE"`, `"*"`).
   * @param callback - Event handler callback.
   */
  on(
    event: RealtimeEventType,
    callback: RealtimeCallback<T>,
  ): RealtimeChannel<T>;

  /**
   * Registers a filtered event listener on this channel.
   *
   * @param event - The event type.
   * @param filter - Column match filter rule.
   * @param callback - Event handler callback.
   */
  on(
    event: RealtimeEventType,
    filter: FilterRule,
    callback: RealtimeCallback<T>,
  ): RealtimeChannel<T>;

  /**
   * Connects and activates the subscription stream.
   */
  subscribe(
    callback?: (
      status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR",
    ) => void,
  ): {
    unsubscribe: () => void;
  };
}

export type {
  NishchinteModelRegistry,
  AutoCompleteString,
  RealtimeModelName,
  RealtimeOperationType,
  WebhookEventPattern,
} from "@nishchinte/config";

import type {
  RealtimeModelName,
  WebhookEventPattern,
} from "@nishchinte/config";

/**
 * Webhook subscriber endpoint definition.
 */
export interface WebhookEndpoint<TTable extends string = string> {
  /**
   * Unique identifier for this endpoint.
   * If omitted, an ID will be auto-generated.
   */
  id?: string;

  /**
   * Destination HTTP/HTTPS webhook URL to receive event payloads.
   */
  url: string;

  /**
   * Optional secret key used for HMAC SHA-256 signature verification.
   * If omitted, signature header will be skipped.
   */
  secret?: string;

  /**
   * Optional table whitelist for this specific endpoint (e.g. `["InternalUser", "Order"]`).
   * If specified, only mutations to these tables will be dispatched to this endpoint.
   */
  tables?: RealtimeModelName<TTable>[];

  /**
   * Event types / patterns this endpoint listens to.
   * Defaults to `["*"]` (all events for the configured tables).
   *
   * @example `["*"]`
   * @example `["UPDATE", "INSERT"]`
   * @example `["InternalUser.UPDATE", "Order.*"]`
   */
  events?: WebhookEventPattern<TTable>[];

  /**
   * Optional custom HTTP headers to attach to webhook requests (e.g. `Authorization: Bearer <token>`, `X-API-Key`).
   *
   * @example
   * ```typescript
   * headers: {
   *   Authorization: "Bearer my-secret-token",
   *   "X-Custom-Header": "my-value"
   * }
   * ```
   */
  headers?: Record<string, string>;

  /**
   * Whether this endpoint is currently active.
   * @default true
   */
  isActive?: boolean;
}

/**
 * Outbound Webhooks configuration schema.
 */
export interface WebhooksConfig<TTable extends string = string> {
  /**
   * Whether webhook dispatching is enabled for this project.
   * @default true
   */
  enabled?: boolean;

  /**
   * Maximum delivery retry attempts for failed HTTP requests.
   * @default 3
   */
  maxRetries?: number;

  /**
   * Base delay between retries in milliseconds (uses exponential backoff).
   * @default 1000
   */
  retryDelayMs?: number;

  /**
   * Request timeout in milliseconds.
   * @default 10000
   */
  timeoutMs?: number;

  /**
   * Custom signature header name.
   * @default "X-Nishchinte-Signature"
   */
  headerName?: string;

  /**
   * Default custom HTTP headers attached to all outbound webhook requests.
   *
   * @example
   * ```typescript
   * headers: {
   *   Authorization: "Bearer my-shared-secret",
   *   "X-Application-Name": "Nishchinte"
   * }
   * ```
   */
  headers?: Record<string, string>;

  /**
   * Webhook subscriber endpoint definitions.
   */
  endpoints?: WebhookEndpoint<TTable>[];
}

export type WebhookConfig<TTable extends string = string> =
  WebhooksConfig<TTable>;

/**
 * Realtime and CDC configuration schema.
 */
export interface RealtimeConfig<TTable extends string = string> {
  /**
   * Whether the realtime and CDC engine is enabled for this project.
   * @default false
   */
  enabled?: boolean;

  /**
   * Transport bus provider (`"memory"` or `"redis"`).
   * @default "memory"
   */
  bus?: "memory" | "redis";

  /**
   * Connection URL when using Redis bus provider.
   */
  redisUrl?: string;

  /**
   * Array of Prisma model names to track (e.g. `["InternalUser", "Order", "Product"]`).
   * Only models explicitly listed in this array are tracked. If omitted or empty, no models are tracked.
   */
  tables?: RealtimeModelName<TTable>[];

  /**
   * Custom SSE endpoint path.
   * @default "/api/realtime"
   */
  ssePath?: string;
}

