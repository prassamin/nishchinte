import { getMimeType } from "../mime";
import { cleanPath, normalizeFileInput } from "../utils";
import type {
  StoragePlugin,
  StorageItem,
  StorageFileInput,
  UploadOptions,
  UploadResult,
  GetUrlOptions,
  ListOptions,
  MemoryStorageConfig,
} from "../types";

interface MemoryStoredFile {
  data: Buffer;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Creates an In-Memory storage driver plugin.
 *
 * Stores all files in process memory without touching disk or cloud networks.
 *
 * ### Ideal for:
 * - Automated Unit Testing & CI suites.
 * - Ephemeral scratch spaces.
 * - Offline / Demo mock configurations.
 *
 * @param config - Optional {@link MemoryStorageConfig} options.
 * @returns A {@link StoragePlugin} instance configured for memory storage.
 *
 * @example
 * ```typescript
 * import { memoryStorage } from "@nishchinte/storage";
 *
 * export const storage = memoryStorage();
 * ```
 */
export function memoryStorage(config?: MemoryStorageConfig): StoragePlugin {
  const files = new Map<string, MemoryStoredFile>();
  const folders = new Set<string>();
  const baseUrl = (config?.baseUrl || "memory://storage").replace(/\/+$/, "");

  function resolveUrl(path: string): string {
    const clean = cleanPath(path);
    return clean ? `${baseUrl}/${clean}` : "";
  }

  return {
    name: "memory",

    /**
     * Uploads/stores a file in memory.
     */
    async upload(
      file: StorageFileInput,
      options: UploadOptions = {}
    ): Promise<UploadResult> {
      const { buffer, filename, mimeType, relativeKey } =
        await normalizeFileInput(file, options);

      const now = new Date().toISOString();
      files.set(relativeKey, {
        data: buffer,
        name: filename,
        path: relativeKey,
        mimeType,
        size: buffer.length,
        createdAt: now,
        updatedAt: now,
      });

      // Record parent folder if any
      const folderParts = relativeKey.split("/");
      folderParts.pop();
      if (folderParts.length > 0) {
        folders.add(folderParts.join("/"));
      }

      return {
        url: resolveUrl(relativeKey),
        path: relativeKey,
        name: filename,
        size: buffer.length,
        mimeType,
      };
    },

    /**
     * Resolves simulated URL for a memory key.
     */
    async getUrl(path: string, _options?: GetUrlOptions): Promise<string> {
      if (!path) return "";
      return resolveUrl(path);
    },

    /**
     * Deletes a file from memory.
     */
    async delete(path: string): Promise<boolean> {
      const clean = cleanPath(path);
      return files.delete(clean);
    },

    /**
     * Deletes multiple files from memory.
     */
    async deleteMany(paths: string[]): Promise<string[]> {
      const deleted: string[] = [];
      for (const p of paths) {
        if (await this.delete(p)) {
          deleted.push(p);
        }
      }
      return deleted;
    },

    /**
     * Lists files and virtual folders stored in memory.
     */
    async list(
      folderPath: string = "",
      options: ListOptions = {}
    ): Promise<StorageItem[]> {
      const cleanFolder = cleanPath(folderPath);
      const prefix = cleanFolder ? `${cleanFolder}/` : "";

      const foundFolders = new Set<string>();
      const items: StorageItem[] = [];

      for (const [key, item] of files.entries()) {
        if (!key.startsWith(prefix)) continue;

        const relative = key.slice(prefix.length);
        const parts = relative.split("/");

        if (parts.length > 1 && !options.recursive) {
          const folderName = parts[0];
          const fullFolderPath = prefix ? `${prefix}${folderName}` : folderName;
          if (!foundFolders.has(fullFolderPath)) {
            foundFolders.add(fullFolderPath);
            items.push({
              name: folderName,
              path: fullFolderPath,
              url: "",
              kind: "folder",
            });
          }
        } else {
          // If recursive is true and file is inside subfolders, add intermediate folders if requested
          if (options.recursive && parts.length > 1 && (options.includeFolders ?? true)) {
            let currentPath = cleanFolder;
            for (let i = 0; i < parts.length - 1; i++) {
              const seg = parts[i];
              currentPath = currentPath ? `${currentPath}/${seg}` : seg;
              if (!foundFolders.has(currentPath)) {
                foundFolders.add(currentPath);
                items.push({
                  name: seg,
                  path: currentPath,
                  url: "",
                  kind: "folder",
                });
              }
            }
          }

          items.push({
            name: item.name,
            path: item.path,
            url: resolveUrl(item.path),
            kind: "file",
            mimeType: item.mimeType || getMimeType(item.name),
            sizeBytes: item.size,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          });
        }
      }

      for (const f of folders) {
        if (f.startsWith(prefix) && f !== cleanFolder) {
          if (options.recursive) {
            const folderName = f.split("/").pop() || f;
            if (!foundFolders.has(f)) {
              foundFolders.add(f);
              items.push({
                name: folderName,
                path: f,
                url: "",
                kind: "folder",
              });
            }
          } else {
            const relative = f.slice(prefix.length);
            const folderName = relative.split("/")[0];
            const fullFolderPath = prefix ? `${prefix}${folderName}` : folderName;
            if (!foundFolders.has(fullFolderPath)) {
              foundFolders.add(fullFolderPath);
              items.push({
                name: folderName,
                path: fullFolderPath,
                url: "",
                kind: "folder",
              });
            }
          }
        }
      }

      return items;
    },

    /**
     * Creates a virtual folder in memory.
     */
    async createFolder(
      folderPath: string,
      name: string
    ): Promise<{ path: string; name: string }> {
      const clean = cleanPath(folderPath);
      const safeName = name.trim().replace(/[^a-zA-Z0-9._-]/g, "");
      const fullPath = clean ? `${clean}/${safeName}` : safeName;
      folders.add(fullPath);
      return { path: fullPath, name: safeName };
    },

    /**
     * Moves a file in memory.
     */
    async move(
      sourcePath: string,
      targetPath: string
    ): Promise<{ from: string; to: string }> {
      const cleanSource = cleanPath(sourcePath);
      const cleanTarget = cleanPath(targetPath);

      const existing = files.get(cleanSource);
      if (!existing) {
        throw new Error(`File not found: ${cleanSource}`);
      }

      files.delete(cleanSource);
      files.set(cleanTarget, {
        ...existing,
        path: cleanTarget,
        name: cleanTarget.split("/").pop() || existing.name,
        updatedAt: new Date().toISOString(),
      });

      return { from: cleanSource, to: cleanTarget };
    },

    /**
     * Renames a file in memory.
     */
    async rename(
      filePath: string,
      nextName: string
    ): Promise<{ from: string; to: string }> {
      const clean = cleanPath(filePath);
      const parts = clean.split("/");
      parts.pop();
      const safeName = nextName.trim().replace(/[^a-zA-Z0-9._-]/g, "");
      const target = parts.length > 0 ? `${parts.join("/")}/${safeName}` : safeName;
      return this.move(clean, target);
    },

    /**
     * Checks if a file exists in memory.
     */
    async exists(path: string): Promise<boolean> {
      return files.has(cleanPath(path));
    },

    /**
     * Gets file data buffer from memory.
     */
    async getBuffer(path: string): Promise<Buffer | null> {
      const item = files.get(cleanPath(path));
      return item ? item.data : null;
    },

    /**
     * Verifies memory storage is operational.
     */
    async verify(): Promise<{ success: boolean }> {
      return { success: true };
    },
  };
}
