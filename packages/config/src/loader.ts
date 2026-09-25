import { resolveConfig } from "./schema";
import { clientKeys } from "./types";
import type {
  NishchinteConfigFn,
  NishchinteConfig,
  ClientConfig,
  LoadConfigOptions,
  ConfigEnv,
  ResolvedNishchinteConfig,
} from "./types";

const CONFIG_CANDIDATES = [
  "nishchinte.config.ts",
  "nishchinte.config.js",
  "nishchinte.config.mjs",
  "nishchinte.config.cjs",
];

declare global {
  // eslint-disable-next-line no-var
  var __nishchinte_config__: ResolvedNishchinteConfig | undefined;
  // eslint-disable-next-line no-var
  var __nishchinte_config_mtime__: number | undefined;
  // eslint-disable-next-line no-var
  var __nishchinte_config_last_check__: number | undefined;
  // eslint-disable-next-line no-var
  var __nishchinte_config_path__: string | null | undefined;
  // eslint-disable-next-line no-var
  var __nishchinte_config_version__: number | undefined;
}

function isBrowserEnv(): boolean {
  return (
    typeof window !== "undefined" ||
    typeof document !== "undefined" ||
    (typeof process !== "undefined" && process.env?.NEXT_RUNTIME === "edge")
  );
}

function getNodeModule(): any {
  if (isBrowserEnv()) return null;

  const modName = "node" + ":module";

  if (
    typeof process !== "undefined" &&
    typeof (process as any).getBuiltinModule === "function"
  ) {
    try {
      return (process as any).getBuiltinModule(modName);
    } catch {}
  }

  try {
    const nativeRequire = Function(
      "return typeof require !== 'undefined' ? require : undefined",
    )();
    if (typeof nativeRequire === "function") {
      return nativeRequire(modName);
    }
  } catch {}

  return null;
}

function getNodeFs(): any {
  if (isBrowserEnv()) return null;

  const fsName = "node" + ":fs";

  if (
    typeof process !== "undefined" &&
    typeof (process as any).getBuiltinModule === "function"
  ) {
    try {
      const fs = (process as any).getBuiltinModule(fsName);
      if (fs) return fs;
    } catch {}
  }

  try {
    const mod = getNodeModule();
    if (mod?.createRequire) {
      const cwd =
        typeof process !== "undefined" && typeof process.cwd === "function"
          ? process.cwd()
          : "/";
      return mod.createRequire(cwd + "/index.js")(fsName);
    }
  } catch {}

  return null;
}

function getNodePath(): any {
  if (isBrowserEnv()) return null;

  const pathName = "node" + ":path";

  if (
    typeof process !== "undefined" &&
    typeof (process as any).getBuiltinModule === "function"
  ) {
    try {
      const path = (process as any).getBuiltinModule(pathName);
      if (path) return path;
    } catch {}
  }

  try {
    const mod = getNodeModule();
    if (mod?.createRequire) {
      const cwd =
        typeof process !== "undefined" && typeof process.cwd === "function"
          ? process.cwd()
          : "/";
      return mod.createRequire(cwd + "/index.js")(pathName);
    }
  } catch {}

  return null;
}

function getJitiLoader(): any {
  if (isBrowserEnv()) return null;

  const jitiName = "ji" + "ti";

  try {
    const mod = getNodeModule();
    if (mod?.createRequire) {
      const cwd =
        typeof process !== "undefined" && typeof process.cwd === "function"
          ? process.cwd()
          : "/";
      const req = mod.createRequire(cwd + "/index.js");
      const jitiMod = req(jitiName);
      return jitiMod.createJiti || jitiMod.default?.createJiti || jitiMod;
    }
  } catch {}

  return null;
}

/**
 * Searches for a configuration file in the specified directory or its parent directories.
 */
export function findConfigFile(cwd?: string): string | null {
  const fs = getNodeFs();
  const path = getNodePath();
  if (!fs || !path) return null;

  try {
    const startCwd =
      cwd ||
      (typeof process !== "undefined" && typeof process.cwd === "function"
        ? process.cwd()
        : "/");
    let currentDir = path.resolve(startCwd);

    while (true) {
      for (const filename of CONFIG_CANDIDATES) {
        const candidatePath = path.join(currentDir, filename);
        if (fs.existsSync(candidatePath)) {
          return candidatePath;
        }
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
  } catch {}

  return null;
}

/**
 * Synchronously loads and resolves configuration from a file path using jiti.
 */
function loadConfigSync(filePath: string): Partial<NishchinteConfig> {
  const path = getNodePath();
  const createJitiFn = getJitiLoader();
  if (!createJitiFn || !path) return {};

  try {
    // Purge module cache for workspace packages and config dependencies so hot reloads reflect immediately
    if (typeof require !== "undefined" && require.cache) {
      for (const key of Object.keys(require.cache)) {
        if (
          key.includes("@nishchinte") ||
          key.includes("nishchinte") ||
          key.includes(path.dirname(filePath))
        ) {
          delete require.cache[key];
        }
      }
    }

    const callerPath =
      typeof process !== "undefined" && typeof process.cwd === "function"
        ? process.cwd()
        : filePath;
    const jiti = createJitiFn(callerPath, {
      moduleCache: false,
      fsCache: false,
    });
    const mod = jiti(filePath);
    const configExport = mod.default || mod.config || mod;
    return typeof configExport === "function"
      ? configExport({
          mode:
            typeof process !== "undefined" &&
            process.env.NODE_ENV === "production"
              ? "production"
              : "development",
        })
      : configExport;
  } catch (error: any) {
    console.warn(
      `⚠️ [Nishchinte Config] Failed to load "${filePath}" with jiti, falling back to defaults. Reason:`,
      error?.message || error,
    );
    return {};
  }
}

/**
 * Asynchronously loads and resolves the project configuration from `nishchinte.config.ts`.
 *
 * @param options - Configuration loader options.
 * @returns Fully resolved configuration with all defaults applied.
 */
export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<ResolvedNishchinteConfig> {
  const fs = getNodeFs();
  const cwd =
    options.cwd ||
    (typeof process !== "undefined" && typeof process.cwd === "function"
      ? process.cwd()
      : "/");
  const filePath = options.configFile || findConfigFile(cwd);
  const env: ConfigEnv = {
    mode:
      options.env?.mode ||
      (typeof process !== "undefined" && process.env.NODE_ENV === "production"
        ? "production"
        : typeof process !== "undefined" && process.env.NODE_ENV === "test"
          ? "test"
          : "development"),
    command: options.env?.command,
  };

  if (!filePath) {
    // Zero-config mode: Return defaults
    const resolved = resolveConfig({}, env);
    globalThis.__nishchinte_config__ = resolved;
    return resolved;
  }

  const createJitiFn = getJitiLoader();
  if (!createJitiFn) {
    const resolved = resolveConfig({}, env);
    globalThis.__nishchinte_config__ = resolved;
    return resolved;
  }

  try {
    // Dynamic import config module via jiti
    const callerPath =
      typeof process !== "undefined" && typeof process.cwd === "function"
        ? process.cwd()
        : filePath;
    const jiti = createJitiFn(callerPath, {
      moduleCache: false,
      fsCache: false,
    });
    const importedModule = jiti(filePath);
    const configExport =
      importedModule.default || importedModule.config || importedModule;

    let rawConfig: NishchinteConfig;

    if (typeof configExport === "function") {
      rawConfig = await (configExport as NishchinteConfigFn)(env);
    } else {
      rawConfig = await Promise.resolve(configExport);
    }

    const resolved = resolveConfig(rawConfig, env);
    globalThis.__nishchinte_config__ = resolved;
    globalThis.__nishchinte_config_version__ =
      (globalThis.__nishchinte_config_version__ || 0) + 1;
    try {
      if (fs) {
        globalThis.__nishchinte_config_mtime__ = fs.statSync(filePath).mtimeMs;
      }
      globalThis.__nishchinte_config_path__ = filePath;
      globalThis.__nishchinte_config_last_check__ = Date.now();
    } catch {}
    return resolved;
  } catch (error: any) {
    if (error?.message?.includes("[Nishchinte Config]")) {
      throw error;
    }
    console.warn(
      `⚠️ [Nishchinte Config] Failed to load "${filePath}", falling back to defaults. Reason:`,
      error?.message || error,
    );
    const resolved = resolveConfig({}, env);
    globalThis.__nishchinte_config__ = resolved;
    globalThis.__nishchinte_config_version__ =
      (globalThis.__nishchinte_config_version__ || 0) + 1;
    return resolved;
  }
}

/**
 * Options for `getConfig()`.
 */
export interface GetConfigOptions {
  /** Force reloading the configuration file from disk / module graph rather than returning cached state */
  reload?: boolean;
}

/**
 * Synchronously retrieves the resolved configuration.
 *
 * In development, supports dynamic hot-reloading changes without restarting the server.
 *
 * @param options - Optional config retrieval options (e.g. `{ reload: true }`).
 * @returns The active {@link NishchinteConfig}.
 *
 * @example
 * ```typescript
 * import { getConfig } from "@nishchinte/config";
 *
 * const config = getConfig();
 * await config.email.send({ to: "...", subject: "...", html: "..." });
 * ```
 */
export function getConfig(
  options?: GetConfigOptions,
): ResolvedNishchinteConfig {
  const isDev =
    typeof process !== "undefined" && process.env.NODE_ENV !== "production";
  const now = Date.now();

  // If already loaded and in production, return immediately without any FS access
  if (!isDev && !options?.reload && globalThis.__nishchinte_config__) {
    return globalThis.__nishchinte_config__;
  }

  // In development: Check if reload requested or if debounced check interval elapsed
  const shouldReload =
    options?.reload === true || !globalThis.__nishchinte_config__;
  const lastCheck = globalThis.__nishchinte_config_last_check__ || 0;
  const shouldCheckFile = shouldReload || (isDev && now - lastCheck >= 200);

  if (shouldCheckFile) {
    globalThis.__nishchinte_config_last_check__ = now;
    const fs = getNodeFs();
    const filePath = globalThis.__nishchinte_config_path__ || findConfigFile();

    if (filePath && fs) {
      try {
        const stats = fs.statSync(filePath);
        const mtime = stats.mtimeMs;

        // If reload requested or file was modified or not loaded yet
        if (
          shouldReload ||
          !globalThis.__nishchinte_config__ ||
          mtime !== globalThis.__nishchinte_config_mtime__
        ) {
          const raw = loadConfigSync(filePath);
          globalThis.__nishchinte_config__ = resolveConfig(raw);
          globalThis.__nishchinte_config_version__ =
            (globalThis.__nishchinte_config_version__ || 0) + 1;
          globalThis.__nishchinte_config_mtime__ = mtime;
          globalThis.__nishchinte_config_path__ = filePath;
        }
      } catch {
        if (!globalThis.__nishchinte_config__) {
          globalThis.__nishchinte_config__ = resolveConfig({});
          globalThis.__nishchinte_config_version__ =
            (globalThis.__nishchinte_config_version__ || 0) + 1;
        }
      }
    } else if (!globalThis.__nishchinte_config__) {
      globalThis.__nishchinte_config__ = resolveConfig({});
      globalThis.__nishchinte_config_version__ =
        (globalThis.__nishchinte_config_version__ || 0) + 1;
    }
  }

  return globalThis.__nishchinte_config__!;
}

/**
 * Extracts a sanitized client configuration object.
 *
 * Automatically merges:
 * 1. Declared internal keys from `clientKeys`.
 * 2. All custom client properties defined under the `client` object in `nishchinte.config.ts`.
 *
 * @param config - The resolved configuration or raw config (defaults to active global config).
 * @returns The strongly typed {@link ClientConfig}.
 *
 * @example
 * ```typescript
 * import { getClientConfig } from "@nishchinte/config";
 *
 * const clientConfig = getClientConfig();
 * ```
 */
export function getClientConfig<T extends ClientConfig = ClientConfig>(
  config?: NishchinteConfig | ResolvedNishchinteConfig,
): T {
  const target = (config || getConfig()) as Record<string, unknown> | undefined;
  const clientConfig: Record<string, unknown> = {};

  if (target && typeof target === "object") {
    // 1. Pick any declared keys from clientKeys
    for (const key of clientKeys) {
      const keyStr = String(key);
      if (keyStr in target && target[keyStr] !== undefined) {
        clientConfig[keyStr] = target[keyStr];
      }
    }

    // 2. Merge all custom properties from target.client
    if (target.client && typeof target.client === "object") {
      Object.assign(clientConfig, target.client);
    }
  }

  return clientConfig as T;
}

/**
 * Manually sets the global active configuration instance.
 *
 * Useful for unit testing, mocking, or custom server orchestrators.
 *
 * @param config - The custom resolved configuration or raw config object to activate.
 */
export function setConfig(
  config: NishchinteConfig | ResolvedNishchinteConfig,
): ResolvedNishchinteConfig {
  globalThis.__nishchinte_config__ = resolveConfig(
    config as Partial<NishchinteConfig>,
  );
  return globalThis.__nishchinte_config__;
}
