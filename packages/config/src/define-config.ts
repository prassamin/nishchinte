import type {
  NishchinteConfig,
  NishchinteConfigFn,
  NishchinteConfigExport,
  ConfigEnv,
} from "./types";
import { setConfig } from "./loader";

/**
 * Type-safe configuration helper for `nishchinte.config.ts`.
 *
 * Provides full IDE autocompletion, type checking, and inline JSDoc hints
 * for all platform options including client-safe properties and email plugins.
 *
 * @param config - The static configuration object.
 * @returns The configuration object with strict type safety.
 */
export function defineConfig<T extends NishchinteConfig = NishchinteConfig>(
  config: T
): T;

/**
 * Dynamic configuration factory function.
 *
 * @param configFn - Factory function receiving `{ mode, command }` and returning configuration.
 * @returns The configuration factory function.
 */
export function defineConfig<T extends NishchinteConfig = NishchinteConfig>(
  configFn: (env: ConfigEnv) => T | Promise<T>
): (env: ConfigEnv) => T | Promise<T>;

export function defineConfig(
  configOrFn: NishchinteConfigExport
): NishchinteConfigExport {
  if (typeof configOrFn !== "function") {
    setConfig(configOrFn as NishchinteConfig);
  }
  return configOrFn;
}
