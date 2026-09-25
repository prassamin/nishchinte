import { getConfig } from "@nishchinte/config";
import {
  createStorageClient,
  localStorage,
  type StorageClient,
  type StoragePlugin,
} from "@nishchinte/storage";

export type { StorageClient, StoragePlugin };

let cachedStorageClient: StorageClient | null = null;
let cachedStorageVersion = -1;

/**
 * Resolves or initializes the active storage client from config or environment variables.
 */
export function getStorageClient(): StorageClient {
  const config = getConfig();
  const currentVersion = (globalThis as any).__nishchinte_config_version__ || 0;

  if (cachedStorageClient && cachedStorageVersion === currentVersion) {
    return cachedStorageClient;
  }

  cachedStorageVersion = currentVersion;
  if (config?.storage) {
    if ("plugin" in config.storage && typeof (config.storage as any).upload === "function") {
      cachedStorageClient = config.storage as StorageClient;
      return cachedStorageClient;
    }
    cachedStorageClient = createStorageClient(config.storage as StoragePlugin);
    return cachedStorageClient;
  }

  cachedStorageClient = createStorageClient(localStorage());
  return cachedStorageClient;
}

/**
 * Unified storage facade for server operations.
 */
export const storage = {
  get client(): StorageClient {
    return getStorageClient();
  },
  upload: (...args: Parameters<StorageClient["upload"]>) => getStorageClient().upload(...args),
  getUrl: (...args: Parameters<StorageClient["getUrl"]>) => getStorageClient().getUrl(...args),
  delete: (...args: Parameters<StorageClient["delete"]>) => getStorageClient().delete(...args),
  deleteMany: (...args: Parameters<StorageClient["deleteMany"]>) => getStorageClient().deleteMany(...args),
  list: (...args: Parameters<StorageClient["list"]>) => getStorageClient().list(...args),
  createFolder: (...args: Parameters<StorageClient["createFolder"]>) => getStorageClient().createFolder(...args),
  move: (...args: Parameters<StorageClient["move"]>) => getStorageClient().move(...args),
  rename: (...args: Parameters<StorageClient["rename"]>) => getStorageClient().rename(...args),
  exists: (...args: Parameters<StorageClient["exists"]>) => getStorageClient().exists(...args),
  getBuffer: (...args: Parameters<StorageClient["getBuffer"]>) => getStorageClient().getBuffer(...args),
  verify: (...args: Parameters<StorageClient["verify"]>) => getStorageClient().verify(...args),
};
