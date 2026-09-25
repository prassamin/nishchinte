import type {
  StoragePlugin,
  StorageItem,
  StorageFileInput,
  UploadOptions,
  UploadResult,
  GetUrlOptions,
  ListOptions,
} from "./types";
import { getMimeType, matchesAllowedType } from "./mime";

/**
 * Unified, provider-agnostic storage client interface.
 *
 * Exposes standardized methods to upload, list, move, rename, delete files,
 * and test provider connectivity.
 */
export interface StorageClient {
  /**
   * The underlying configured {@link StoragePlugin} driver.
   */
  readonly plugin: StoragePlugin;

  /**
   * Uploads a file using the active storage provider.
   *
   * @param file - File content as Buffer, Blob, File, Uint8Array, Stream, or string.
   * @param options - Upload options including target folder, filename, and mimeType.
   * @returns A promise resolving to an {@link UploadResult}.
   *
   * @example
   * ```typescript
   * const result = await storage.upload(file, {
   *   path: "products",
   *   filename: "product-image.png",
   * });
   * console.log("Uploaded to:", result.url);
   * ```
   */
  upload(file: StorageFileInput, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Retrieves the public or accessible URL for a given file path.
   *
   * @param path - Relative storage path or key.
   * @param options - URL generation options (e.g. expiration).
   * @returns A promise resolving to the URL string.
   */
  getUrl(path: string, options?: GetUrlOptions): Promise<string>;

  /**
   * Deletes a single file by path.
   *
   * @param path - Relative storage path or key.
   * @returns A promise resolving to `true` if deleted successfully.
   */
  delete(path: string): Promise<boolean>;

  /**
   * Deletes multiple files at once.
   *
   * @param paths - Array of relative storage paths or keys.
   * @returns A promise resolving to the list of successfully deleted paths.
   */
  deleteMany(paths: string[]): Promise<string[]>;

  /**
   * Lists files and folders within a given directory.
   *
   * @param folderPath - Target directory path (defaults to root "").
   * @param options - Listing options (recursive, limit, cursor).
   * @returns A promise resolving to an array of {@link StorageItem}.
   */
  list(folderPath?: string, options?: ListOptions): Promise<StorageItem[]>;

  /**
   * Creates a folder or directory placeholder.
   *
   * @param folderPath - Parent directory path.
   * @param name - Name of the new folder.
   * @returns A promise resolving to the folder path and name.
   */
  createFolder(folderPath: string, name: string): Promise<{ path: string; name: string }>;

  /**
   * Moves an item from one path to another.
   *
   * @param sourcePath - Original path or key.
   * @param targetPath - Destination path or key.
   * @returns A promise resolving to `{ from, to }`.
   */
  move(sourcePath: string, targetPath: string): Promise<{ from: string; to: string }>;

  /**
   * Renames an item within its directory.
   *
   * @param filePath - Current path.
   * @param nextName - New name for the item.
   * @returns A promise resolving to `{ from, to }`.
   */
  rename(filePath: string, nextName: string): Promise<{ from: string; to: string }>;

  /**
   * Checks whether a file exists at the specified path.
   *
   * @param path - Relative storage path or key.
   * @returns A promise resolving to `true` if exists, `false` otherwise.
   */
  exists(path: string): Promise<boolean>;

  /**
   * Downloads raw file Buffer.
   *
   * @param path - Relative storage path or key.
   * @returns A promise resolving to the file Buffer or null if not found.
   */
  getBuffer(path: string): Promise<Buffer | null>;

  /**
   * Performs diagnostic check / connectivity verification of the storage provider.
   *
   * @returns A promise resolving to `{ success: true }` or `{ success: false, error: string }`.
   */
  verify(): Promise<{ success: boolean; error?: string }>;
}

/**
 * Creates an instance of {@link StorageClient} configured with the specified provider plugin.
 *
 * @param plugin - The initialized {@link StoragePlugin} (e.g. `s3Storage(...)`, `localStorage(...)`, etc.).
 * @returns A {@link StorageClient} instance ready for storage operations.
 *
 * @example
 * ```typescript
 * import { createStorageClient, s3Storage } from "@nishchinte/storage";
 *
 * const storage = createStorageClient(
 *   s3Storage({
 *     bucket: "my-bucket",
 *     accessKeyId: process.env.S3_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
 *   })
 * );
 * ```
 */
export function createStorageClient(plugin: StoragePlugin): StorageClient {
  return {
    plugin,

    async upload(file: StorageFileInput, options?: UploadOptions): Promise<UploadResult> {
      return plugin.upload(file, options);
    },

    async getUrl(path: string, options?: GetUrlOptions): Promise<string> {
      return plugin.getUrl(path, options);
    },

    async delete(path: string): Promise<boolean> {
      return plugin.delete(path);
    },

    async deleteMany(paths: string[]): Promise<string[]> {
      return plugin.deleteMany(paths);
    },

    async list(folderPath?: string, options?: ListOptions): Promise<StorageItem[]> {
      const items = await plugin.list(folderPath, options);
      const typeFilter = options?.types;

      if (!typeFilter) {
        return items;
      }

      const includeFolders = options?.includeFolders ?? true;

      return items.filter((item) => {
        if (item.kind === "folder") {
          return includeFolders;
        }
        const mime = item.mimeType || getMimeType(item.name);
        return matchesAllowedType(mime, item.name, typeFilter);
      });
    },

    async createFolder(
      folderPath: string,
      name: string
    ): Promise<{ path: string; name: string }> {
      return plugin.createFolder(folderPath, name);
    },

    async move(
      sourcePath: string,
      targetPath: string
    ): Promise<{ from: string; to: string }> {
      return plugin.move(sourcePath, targetPath);
    },

    async rename(
      filePath: string,
      nextName: string
    ): Promise<{ from: string; to: string }> {
      return plugin.rename(filePath, nextName);
    },

    async exists(path: string): Promise<boolean> {
      if (plugin.exists) {
        return plugin.exists(path);
      }
      try {
        const url = await plugin.getUrl(path);
        return Boolean(url);
      } catch {
        return false;
      }
    },

    async getBuffer(path: string): Promise<Buffer | null> {
      if (plugin.getBuffer) {
        return plugin.getBuffer(path);
      }
      return null;
    },

    async verify(): Promise<{ success: boolean; error?: string }> {
      if (plugin.verify) {
        return plugin.verify();
      }
      return { success: true };
    },
  };
}

/**
 * Type-safe configuration helper for defining storage in `nishchinte.config.ts`.
 *
 * @param plugin - An initialized storage plugin instance.
 * @returns A {@link StorageClient} configured with the given plugin.
 */
export function defineStorageConfig(plugin: StoragePlugin): StorageClient {
  return createStorageClient(plugin);
}