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
  SupabaseStorageConfig,
} from "../types";

/**
 * Creates a Supabase Storage driver plugin using native REST `fetch`.
 *
 * Lightweight, zero-dependency integration that interacts directly with Supabase Storage REST API.
 *
 * @param config - The {@link SupabaseStorageConfig} configuration options.
 * @returns A {@link StoragePlugin} instance configured for Supabase Storage.
 *
 * @example
 * ```typescript
 * import { supabaseStorage } from "@nishchinte/storage";
 *
 * export const storage = supabaseStorage({
 *   url: process.env.SUPABASE_URL!,
 *   apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
 *   bucket: "products",
 * });
 * ```
 */
export function supabaseStorage(config: SupabaseStorageConfig): StoragePlugin {
  const baseUrl = config.url.replace(/\/+$/, "");
  const bucket = config.bucket;
  const apiKey = config.apiKey;

  function getHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      apikey: apiKey,
    };
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    return headers;
  }

  function resolvePublicUrl(path: string): string {
    const clean = cleanPath(path);
    if (!clean) return "";
    if (config.publicUrl) {
      return `${config.publicUrl.replace(/\/+$/, "")}/${clean}`;
    }
    return `${baseUrl}/storage/v1/object/public/${bucket}/${clean}`;
  }

  return {
    name: "supabase",

    /**
     * Uploads a file to the Supabase Storage bucket.
     */
    async upload(
      file: StorageFileInput,
      options: UploadOptions = {},
    ): Promise<UploadResult> {
      const { buffer, filename, mimeType, relativeKey } =
        await normalizeFileInput(file, options);

      const endpoint = `${baseUrl}/storage/v1/object/${bucket}/${relativeKey}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...getHeaders(mimeType),
          "x-upsert": "true",
        },
        body: new Uint8Array(buffer),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Supabase upload failed (${res.status}): ${errorText}`);
      }

      const url = resolvePublicUrl(relativeKey);

      return {
        url,
        path: relativeKey,
        name: filename,
        size: buffer.length,
        mimeType,
      };
    },

    /**
     * Returns the public URL for a file in Supabase Storage.
     */
    async getUrl(path: string, _options?: GetUrlOptions): Promise<string> {
      if (!path) return "";
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
      }
      return resolvePublicUrl(path);
    },

    /**
     * Deletes a single object from Supabase Storage.
     */
    async delete(path: string): Promise<boolean> {
      if (!path) return false;
      const clean = cleanPath(path);
      const res = await this.deleteMany([clean]);
      return res.length > 0;
    },

    /**
     * Deletes multiple objects from Supabase Storage.
     */
    async deleteMany(paths: string[]): Promise<string[]> {
      if (!paths || paths.length === 0) return [];
      const keys = paths.map((p) => cleanPath(p)).filter(Boolean);
      if (keys.length === 0) return [];

      const endpoint = `${baseUrl}/storage/v1/object/${bucket}`;
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: getHeaders("application/json"),
        body: JSON.stringify({ prefixes: keys }),
      });

      if (!res.ok) {
        console.error(
          `Supabase delete failed (${res.status}):`,
          await res.text(),
        );
        return [];
      }

      return paths;
    },

    /**
     * Lists files and folders in a Supabase bucket folder.
     */
    async list(
      folderPath: string = "",
      options: ListOptions = {},
    ): Promise<StorageItem[]> {
      const cleanFolder = cleanPath(folderPath);
      const endpoint = `${baseUrl}/storage/v1/object/list/${bucket}`;

      const items: StorageItem[] = [];

      const fetchFolder = async (currentPrefix: string) => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: getHeaders("application/json"),
          body: JSON.stringify({
            prefix: currentPrefix,
            limit: options.limit || 100,
            sortBy: { column: "name", order: "asc" },
          }),
        });

        if (!res.ok) {
          console.error(
            `Supabase list failed (${res.status}):`,
            await res.text(),
          );
          return;
        }

        const data = (await res.json()) as Array<{
          name: string;
          id?: string | null;
          created_at?: string;
          updated_at?: string;
          metadata?: { size?: number; mimetype?: string } | null;
        }>;

        for (const entry of data) {
          if (entry.name === ".keep") {
            continue;
          }

          const isFolder = entry.id === null;
          const itemPath = currentPrefix
            ? `${currentPrefix}/${entry.name}`
            : entry.name;
          const url = isFolder ? "" : resolvePublicUrl(itemPath);

          if (isFolder) {
            if (options.includeFolders ?? true) {
              items.push({
                name: entry.name,
                path: itemPath,
                url: "",
                kind: "folder",
              });
            }
            if (options.recursive) {
              await fetchFolder(itemPath);
            }
          } else {
            items.push({
              name: entry.name,
              path: itemPath,
              url,
              kind: "file",
              mimeType: isFolder
                ? undefined
                : entry.metadata?.mimetype || getMimeType(entry.name),
              sizeBytes: entry.metadata?.size,
              createdAt: entry.created_at,
              updatedAt: entry.updated_at,
            });
          }
        }
      };

      try {
        await fetchFolder(cleanFolder);
        return items;
      } catch (err) {
        console.error("Supabase list error:", err);
        return [];
      }
    },

    /**
     * Creates a folder placeholder in Supabase Storage.
     */
    async createFolder(
      folderPath: string,
      name: string,
    ): Promise<{ path: string; name: string }> {
      const cleanFolder = cleanPath(folderPath);
      const safeName = name.trim().replace(/[^a-zA-Z0-9._-]/g, "");
      const fullPath = cleanFolder ? `${cleanFolder}/${safeName}` : safeName;
      console.log(fullPath);
      const endpoint = `${baseUrl}/storage/v1/object/${bucket}/${fullPath}/.keep`;
      await fetch(endpoint, {
        method: "POST",
        headers: {
          ...getHeaders("text/plain"),
          "x-upsert": "true",
        },
        body: "",
      });

      return { path: fullPath, name: safeName };
    },

    /**
     * Moves or renames an object in Supabase Storage.
     */
    async move(
      sourcePath: string,
      targetPath: string,
    ): Promise<{ from: string; to: string }> {
      const cleanSource = cleanPath(sourcePath);
      const cleanTarget = cleanPath(targetPath);

      const endpoint = `${baseUrl}/storage/v1/object/move`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: getHeaders("application/json"),
        body: JSON.stringify({
          bucketId: bucket,
          sourceKey: cleanSource,
          destinationKey: cleanTarget,
        }),
      });

      if (!res.ok) {
        throw new Error(
          `Supabase move failed (${res.status}): ${await res.text()}`,
        );
      }

      return { from: cleanSource, to: cleanTarget };
    },

    /**
     * Renames an object within its folder.
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
     * Checks if a file exists in Supabase Storage.
     */
    async exists(path: string): Promise<boolean> {
      if (!path) return false;
      const clean = cleanPath(path);
      const endpoint = `${baseUrl}/storage/v1/object/authenticated/${bucket}/${clean}`;
      const res = await fetch(endpoint, {
        method: "HEAD",
        headers: getHeaders(),
      });
      return res.ok;
    },

    /**
     * Downloads an object's binary buffer.
     */
    async getBuffer(path: string): Promise<Buffer | null> {
      if (!path) return null;
      const clean = cleanPath(path);
      const endpoint = `${baseUrl}/storage/v1/object/authenticated/${bucket}/${clean}`;
      const res = await fetch(endpoint, {
        method: "GET",
        headers: getHeaders(),
      });

      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    },

    /**
     * Diagnostic check for Supabase storage bucket access.
     */
    async verify(): Promise<{ success: boolean; error?: string }> {
      try {
        const endpoint = `${baseUrl}/storage/v1/bucket/${bucket}`;
        const res = await fetch(endpoint, {
          method: "GET",
          headers: getHeaders(),
        });

        if (!res.ok) {
          return {
            success: false,
            error: `Supabase bucket "${bucket}" access error (${res.status}): ${await res.text()}`,
          };
        }

        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error:
            error?.message || "Failed to verify Supabase Storage connection",
        };
      }
    },
  };
}
