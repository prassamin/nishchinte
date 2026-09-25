import type { AuthConfig } from "@nishchinte/config";
import { updateAuthSession } from "./server/middleware";

/**
 * Type-safe configuration helper for `nishchinte.config.ts`.
 * Automatically registers the Edge auth middleware on `config.auth.middleware`.
 *
 * @example
 * ```typescript
 * import { defineConfig } from "@nishchinte/config";
 * import { defineJwtAuthConfig } from "@nishchinte/auth";
 *
 * export default defineConfig({
 *   auth: defineJwtAuthConfig({
 *     secret: process.env.AUTH_SECRET,
 *   }),
 * });
 * ```
 */
export function defineJwtAuthConfig(config: AuthConfig = {}): AuthConfig {
  return {
    ...config,
    middleware: updateAuthSession,
  };
}
