import type React from "react";
import type { EmailPlugin, EmailClient } from "@nishchinte/email";
import type { SmsPlugin, SmsClient } from "@nishchinte/sms";
import type { StoragePlugin, StorageClient } from "@nishchinte/storage";
import type { CurrencyCode, CurrencyInfo } from "@nishchinte/currency";

export type { CurrencyCode, CurrencyInfo };

/**
 * The list of internally defined keys to pick from NishchinteConfig for the client.
 */
export const clientKeys = [
  "baseUrl",
  "originHeaderName",
  "currentUrlHeaderName",
  "currentPathHeaderName",
  "fileSizeLimit",
  "videoAllowed",
  "currency",
  "otpCooldownSeconds",
  "hasSms",
  "hasEmail",
  "hasStorage",
  "customerAuthMode",
] as const satisfies readonly (keyof Omit<NishchinteConfig, "client">)[];

export type ClientKey = (typeof clientKeys)[number];

export type CustomClientConfig = {
  [key: string]: unknown;
};

/**
 * Sanitized, client-safe configuration object.
 */
export type ClientConfig = Pick<
  ResolvedNishchinteConfig,
  (typeof clientKeys)[number] & keyof ResolvedNishchinteConfig
> &
  CustomClientConfig;

/**
 * Database connection configuration options.
 */
export interface DatabaseConfig {
  /**
   * Database connection URL string.
   *
   * @example "mysql://user:password@localhost:3306/nishchinte"
   * @example "postgresql://user:password@localhost:5432/nishchinte"
   */
  url?: string;

  /**
   * Custom Prisma driver adapter instance (e.g. `PrismaMariaDb`, `PrismaPg`, etc.).
   */
  adapter?: unknown;
}

/**
 * Master configuration schema for `nishchinte.config.ts`.
 *
 * All platform configuration options (both server-only plugins and client-safe properties)
 * are defined in this single master interface.
 *
 * @example
 * ```typescript
 * import { defineConfig } from "@nishchinte/config";
 * import { resendEmail } from "@nishchinte/email";
 * import { localStorage } from "@nishchinte/storage";
 * import { jwtAuth } from "@nishchinte/auth";
 * import { realtime, webhooks } from "@nishchinte/realtime";
 *
 * export default defineConfig({
 *   database: { url: process.env.DATABASE_URL },
 *   auth: jwtAuth({ secret: process.env.AUTH_SECRET }),
 *   email: resendEmail({ apiKey: process.env.RESEND_API_KEY }),
 *   storage: localStorage(),
 *   realtime: realtime({ enabled: true, tables: ["InternalUser"] }),
 *   webhooks: webhooks({ enabled: true, endpoints: [...] }),
 * });
 * ```
 */
export interface NishchinteConfig {
  /**
   * Base URL of the application (e.g. "http://localhost:3000" or "https://mystore.com").
   * Required for resolving absolute public URLs across local storage, auth redirects, and webhooks.
   *
   * @example "http://localhost:3000"
   * @example "https://example.com"
   */
  baseUrl: string;

  /**
   * Server-only database connection configuration.
   *
   * Accepts a connection URL string or a structured {@link DatabaseConfig} object.
   *
   * @example
   * ```typescript
   * export default defineConfig({
   *   database: {
   *     url: process.env.DATABASE_URL,
   *   },
   * });
   * ```
   */
  database?: DatabaseConfig | string;

  /**
   * Server-only email transport plugin or initialized email client.
   *
   * Accepts any `@nishchinte/email` plugin (`smtpEmail`, `resendEmail`, `consoleEmail`)
   * or a custom `EmailPlugin` / `EmailClient` implementation.
   *
   * @example
   * ```typescript
   * email: resendEmail({
   *   apiKey: process.env.RESEND_API_KEY,
   *   from: "Store <noreply@example.com>",
   * })
   * ```
   */
  email?: EmailPlugin | EmailClient;

  /**
   * Server-only SMS transport plugin or initialized SMS client.
   *
   * Accepts any `@nishchinte/sms` plugin (`consoleSms`, `alphaSms`, `greenwebSms`, `bulkSmsBdSms`, `bulkSmsDhakaSms`, `sslWirelessSms`, `mimSms`, `esmsSms`, `quickSms`, `zendSms`)
   * or a custom `SmsPlugin` / `SmsClient` implementation.
   *
   * @example
   * ```typescript
   * sms: consoleSms()
   * ```
   */
  sms?: SmsPlugin | SmsClient;

  /**
   * Server-only storage driver plugin or initialized storage client.
   *
   * Accepts any `@nishchinte/storage` plugin (`s3Storage`, `r2Storage`, `supabaseStorage`, `localStorage`, `memoryStorage`)
   * or a custom `StoragePlugin` / `StorageClient` implementation.
   *
   * @example
   * ```typescript
   * storage: localStorage({ basePath: "./uploads" })
   * ```
   */
  storage?: StoragePlugin | StorageClient;

  /**
   * Server-only authentication and session configuration.
   *
   * Accepts an {@link AuthConfig} object or configured auth plugin.
   *
   * @example
   * ```typescript
   * export default defineConfig({
   *   auth: jwtAuth({
   *     secret: process.env.AUTH_SECRET,
   *     session: { adminMaxAge: 604800 },
   *   }),
   * });
   * ```
   */
  auth?: AuthConfig;

  /**
   * Realtime event broadcasting configuration (SSE).
   *
   * Only models explicitly declared in `tables` will be tracked by the CDC engine.
   *
   * @example
   * ```typescript
   * export default defineConfig({
   *   realtime: realtime({
   *     enabled: true,
   *     tables: ["InternalUser", "Order"],
   *   }),
   * });
   * ```
   */
  realtime?: RealtimeConfig | boolean;

  /**
   * Outbound Webhook dispatching configuration.
   *
   * Configures subscriber endpoints, retry backoff policies, signature headers, and table filters.
   *
   * @example
   * ```typescript
   * export default defineConfig({
   *   webhooks: webhooks({
   *     enabled: true,
   *     endpoints: [
   *       {
   *         id: "slack-sync",
   *         url: "https://example.com/webhook",
   *         secret: process.env.WEBHOOK_SECRET,
   *         tables: ["InternalUser"],
   *         events: ["UPDATE"],
   *       },
   *     ],
   *   }),
   * });
   * ```
   */
  webhooks?: WebhooksConfig | boolean;

  /**
   * Admin panel plugin or custom route configuration.
   *
   * If omitted, no admin panel will exist in the application.
   *
   * @example
   * ```typescript
   * import { defaultAdminPanel } from "@nishchinte/admin-panel";
   *
   * export default defineConfig({
   *   adminPanel: defaultAdminPanel(),
   * });
   * ```
   */
  adminPanel?: AdminPanelConfig;

  /**
   * Define custom public settings for the client.
   *
   * Properties defined here are sanitized and safely exposed to client components via `<ConfigProvider>` and `useConfig()`.
   *
   * @example
   * ```typescript
   * export default defineConfig({
   *   client: {
   *     storeName: "My Store",
   *     currency: "USD",
   *     analyticsId: "G-12345",
   *   },
   * });
   * ```
   */
  client?: CustomClientConfig;

  /**
   * Custom request header name used to determine the request origin.
   * @default "x-origin"
   */
  originHeaderName?: string;

  /**
   * Custom request header name used to forward the full current URL.
   * @default "x-current-url"
   */
  currentUrlHeaderName?: string;

  /**
   * Custom request header name used to forward the current request pathname.
   * @default "x-current-path"
   */
  currentPathHeaderName?: string;

  /**
   * Maximum allowed file size for uploads in bytes or human-readable format (e.g. `25 * 1024 * 1024`, `"25MB"`, `"10MB"`).
   * @default 5242880 (5MB)
   */
  fileSizeLimit?: number | string;

  /**
   * Whether video uploads and embeds are allowed.
   * @default false
   */
  videoAllowed?: boolean;

  /**
   * Currency code for the store (e.g. "BDT", "USD", "EUR").
   * @default "BDT"
   */
  currency?: CurrencyCode;

  /**
   * Minimum cooldown period between OTP resend requests in seconds.
   * Available globally and exposed to the client.
   * @default 60
   */
  otpCooldownSeconds?: number;

  /**
   * Any additional configuration options.
   */
  [key: string]: unknown;
}

/**
 * Environment context passed to functional configuration definitions.
 */
export interface ConfigEnv {
  /**
   * Current execution mode.
   * @example "development", "production", "test"
   */
  mode: "development" | "production" | "test";

  /**
   * Running CLI command if known.
   * @example "dev", "build", "start"
   */
  command?: "dev" | "build" | "start";
}

/**
 * Functional configuration callback supporting dynamic / asynchronous resolution.
 */
export type NishchinteConfigFn = (
  env: ConfigEnv,
) => NishchinteConfig | Promise<NishchinteConfig>;

/**
 * Supported exports for `nishchinte.config.ts`.
 */
export type NishchinteConfigExport =
  | NishchinteConfig
  | NishchinteConfigFn
  | Promise<NishchinteConfig>;

/**
 * Resolved Database configuration after applying environment defaults.
 */
export interface ResolvedDatabaseConfig {
  url?: string;
  adapter?: unknown;
  [key: string]: unknown;
}

export type CustomerAuthMode = "authless" | "auth" | "hybrid";

export interface CustomerAuthRoutesConfig {
  /**
   * Sign-in page path.
   * @default "/sign-in"
   */
  signIn?: string;
  /**
   * Sign-up page path.
   * @default "/sign-up"
   */
  signUp?: string;
  /**
   * Customer account portal base path.
   * @default "/account"
   */
  account?: string;
  /**
   * Checkout page path.
   * @default "/checkout"
   */
  checkout?: string;
}

/**
 * Session lifetime and cookie naming configuration.
 */
export interface AuthSessionConfig {
  /**
   * Maximum age of admin session in seconds.
   * @default 604800 (7 days)
   */
  adminMaxAge?: number;

  /**
   * Maximum age of customer session in seconds.
   * @default 2592000 (30 days)
   */
  customerMaxAge?: number;

  /**
   * Short-lived Access Token max age in seconds (JWT).
   * @default 900 (15 minutes)
   */
  accessTokenMaxAge?: number;

  /**
   * Long-lived Refresh Token max age in seconds.
   * @default 2592000 (30 days)
   */
  refreshTokenMaxAge?: number;

  /**
   * Whether cookies must only be transmitted over HTTPS.
   * @default false
   */
  secure?: boolean;
}

/**
 * Admin-specific auth configuration.
 */
export interface AdminAuthConfig {
  /**
   * Default role assigned during sign up.
   * @default "ADMIN"
   */
  defaultRole?: string;

  /**
   * JWT audience.
   * @default "admin"
   */
  audience?: string;
}

/**
 * Customer-specific auth configuration.
 */
export interface CustomerAuthConfig {
  /**
   * Customer auth mode for storefront:
   * - `authless`: No customer auth/login in storefront. 100% frictionless guest checkout. All /account routes disabled.
   * - `auth`: Strict customer authentication. Registration/login is mandatory before checkout or accessing account areas.
   * - `hybrid`: Flexible standard mode. Customers can optionally register/login, but guest checkout is fully supported.
   * @default "hybrid"
   */
  mode?: CustomerAuthMode;

  /**
   * Length of numeric OTP codes.
   * @default 6
   */
  otpLength?: number;

  /**
   * OTP validity period in minutes.
   * @default 5
   */
  otpExpiresInMinutes?: number;

  /**
   * Maximum allowed verification attempts before OTP is invalidated.
   * @default 5
   */
  maxOtpAttempts?: number;

  /**
   * JWT audience.
   * @default "customer"
   */
  audience?: string;

  /**
   * Storefront route path mappings.
   */
  routes?: CustomerAuthRoutesConfig;

  /**
   * Identity verification rules and checkout enforcement policy.
   */
  verification?: CustomerVerificationConfig;
}

/**
 * Supported verification channels / providers for customer identity.
 * Provides IDE autocompletion for "phone", "email", and "any" while allowing custom providers.
 */
export type CustomerVerificationChannel = "phone" | "email" | "any" | (string & {});

/**
 * Storefront identity verification rules.
 */
export interface CustomerVerificationConfig {
  /**
   * Required verified provider identities for a customer to be considered verified by the store.
   * Supports `"phone"`, `"email"`, `"any"`, or an array e.g. `["phone"]`, `["email"]`, `["phone", "email"]`.
   * @default ["phone"]
   */
  required?: CustomerVerificationChannel[] | CustomerVerificationChannel;

  /**
   * Whether to enforce verified status before allowing customer checkout.
   * When true, unverified customer accounts cannot place orders until their required identities are verified.
   * @default true
   */
  enforceOnCheckout?: boolean;
}

/**
 * Pluggable Authentication configuration schema for `nishchinte.config.ts`.
 */
export interface AuthConfig {
  /**
   * Secret key used for signing JWT sessions.
   */
  secret?: string;

  /**
   * JWT token issuer.
   * @default "nishchinte.platform"
   */
  issuer?: string;

  /**
   * Custom cookie name or cookie names configuration.
   * @defaults `nishchinte.admin_session` and `nishchinte.customer_session`.
   */
  cookieName?:
    | string
    | {
        /**
         * Admin-specific cookie name.
         * @default "nishchinte.admin_session"
         */
        admin?: string;

        /**
         * Customer-specific cookie name.
         * @default "nishchinte.customer_session"
         */
        customer?: string;

        /**
         * Customer refresh token cookie name.
         * @default "nishchinte.customer_refresh"
         */
        customerRefresh?: string;

        /**
         * Admin refresh token cookie name.
         * @default "nishchinte.admin_refresh"
         */
        adminRefresh?: string;
      };

  /**
   * Session and cookie lifetime configuration.
   */
  session?: AuthSessionConfig;

  /**
   * Admin-specific auth configuration.
   */
  admin?: AdminAuthConfig;

  /**
   * Customer-specific auth configuration.
   */
  customer?: CustomerAuthConfig;

  /**
   * Edge/Proxy middleware handler attached to this auth provider.
   */
  middleware?: any;
}

/**
 * Resolved Auth session, cookies, and roles configuration.
 */
export interface ResolvedAuthConfig {
  secret: string;
  issuer: string;
  cookieName: {
    admin: string;
    customer: string;
    customerRefresh: string;
    adminRefresh: string;
  };
  session: {
    adminMaxAge: number;
    customerMaxAge: number;
    accessTokenMaxAge: number;
    refreshTokenMaxAge: number;
    secure: boolean;
  };
  admin: {
    defaultRole: string;
    audience: string;
  };
  customer: {
    mode: CustomerAuthMode;
    audience: string;
    otpLength: number;
    otpExpiresInMinutes: number;
    maxOtpAttempts: number;
    routes: {
      signIn: string;
      signUp: string;
      account: string;
      checkout: string;
    };
    verification: {
      required: CustomerVerificationChannel[];
      enforceOnCheckout: boolean;
      allowUnverifiedOrders: boolean;
    };
  };
  [key: string]: unknown;
}

/**
 * Resolved Realtime SSE configuration.
 */
export interface ResolvedRealtimeConfig<TTable extends string = string> {
  enabled: boolean;
  bus?: "memory" | "redis";
  redisUrl?: string;
  tables?: RealtimeModelName<TTable>[];
  ssePath?: string;
  [key: string]: unknown;
}

/**
 * Resolved Webhooks dispatching configuration.
 */
export interface ResolvedWebhooksConfig<TTable extends string = string> {
  enabled: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  headerName?: string;
  headers?: Record<string, string>;
  endpoints?: WebhookEndpoint<TTable>[];
  [key: string]: unknown;
}

/**
 * Fully resolved and normalized configuration object.
 * Returned after schema validation and defaults application.
 */
export interface ResolvedNishchinteConfig {
  /**
   * Fully normalized Base URL without trailing slash (e.g. "http://localhost:3000").
   */
  baseUrl: string;

  /**
   * Origin header name (defaults to "x-origin").
   */
  originHeaderName: string;

  /**
   * Current URL header name (defaults to "x-current-url").
   */
  currentUrlHeaderName: string;

  /**
   * Current path header name (defaults to "x-current-path").
   */
  currentPathHeaderName: string;

  /**
   * Maximum allowed file size for uploads in bytes.
   */
  fileSizeLimit: number;

  /**
   * Whether video uploads and embeds are allowed.
   */
  videoAllowed: boolean;

  /**
   * Currency code for the store (e.g. "BDT", "USD", "EUR").
   */
  currency: CurrencyInfo;

  /**
   * Minimum cooldown period between OTP resend requests in seconds.
   * Accessible globally on server and client.
   * @default 60
   */
  otpCooldownSeconds: number;

  /**
   * Whether an SMS transport plugin is configured and available.
   */
  hasSms: boolean;

  /**
   * Whether an Email transport plugin is configured and available.
   */
  hasEmail: boolean;

  /**
   * Whether a Storage driver plugin is configured and available.
   */
  hasStorage: boolean;

  /**
   * Active Customer authentication mode ("authless" | "auth" | "hybrid").
   */
  customerAuthMode: CustomerAuthMode;

  /**
   * Resolved database connection options.
   */
  database?: ResolvedDatabaseConfig;

  /**
   * Resolved email transport plugin or initialized client.
   */
  email?: EmailPlugin | EmailClient;

  /**
   * Resolved SMS transport plugin or initialized client.
   */
  sms?: SmsPlugin | SmsClient;

  /**
   * Resolved storage driver plugin or initialized client.
   */
  storage?: StoragePlugin | StorageClient;

  /**
   * Resolved authentication and session configuration.
   */
  auth?: ResolvedAuthConfig;

  /**
   * Resolved realtime event broadcasting configuration.
   */
  realtime?: ResolvedRealtimeConfig;

  /**
   * Resolved outbound webhook dispatching configuration.
   */
  webhooks?: ResolvedWebhooksConfig;

  /**
   * Sanitized public client configuration.
   */
  client?: CustomClientConfig;

  /**
   * Any additional configuration properties.
   */
  [key: string]: unknown;
}

/**
 * Options for locating and loading the configuration file.
 */
export interface LoadConfigOptions {
  /**
   * Working directory from which to locate `nishchinte.config.ts`.
   * @default process.cwd()
   */
  cwd?: string;

  /**
   * Explicit path to configuration file (overrides auto-discovery).
   */
  configFile?: string;

  /**
   * Environment context overrides.
   */
  env?: Partial<ConfigEnv>;
}

/**
 * Props accepted by the `<ConfigProvider>` React component.
 */
export interface ConfigProviderProps<T extends ClientConfig = ClientConfig> {
  /**
   * The sanitized client configuration object (typically passed from a Server Layout via `getClientConfig()`).
   */
  value: T;

  /**
   * Child React components that will have access to `useConfig()`.
   */
  children: React.ReactNode;
}

/**
 * Global model registry for autocomplete in configuration and realtime channels.
 * Can be augmented by `@nishchinte/db` or custom declarations.
 */
export interface NishchinteModelRegistry {
  // Augmentable via declaration merging
}

/**
 * Autocomplete-friendly string union helper.
 * Provides IDE autocompletion for known literal strings while allowing any custom string.
 */
export type AutoCompleteString<T extends string> = T | (string & {});

/**
 * Autocomplete-enabled Prisma / DB Model Name type.
 */
export type RealtimeModelName<T extends string = string> = AutoCompleteString<
  keyof NishchinteModelRegistry extends never
    ? T
    : keyof NishchinteModelRegistry | T
>;

/**
 * Realtime database operation mutation types.
 */
export type RealtimeOperationType = "INSERT" | "UPDATE" | "DELETE" | "*";

/**
 * Autocomplete-enabled Webhook Event Pattern.
 * Supports wildcards (`*`, `*.*`, `Model.*`, `*.INSERT`), operation types (`INSERT`, `UPDATE`, `DELETE`), specific mutations (`Model.INSERT`, `Model.UPDATE`), or custom event names.
 */
export type WebhookEventPattern<T extends string = string> = AutoCompleteString<
  | "*"
  | "*.*"
  | RealtimeOperationType
  | `*.${RealtimeOperationType}`
  | `${RealtimeModelName<T>}.*`
  | `${RealtimeModelName<T>}.${RealtimeOperationType}`
>;

/**
 * Outbound Webhook dispatching configuration.
 */
export interface WebhooksConfig<TTable extends string = string> {
  /**
   * Whether webhook dispatching is enabled.
   * @default true
   */
  enabled?: boolean;

  /**
   * Maximum delivery retry attempts.
   * @default 3
   */
  maxRetries?: number;

  /**
   * Base delay between retries in milliseconds.
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
   * Static or pre-configured webhook subscriber endpoints.
   */
  endpoints?: WebhookEndpoint<TTable>[];
}

export type WebhookConfig<TTable extends string = string> =
  WebhooksConfig<TTable>;

/**
 * Webhook subscriber endpoint definition.
 */
export interface WebhookEndpoint<TTable extends string = string> {
  /**
   * Unique identifier for this endpoint.
   * If omitted, a unique ID will be auto-generated.
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
 * Realtime and CDC configuration for `nishchinte.config.ts`.
 */
export interface RealtimeConfig<TTable extends string = string> {
  /**
   * Whether the realtime and CDC engine is enabled for this project.
   * @default true
   */
  enabled?: boolean;

  /**
   * Transport bus provider.
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

/**
 * Admin Panel Plugin interface for `nishchinte.config.ts`.
 */
export interface AdminPanelPlugin {
  name?: string;
  routes?: any[];
  middleware?: any;
  [key: string]: unknown;
}

/**
 * Admin Panel configuration options.
 */
export type AdminPanelConfig =
  | AdminPanelPlugin
  | (() => any)
  | any;
