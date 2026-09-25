import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  CopyObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getMimeType } from "../mime";
import { cleanPath, normalizeFileInput, streamToBuffer } from "../utils";
import type {
  StoragePlugin,
  StorageItem,
  StorageFileInput,
  UploadOptions,
  UploadResult,
  GetUrlOptions,
  ListOptions,
  S3Config,
} from "../types";

/**
 * Creates an S3-compatible storage driver plugin.
 *
 * Compatible with any standard Amazon S3 API provider, including:
 * - Amazon Web Services (AWS S3)
 * - Tigris Data (`fly.storage.tigris.dev`)
 * - Cloudflare R2
 * - DigitalOcean Spaces
 * - MinIO (self-hosted)
 * - Wasabi / Backblaze B2
 *
 * @param config - The {@link S3Config} configuration options.
 * @returns A {@link StoragePlugin} instance configured for S3 storage.
 *
 * @example
 * ```typescript
 * import { s3Storage } from "@nishchinte/storage";
 *
 * export const storage = s3Storage({
 *   bucket: "my-bucket",
 *   accessKeyId: process.env.S3_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
 *   endpoint: "https://fly.storage.tigris.dev",
 *   publicUrl: "https://fly.storage.tigris.dev/my-bucket",
 * });
 * ```
 */
export function s3Storage(config: S3Config): StoragePlugin {
  let s3Client: S3Client | null = null;

  function getClient(): S3Client {
    if (!s3Client) {
      s3Client = new S3Client({
        region: config.region || "auto",
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    }
    return s3Client;
  }

  function resolvePublicUrl(key: string): string {
    const cleanKey = cleanPath(key);
    if (!cleanKey) return "";

    if (config.publicUrl) {
      const base = config.publicUrl.replace(/\/+$/, "");
      return `${base}/${cleanKey}`;
    }

    if (config.endpoint) {
      const base = config.endpoint.replace(/\/+$/, "");
      return `${base}/${config.bucket}/${cleanKey}`;
    }

    const region =
      config.region && config.region !== "auto" ? config.region : "us-east-1";
    return `https://${config.bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
  }

  return {
    name: "s3",

    /**
     * Uploads a file to the S3 bucket.
     */
    async upload(
      file: StorageFileInput,
      options: UploadOptions = {},
    ): Promise<UploadResult> {
      const client = getClient();
      const { buffer, filename, mimeType, relativeKey } =
        await normalizeFileInput(file, options);

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: relativeKey,
          Body: buffer,
          ContentType: mimeType,
          Metadata: options.metadata,
        }),
      );

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
     * Returns the public URL for an S3 key.
     */
    async getUrl(path: string, _options?: GetUrlOptions): Promise<string> {
      if (!path) return "";
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
      }
      return resolvePublicUrl(path);
    },

    /**
     * Deletes a single object from S3.
     */
    async delete(path: string): Promise<boolean> {
      if (!path) return false;
      const key = cleanPath(path);
      const client = getClient();

      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }),
        );
        return true;
      } catch (error) {
        console.error("S3 delete error:", error);
        return false;
      }
    },

    /**
     * Deletes multiple objects from S3 in a single batch.
     */
    async deleteMany(paths: string[]): Promise<string[]> {
      if (!paths || paths.length === 0) return [];
      const client = getClient();
      const keys = paths.map((p) => cleanPath(p)).filter(Boolean);

      if (keys.length === 0) return [];

      try {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: {
              Objects: keys.map((Key) => ({ Key })),
              Quiet: true,
            },
          }),
        );
        return paths;
      } catch (error) {
        console.error("S3 deleteMany error:", error);
        return [];
      }
    },

    /**
     * Lists files and folders under a specific S3 prefix.
     */
    async list(
      folderPath: string = "",
      options: ListOptions = {},
    ): Promise<StorageItem[]> {
      const client = getClient();
      const cleanFolder = cleanPath(folderPath);
      const prefix = cleanFolder ? `${cleanFolder}/` : "";

      try {
        const items: StorageItem[] = [];
        let continuationToken: string | undefined = undefined;
        const maxLimit = options.limit || (options.recursive ? 1000 : 100);

        do {
          const res: ListObjectsV2CommandOutput = await client.send(
            new ListObjectsV2Command({
              Bucket: config.bucket,
              Prefix: prefix,
              Delimiter: options.recursive ? undefined : "/",
              MaxKeys: Math.min(maxLimit - items.length, 1000),
              ContinuationToken: continuationToken,
            }),
          );

          // Directories / Common prefixes
          if (res.CommonPrefixes) {
            for (const cp of res.CommonPrefixes) {
              if (cp.Prefix) {
                const fPath = cp.Prefix.replace(/\/+$/, "");
                const name = fPath.split("/").pop() || "folder";
                items.push({
                  name,
                  path: fPath,
                  url: "",
                  kind: "folder",
                });
              }
            }
          }

          // Files
          if (res.Contents) {
            for (const item of res.Contents) {
              if (!item.Key || item.Key === prefix) {
                continue;
              }

              if (item.Key.endsWith("/.keep")) {
                if (options.recursive && (options.includeFolders ?? true)) {
                  const fPath = item.Key.replace(/\/\.keep$/, "");
                  const name = fPath.split("/").pop() || fPath;
                  items.push({
                    name,
                    path: fPath,
                    url: "",
                    kind: "folder",
                  });
                }
                continue;
              }

              if (item.Key.endsWith("/")) {
                if (options.includeFolders ?? true) {
                  const fPath = item.Key.replace(/\/+$/, "");
                  const name = fPath.split("/").pop() || "folder";
                  items.push({
                    name,
                    path: fPath,
                    url: "",
                    kind: "folder",
                  });
                }
                continue;
              }

              const name = item.Key.split("/").pop() || item.Key;
              const url = resolvePublicUrl(item.Key);
              items.push({
                name,
                path: item.Key,
                url,
                kind: "file",
                mimeType: getMimeType(name),
                sizeBytes: item.Size,
                createdAt: item.LastModified?.toISOString(),
                updatedAt: item.LastModified?.toISOString(),
              });
            }
          }

          continuationToken = res.IsTruncated
            ? res.NextContinuationToken
            : undefined;
        } while (continuationToken && items.length < maxLimit);

        return items;
      } catch (error) {
        console.error("S3 list error:", error);
        return [];
      }
    },

    /**
     * Creates a virtual folder placeholder object in S3.
     */
    async createFolder(
      folderPath: string,
      name: string,
    ): Promise<{ path: string; name: string }> {
      const client = getClient();
      const cleanFolder = cleanPath(folderPath);
      const safeName = name.trim().replace(/[^a-zA-Z0-9._-]/g, "");
      const fullPath = cleanFolder ? `${cleanFolder}/${safeName}` : safeName;

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: `${fullPath}/.keep`,
          Body: Buffer.from(""),
          ContentType: "text/plain",
        }),
      );

      return { path: fullPath, name: safeName };
    },

    /**
     * Moves/renames an S3 object (copies to destination then deletes source).
     */
    async move(
      sourcePath: string,
      targetPath: string,
    ): Promise<{ from: string; to: string }> {
      const client = getClient();
      const cleanSource = cleanPath(sourcePath);
      const cleanTarget = cleanPath(targetPath);

      await client.send(
        new CopyObjectCommand({
          Bucket: config.bucket,
          CopySource: `${config.bucket}/${encodeURIComponent(cleanSource)}`,
          Key: cleanTarget,
        }),
      );

      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: cleanSource,
        }),
      );

      return { from: cleanSource, to: cleanTarget };
    },

    /**
     * Renames an S3 object within its parent directory.
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
     * Checks if an S3 object exists using HEAD request.
     */
    async exists(path: string): Promise<boolean> {
      if (!path) return false;
      const client = getClient();
      const key = cleanPath(path);

      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }),
        );
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Downloads an S3 object's content as a Buffer.
     */
    async getBuffer(path: string): Promise<Buffer | null> {
      if (!path) return null;
      const client = getClient();
      const key = cleanPath(path);

      try {
        const res = await client.send(
          new GetObjectCommand({
            Bucket: config.bucket,
            Key: key,
          }),
        );

        if (!res.Body) return null;
        return streamToBuffer(res.Body as any);
      } catch {
        return null;
      }
    },

    /**
     * Verifies S3 bucket connectivity and credentials.
     */
    async verify(): Promise<{ success: boolean; error?: string }> {
      try {
        const client = getClient();
        await client.send(
          new HeadBucketCommand({
            Bucket: config.bucket,
          }),
        );
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error?.message || "Failed to verify S3 bucket access",
        };
      }
    },
  };
}
