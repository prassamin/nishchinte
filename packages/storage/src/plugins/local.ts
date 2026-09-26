import {
  writeFile,
  unlink,
  readdir,
  mkdir,
  stat,
  rename as fsRename,
  readFile,
  access,
  rm,
} from "fs/promises";
import path from "path";
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
  LocalStorageConfig,
} from "../types";

/**
 * Creates a Local Filesystem storage driver plugin.
 *
 * Stores uploaded assets on the server's local filesystem (e.g. `public/uploads`).
 *
 * ### Ideal for:
 * - Local development and staging environments.
 * - Single-instance or self-hosted deployments.
 * - Zero external cloud dependencies.
 *
 * @param config - Optional {@link LocalStorageConfig} options.
 * @returns A {@link StoragePlugin} instance configured for local disk storage.
 *
 * @example
 * ```typescript
 * import { localStorage } from "@nishchinte/storage";
 *
 * export const storage = localStorage({
 *   uploadDir: "./public/uploads",
 *   publicPath: "/uploads",
 * });
 * ```
 */
export function localStorage(config?: LocalStorageConfig): StoragePlugin {
  const uploadDir = config?.uploadDir
    ? path.resolve(config.uploadDir)
    : path.join(process.cwd(), "public", "uploads");

  const publicPath = (config?.publicPath || "/uploads").replace(/\/+$/, "");

  function getBaseUrl(): string {
    const raw =
      config?.baseUrl ||
      process.env.BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
      "http://localhost:3000";
    return raw.replace(/\/+$/, "");
  }

  async function resolvePublicUrl(filePath: string): Promise<string> {
    const cleanKey = cleanPath(filePath);
    if (!cleanKey) return "";
    const base = getBaseUrl();
    const prefix = `${base}${publicPath}`;
    return `${prefix}/${cleanKey}`;
  }

  function getLocalDiskPath(relativeKey: string): string {
    const clean = cleanPath(relativeKey);
    return path.join(uploadDir, clean);
  }

  return {
    name: "local",

    /**
     * Uploads/saves a file to local disk.
     */
    async upload(
      file: StorageFileInput,
      options: UploadOptions = {},
    ): Promise<UploadResult> {
      const { buffer, filename, mimeType, relativeKey } =
        await normalizeFileInput(file, options);

      const targetPath = getLocalDiskPath(relativeKey);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, buffer);

      const url = await resolvePublicUrl(relativeKey);

      return {
        url,
        path: relativeKey,
        name: filename,
        size: buffer.length,
        mimeType,
      };
    },

    /**
     * Returns the public URL for a locally stored file.
     */
    async getUrl(filePath: string, _options?: GetUrlOptions): Promise<string> {
      if (!filePath) return "";
      if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
        return filePath;
      }
      return resolvePublicUrl(filePath);
    },

    /**
     * Deletes a single file or directory from disk.
     */
    async delete(filePath: string): Promise<boolean> {
      if (!filePath) return false;
      const clean = cleanPath(filePath);
      if (!clean) return false;
      const fullPath = getLocalDiskPath(clean);
      try {
        await access(fullPath);
        await rm(fullPath, { recursive: true, force: true });
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Deletes multiple files from disk.
     */
    async deleteMany(filePaths: string[]): Promise<string[]> {
      if (!filePaths || filePaths.length === 0) return [];
      const deleted: string[] = [];

      for (const fp of filePaths) {
        const ok = await this.delete(fp);
        if (ok) deleted.push(fp);
      }

      return deleted;
    },

    /**
     * Lists files and directories on disk.
     */
    async list(
      folderPath: string = "",
      options: ListOptions = {},
    ): Promise<StorageItem[]> {
      const cleanFolder = cleanPath(folderPath);
      const fullFolderPath = path.join(uploadDir, cleanFolder);

      try {
        await mkdir(fullFolderPath, { recursive: true });

        const items: StorageItem[] = [];

        if (options.recursive) {
          const scanDir = async (dirPath: string, relativeDir: string) => {
            const entries = await readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.name === ".keep") {
                continue;
              }

              const relativeItemPath = relativeDir
                ? `${relativeDir}/${entry.name}`
                : entry.name;
              const fullItemPath = path.join(dirPath, entry.name);

              if (entry.isDirectory()) {
                if (options.includeFolders ?? true) {
                  items.push({
                    name: entry.name,
                    path: relativeItemPath,
                    url: "",
                    kind: "folder",
                  });
                }
                await scanDir(fullItemPath, relativeItemPath);
              } else {
                const fileStat = await stat(fullItemPath);
                const url = await resolvePublicUrl(relativeItemPath);
                items.push({
                  name: entry.name,
                  path: relativeItemPath,
                  url,
                  kind: "file",
                  mimeType: getMimeType(entry.name),
                  sizeBytes: fileStat.size,
                  createdAt: fileStat.birthtime.toISOString(),
                  updatedAt: fileStat.mtime.toISOString(),
                });
              }
            }
          };

          await scanDir(fullFolderPath, cleanFolder);
          return items;
        }

        const entries = await readdir(fullFolderPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name === ".keep") {
            continue;
          }

          const relativeItemPath = cleanFolder
            ? `${cleanFolder}/${entry.name}`
            : entry.name;
          const fullItemPath = path.join(fullFolderPath, entry.name);

          if (entry.isDirectory()) {
            items.push({
              name: entry.name,
              path: relativeItemPath,
              url: "",
              kind: "folder",
            });
          } else {
            const fileStat = await stat(fullItemPath);
            const url = await resolvePublicUrl(relativeItemPath);
            items.push({
              name: entry.name,
              path: relativeItemPath,
              url,
              kind: "file",
              mimeType: getMimeType(entry.name),
              sizeBytes: fileStat.size,
              createdAt: fileStat.birthtime.toISOString(),
              updatedAt: fileStat.mtime.toISOString(),
            });
          }
        }

        return items;
      } catch {
        return [];
      }
    },

    /**
     * Creates a directory on disk.
     */
    async createFolder(
      folderPath: string,
      name: string,
    ): Promise<{ path: string; name: string }> {
      const cleanFolder = cleanPath(folderPath);
      const safeName = name.trim().replace(/[^a-zA-Z0-9._-]/g, "");
      const fullPath = cleanFolder ? `${cleanFolder}/${safeName}` : safeName;

      const localPath = path.join(uploadDir, fullPath);
      await mkdir(localPath, { recursive: true });

      return { path: fullPath, name: safeName };
    },

    /**
     * Moves or renames a file or directory on disk.
     */
    async move(
      sourcePath: string,
      targetPath: string,
    ): Promise<{ from: string; to: string }> {
      const cleanSource = cleanPath(sourcePath);
      const cleanTarget = cleanPath(targetPath);

      const fullSource = path.join(uploadDir, cleanSource);
      const fullTarget = path.join(uploadDir, cleanTarget);

      await mkdir(path.dirname(fullTarget), { recursive: true });
      await fsRename(fullSource, fullTarget);

      return { from: cleanSource, to: cleanTarget };
    },

    /**
     * Renames a file or folder within its directory.
     */
    async rename(
      filePath: string,
      nextName: string,
    ): Promise<{ from: string; to: string }> {
      const clean = cleanPath(filePath);
      const parts = clean.split("/");
      parts.pop();
      const safeName = nextName.trim().replace(/[^a-zA-Z0-9._-]/g, "");
      const target =
        parts.length > 0 ? `${parts.join("/")}/${safeName}` : safeName;
      return this.move(clean, target);
    },

    /**
     * Checks if a file exists on disk.
     */
    async exists(filePath: string): Promise<boolean> {
      if (!filePath) return false;
      const fullPath = getLocalDiskPath(filePath);
      try {
        await access(fullPath);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Reads a file from disk into a Buffer.
     */
    async getBuffer(filePath: string): Promise<Buffer | null> {
      if (!filePath) return null;
      const fullPath = getLocalDiskPath(filePath);
      try {
        return await readFile(fullPath);
      } catch {
        return null;
      }
    },

    /**
     * Verifies that the local upload directory is writable.
     */
    async verify(): Promise<{ success: boolean; error?: string }> {
      try {
        await mkdir(uploadDir, { recursive: true });
        const probeFile = path.join(uploadDir, `.probe-${Date.now()}`);
        await writeFile(probeFile, "ok");
        await unlink(probeFile);
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error?.message || "Local upload directory is not writable",
        };
      }
    },
  };
}
