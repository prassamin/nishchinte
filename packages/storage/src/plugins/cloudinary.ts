import crypto from "node:crypto";
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
  CloudinaryConfig,
} from "../types";

/**
 * Creates a Cloudinary storage driver plugin using native REST `fetch` and crypto signatures.
 *
 * Cloudinary provides media-optimized storage with automatic format selection (AVIF/WebP),
 * quality compression (q_auto), and global multi-CDN delivery.
 *
 * @param config - The {@link CloudinaryConfig} configuration options.
 * @returns A {@link StoragePlugin} instance configured for Cloudinary.
 *
 * @example
 * ```typescript
 * import { cloudinaryStorage } from "@nishchinte/storage";
 *
 * export const storage = cloudinaryStorage({
 *   cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
 *   apiKey: process.env.CLOUDINARY_API_KEY!,
 *   apiSecret: process.env.CLOUDINARY_API_SECRET!,
 *   folder: "products",
 * });
 * ```
 */
export function cloudinaryStorage(config: CloudinaryConfig): StoragePlugin {
  const cloudName = config.cloudName;
  const apiKey = config.apiKey;
  const apiSecret = config.apiSecret;
  const secure = config.secure !== false;
  const protocol = secure ? "https" : "http";

  function generateSignature(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
      .sort();
    const serialized = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");
    return crypto.createHash("sha1").update(serialized + apiSecret).digest("hex");
  }

  function getBasicAuth(): string {
    return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
  }

  function resolvePublicUrl(publicIdOrPath: string): string {
    const clean = cleanPath(publicIdOrPath);
    if (!clean) return "";

    if (config.deliveryUrl) {
      const base = config.deliveryUrl.replace(/\/+$/, "");
      return `${base}/${clean}`;
    }

    return `${protocol}://res.cloudinary.com/${cloudName}/image/upload/${clean}`;
  }

  function stripExtension(filename: string): string {
    return filename.replace(/\.[^/.]+$/, "");
  }

  return {
    name: "cloudinary",

    /**
     * Uploads a media file to Cloudinary.
     */
    async upload(
      file: StorageFileInput,
      options: UploadOptions = {}
    ): Promise<UploadResult> {
      const { buffer, filename, mimeType } = await normalizeFileInput(file, options);

      const timestamp = Math.floor(Date.now() / 1000);
      const rawFolder = cleanPath(options.path || config.folder || "");
      const baseName = stripExtension(filename);
      const publicId = options.preserveFilename ? baseName : `${Date.now()}-${baseName}`;

      const paramsToSign: Record<string, any> = {
        public_id: publicId,
        timestamp,
      };

      if (rawFolder) {
        paramsToSign.folder = rawFolder;
      }

      const signature = generateSignature(paramsToSign);

      const formData = new FormData();
      const fileBase64 = `data:${mimeType};base64,${buffer.toString("base64")}`;

      formData.append("file", fileBase64);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("public_id", publicId);
      formData.append("signature", signature);

      if (rawFolder) {
        formData.append("folder", rawFolder);
      }

      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Cloudinary upload failed (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      const storedPath = data.public_id ? `${data.public_id}.${data.format || mimeType.split("/")[1] || "jpg"}` : publicId;
      const url = data.secure_url || data.url || resolvePublicUrl(storedPath);

      return {
        url,
        path: storedPath,
        name: filename,
        size: data.bytes || buffer.length,
        mimeType: data.format ? getMimeType(`file.${data.format}`) : mimeType,
      };
    },

    /**
     * Returns the public delivery URL for a Cloudinary asset.
     */
    async getUrl(path: string, _options?: GetUrlOptions): Promise<string> {
      if (!path) return "";
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
      }
      return resolvePublicUrl(path);
    },

    /**
     * Deletes a single asset from Cloudinary.
     */
    async delete(path: string): Promise<boolean> {
      if (!path) return false;
      const clean = cleanPath(path);
      const publicId = stripExtension(clean);
      const timestamp = Math.floor(Date.now() / 1000);

      const paramsToSign = {
        public_id: publicId,
        timestamp,
      };
      const signature = generateSignature(paramsToSign);

      // Try destroying as image first
      for (const resourceType of ["image", "video", "raw"]) {
        const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
        const formData = new FormData();
        formData.append("public_id", publicId);
        formData.append("api_key", apiKey);
        formData.append("timestamp", String(timestamp));
        formData.append("signature", signature);

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.result === "ok") return true;
          }
        } catch {
          // try next resource type
        }
      }

      return false;
    },

    /**
     * Deletes multiple assets from Cloudinary.
     */
    async deleteMany(paths: string[]): Promise<string[]> {
      if (!paths || paths.length === 0) return [];
      const deleted: string[] = [];

      for (const p of paths) {
        const ok = await this.delete(p);
        if (ok) deleted.push(p);
      }

      return deleted;
    },

    /**
     * Lists resources and subfolders from Cloudinary Admin API.
     */
    async list(
      folderPath: string = "",
      options: ListOptions = {}
    ): Promise<StorageItem[]> {
      const cleanFolder = cleanPath(folderPath);
      const items: StorageItem[] = [];

      // 1. Fetch Subfolders
      const fetchFolders = async (parentFolder: string) => {
        try {
          const folderEndpoint = parentFolder
            ? `https://api.cloudinary.com/v1_1/${cloudName}/folders/${encodeURIComponent(parentFolder)}`
            : `https://api.cloudinary.com/v1_1/${cloudName}/folders`;

          const folderRes = await fetch(folderEndpoint, {
            headers: { Authorization: getBasicAuth() },
          });

          if (folderRes.ok) {
            const folderData = await folderRes.json();
            if (Array.isArray(folderData.folders)) {
              for (const f of folderData.folders) {
                if (options.includeFolders ?? true) {
                  items.push({
                    name: f.name,
                    path: f.path,
                    url: "",
                    kind: "folder",
                  });
                }
                if (options.recursive) {
                  await fetchFolders(f.path);
                }
              }
            }
          }
        } catch (err) {
          console.error("Cloudinary list folders error:", err);
        }
      };

      await fetchFolders(cleanFolder);

      // 2. Fetch Files / Resources
      try {
        const maxResults = options.limit || 100;
        const prefix = cleanFolder ? `&prefix=${encodeURIComponent(cleanFolder)}` : "";
        const resourceEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?type=upload${prefix}&max_results=${maxResults}`;

        const res = await fetch(resourceEndpoint, {
          headers: { Authorization: getBasicAuth() },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.resources)) {
            for (const r of data.resources) {
              const ext = r.format ? `.${r.format}` : "";
              const fullFilePath = `${r.public_id}${ext}`;
              const fileName = fullFilePath.split("/").pop() || fullFilePath;

              // If non-recursive and file is in a deeper subfolder, skip file (since folder is already listed)
              if (!options.recursive && cleanFolder) {
                const relativePath = fullFilePath.startsWith(`${cleanFolder}/`)
                  ? fullFilePath.slice(cleanFolder.length + 1)
                  : fullFilePath;
                if (relativePath.includes("/")) {
                  continue;
                }
              } else if (!options.recursive && !cleanFolder) {
                if (fullFilePath.includes("/")) {
                  continue;
                }
              }

              items.push({
                name: fileName,
                path: fullFilePath,
                url: r.secure_url || resolvePublicUrl(fullFilePath),
                kind: "file",
                mimeType: getMimeType(fileName),
                sizeBytes: r.bytes,
                createdAt: r.created_at,
                updatedAt: r.created_at,
              });
            }
          }
        }
      } catch (err) {
        console.error("Cloudinary list resources error:", err);
      }

      return items;
    },

    /**
     * Creates a virtual folder in Cloudinary.
     */
    async createFolder(
      folderPath: string,
      name: string
    ): Promise<{ path: string; name: string }> {
      const clean = cleanPath(folderPath);
      const safeName = name.trim().replace(/[^a-zA-Z0-9._-]/g, "");
      const fullPath = clean ? `${clean}/${safeName}` : safeName;

      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/folders/${encodeURIComponent(fullPath)}`;
      await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: getBasicAuth() },
      });

      return { path: fullPath, name: safeName };
    },

    /**
     * Renames / moves an asset in Cloudinary.
     */
    async move(
      sourcePath: string,
      targetPath: string
    ): Promise<{ from: string; to: string }> {
      const fromPublicId = stripExtension(cleanPath(sourcePath));
      const toPublicId = stripExtension(cleanPath(targetPath));
      const timestamp = Math.floor(Date.now() / 1000);

      const paramsToSign = {
        from_public_id: fromPublicId,
        overwrite: "true",
        timestamp,
        to_public_id: toPublicId,
      };
      const signature = generateSignature(paramsToSign);

      const formData = new FormData();
      formData.append("from_public_id", fromPublicId);
      formData.append("to_public_id", toPublicId);
      formData.append("overwrite", "true");
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);

      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/rename`;
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Cloudinary rename failed (${res.status}): ${await res.text()}`);
      }

      return { from: sourcePath, to: targetPath };
    },

    /**
     * Renames an asset within its folder.
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
     * Checks if an asset exists in Cloudinary.
     */
    async exists(path: string): Promise<boolean> {
      if (!path) return false;
      const clean = cleanPath(path);
      const publicId = stripExtension(clean);

      try {
        const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${encodeURIComponent(publicId)}`;
        const res = await fetch(endpoint, {
          headers: { Authorization: getBasicAuth() },
        });
        return res.ok;
      } catch {
        return false;
      }
    },

    /**
     * Downloads an asset's raw binary buffer.
     */
    async getBuffer(path: string): Promise<Buffer | null> {
      if (!path) return null;
      const url = await this.getUrl(path);
      if (!url) return null;

      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
      } catch {
        return null;
      }
    },

    /**
     * Verifies Cloudinary credentials and connectivity.
     */
    async verify(): Promise<{ success: boolean; error?: string }> {
      try {
        const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/ping`;
        const res = await fetch(endpoint, {
          headers: { Authorization: getBasicAuth() },
        });

        if (!res.ok) {
          return {
            success: false,
            error: `Cloudinary verification failed (${res.status}): ${await res.text()}`,
          };
        }

        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error?.message || "Failed to verify Cloudinary credentials",
        };
      }
    },
  };
}
