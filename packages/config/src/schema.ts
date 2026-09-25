import { z } from "zod";
import type {
  NishchinteConfig,
  ResolvedNishchinteConfig,
  ConfigEnv,
  CurrencyInfo,
} from "./types";
import { getCurrencyByCode } from "@nishchinte/currency";

/**
 * Zod schema for database configuration.
 */
export const databaseConfigSchema = z
  .union([
    z.string().min(1),
    z.object({
      url: z.string().optional(),
      adapter: z.unknown().optional(),
    }),
  ])
  .optional()
  .transform((val) => {
    // Omitted completely (undefined)
    if (!val) {
      return process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL }
        : undefined;
    }

    // Passed as a raw string -> normalize it into the object structure
    if (typeof val === "string") {
      return { url: val };
    }

    // Passed as an object -> ensure empty strings fall back to env variables
    return {
      ...val,
      url: val.url?.trim() || process.env.DATABASE_URL,
    };
  });

/**
 * Zod schema for realtime SSE configuration.
 */
export const realtimeConfigSchema = z
  .union([
    z.boolean(),
    z.object({
      enabled: z.boolean().optional().default(true),
      bus: z.enum(["memory", "redis"]).optional().default("memory"),
      redisUrl: z.string().optional(),
      tables: z.array(z.string()).optional(),
      ssePath: z.string().optional().default("/api/realtime"),
    }),
  ])
  .optional()
  .transform((val) => {
    // If omitted entirely, return undefined to keep the feature disabled
    if (val === undefined) return undefined;

    // If the user just passed a boolean (e.g., true or false)
    if (typeof val === "boolean") {
      return {
        enabled: val,
        bus: "memory" as const,
        ssePath: "/api/realtime",
      };
    }

    // If they passed an object, Zod has already applied all defaults
    return val;
  });

/**
 * Zod schema for outbound webhooks configuration.
 */
export const webhooksConfigSchema = z
  .union([
    z.boolean(),
    z.object({
      enabled: z.boolean().optional().default(true),
      maxRetries: z.number().optional().default(3),
      retryDelayMs: z.number().optional().default(1000),
      timeoutMs: z.number().optional().default(10000),
      headerName: z.string().optional().default("X-Nishchinte-Signature"),
      headers: z.record(z.string(), z.string()).optional(),
      endpoints: z.array(z.any()).optional(),
    }),
  ])
  .optional()
  .transform((val) => {
    // If omitted entirely, val is undefined. Return undefined so the feature stays disabled.
    if (val === undefined) return undefined;

    // If the user just passed a boolean (e.g., true or false)
    if (typeof val === "boolean") {
      return {
        enabled: val,
        maxRetries: 3,
        retryDelayMs: 1000,
        timeoutMs: 10000,
        headerName: "X-Nishchinte-Signature",
      };
    }

    // If they passed an object, Zod has already merged their inputs with the defaults
    return val;
  });

/**
 * Zod schema for auth session and cookie configuration.
 */
const authConfigSchema = z
  .object({
    secret: z.string().optional().default("default-insecure-secret-123456"),
    issuer: z.string().optional().default("nishchinte.platform"),
    cookieName: z
      .union([
        z.string(),
        z.object({
          admin: z.string().optional(),
          customer: z.string().optional(),
          adminRefresh: z.string().optional(),
          customerRefresh: z.string().optional(),
        }),
      ])
      .optional(),
    admin: z
      .object({
        audience: z.string().optional().default("admin"),
        defaultRole: z.string().optional().default("ADMIN"),
      })
      .optional()
      .default({ audience: "admin", defaultRole: "ADMIN" }),
    customer: z
      .object({
        mode: z
          .enum(["authless", "auth", "hybrid"])
          .optional()
          .default("hybrid"),
        otpLength: z.number().optional().default(6),
        otpExpiresInMinutes: z.number().optional().default(5),
        maxOtpAttempts: z.number().optional().default(5),
        audience: z.string().optional().default("customer"),
        routes: z
          .object({
            signIn: z.string().optional().default("/sign-in"),
            signUp: z.string().optional().default("/sign-up"),
            account: z.string().optional().default("/account"),
            checkout: z.string().optional().default("/checkout"),
          })
          .optional()
          .default({
            signIn: "/sign-in",
            signUp: "/sign-up",
            account: "/account",
            checkout: "/checkout",
          }),
        verification: z
          .object({
            required: z
              .union([
                z.array(z.string()),
                z.string().transform((v) => [v]),
              ])
              .optional()
              .default(["phone"]),
            enforceOnCheckout: z.boolean().optional().default(true),
          })
          .optional()
          .default({
            required: ["phone"],
            enforceOnCheckout: true,
          }),
      })
      .optional()
      .default({
        mode: "hybrid",
        otpLength: 6,
        otpExpiresInMinutes: 5,
        maxOtpAttempts: 5,
        audience: "customer",
        routes: {
          signIn: "/sign-in",
          signUp: "/sign-up",
          account: "/account",
          checkout: "/checkout",
        },
        verification: {
          required: ["phone"],
          enforceOnCheckout: true,
        },
      }),
    session: z
      .object({
        adminMaxAge: z.number().optional().default(604800),
        customerMaxAge: z.number().optional().default(2592000),
        accessTokenMaxAge: z.number().optional().default(900),
        refreshTokenMaxAge: z.number().optional().default(2592000),
        secure: z.boolean().optional().default(false),
      })
      .optional()
      .default({
        adminMaxAge: 604800,
        customerMaxAge: 2592000,
        accessTokenMaxAge: 900,
        refreshTokenMaxAge: 2592000,
        secure: false,
      }),
  })
  .optional()
  .transform((auth) => {
    if (!auth) return auth;
    const adminCookieName =
      (typeof auth.cookieName === "string"
        ? auth.cookieName
        : auth.cookieName?.admin) || "nishchinte.admin_session";
    const customerCookieName =
      (typeof auth.cookieName === "string"
        ? auth.cookieName
        : auth.cookieName?.customer) || "nishchinte.customer_session";
    const adminRefreshCookieName =
      (typeof auth.cookieName === "object"
        ? auth.cookieName?.adminRefresh
        : undefined) || "nishchinte.admin_refresh";
    const customerRefreshCookieName =
      (typeof auth.cookieName === "object"
        ? auth.cookieName?.customerRefresh
        : undefined) || "nishchinte.customer_refresh";

    return {
      ...auth,
      cookieName: {
        admin: adminCookieName,
        customer: customerCookieName,
        adminRefresh: adminRefreshCookieName,
        customerRefresh: customerRefreshCookieName,
      },
    };
  });

/**
 * Parses a byte count number or human-readable file size string (e.g. "25MB", "5MB", "1GB", "500KB") into bytes.
 */
export function parseByteSize(
  value: number | string,
  fallback: number = 5 * 1024 * 1024,
): number {
  if (typeof value === "number") {
    return value > 0 ? value : fallback;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(
      /^(\d+(?:\.\d+)?)\s*(b|kb|k|mb|m|gb|g|tb|t)?$/i,
    );
    if (!match) return fallback;
    const num = parseFloat(match[1]);
    const unit = (match[2] || "b").toLowerCase();
    switch (unit) {
      case "k":
      case "kb":
        return Math.round(num * 1024);
      case "m":
      case "mb":
        return Math.round(num * 1024 * 1024);
      case "g":
      case "gb":
        return Math.round(num * 1024 * 1024 * 1024);
      case "t":
      case "tb":
        return Math.round(num * 1024 * 1024 * 1024 * 1024);
      case "b":
      default:
        return Math.round(num);
    }
  }
  return fallback;
}

/**
 * Master Zod schema for NishchinteConfig.
 */
export const nishchinteConfigSchema = z
  .object({
    baseUrl: z
      .string()
      .optional()
      .transform((val) => {
        const raw =
          val ||
          process.env.NEXT_PUBLIC_APP_URL ||
          process.env.APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
          "http://localhost:3000";
        return raw.replace(/\/+$/, "");
      }),
    originHeaderName: z.string().default("x-origin"),
    currentUrlHeaderName: z.string().default("x-current-url"),
    currentPathHeaderName: z.string().default("x-current-path"),
    fileSizeLimit: z
      .union([z.number().positive(), z.string().min(1)])
      .optional()
      .default(5 * 1024 * 1024)
      .transform((val) => parseByteSize(val, 5 * 1024 * 1024)),
    videoAllowed: z.boolean().optional().default(false),
    currency: z
      .string()
      .min(1)
      .optional()
      .default("BDT")
      .transform((val) => getCurrencyByCode(val) ?? getCurrencyByCode("BDT")!),
    otpCooldownSeconds: z.number().positive().optional().default(60),
    database: databaseConfigSchema,
    auth: authConfigSchema,
    email: z.any().optional(),
    sms: z.any().optional(),
    storage: z.any().optional(),
    realtime: realtimeConfigSchema,
    webhooks: webhooksConfigSchema,
    adminPanel: z.any().optional(),
    client: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

/**
 * Resolves a raw {@link NishchinteConfig} into a fully validated {@link NishchinteConfig} with Zod.
 *
 * @param userConfig - The raw user-defined configuration object.
 * @param env - The execution environment options (e.g. `{ mode: "development" }`).
 * @returns Resolved configuration.
 */
export function resolveConfig(
  userConfig: Partial<NishchinteConfig> = {},
  _env?: ConfigEnv,
): ResolvedNishchinteConfig {
  const parsed = nishchinteConfigSchema.safeParse(userConfig);

  const hasSms = Boolean(userConfig.sms);
  const hasEmail = Boolean(userConfig.email);
  const hasStorage = Boolean(userConfig.storage);
  const customerAuthMode = userConfig.auth?.customer?.mode || "hybrid";

  if (!parsed.success) {
    console.warn(
      "⚠️ [Nishchinte Config] Config validation warnings:",
      parsed.error.format(),
    );
    return {
      ...(userConfig as any),
      hasSms,
      hasEmail,
      hasStorage,
      customerAuthMode,
    } as ResolvedNishchinteConfig;
  }

  const resolved = {
    ...parsed.data,
    hasSms,
    hasEmail,
    hasStorage,
    customerAuthMode,
  } as ResolvedNishchinteConfig;

  // Validate Verification Channels vs Transport Clients
  const isAuthless = customerAuthMode === "authless";
  const explicitRequired = userConfig.auth?.customer?.verification?.required;
  const rawRequired =
    explicitRequired !== undefined
      ? explicitRequired
      : resolved.auth?.customer?.verification?.required;

  if (!isAuthless && rawRequired !== undefined) {
    const requiredList = Array.isArray(rawRequired)
      ? rawRequired
      : [rawRequired];

    const requiresPhone = requiredList.includes("phone");
    const requiresEmail = requiredList.includes("email");
    const requiresAny = requiredList.includes("any");

    if (requiresPhone && !hasSms) {
      throw new Error(
        `[Nishchinte Config] Verification mode specifies "phone" in 'auth.customer.verification.required', but no SMS client/plugin is provided under 'sms' in nishchinte.config.ts.\n` +
          `➡️  Please configure an SMS plugin (e.g. sms: zendSms({ ... })) or remove "phone" from 'verification.required'.`,
      );
    }

    if (requiresEmail && !hasEmail) {
      throw new Error(
        `[Nishchinte Config] Verification mode specifies "email" in 'auth.customer.verification.required', but no Email client/plugin is provided under 'email' in nishchinte.config.ts.\n` +
          `➡️  Please configure an Email plugin (e.g. email: resendEmail({ ... })) or remove "email" from 'verification.required'.`,
      );
    }

    if (requiresAny && !hasSms && !hasEmail) {
      throw new Error(
        `[Nishchinte Config] Verification mode specifies "any" in 'auth.customer.verification.required', but neither SMS nor Email client/plugin is provided in nishchinte.config.ts.\n` +
          `➡️  Please configure an SMS or Email plugin under 'sms' or 'email'.`,
      );
    }
  }

  return resolved;
}
