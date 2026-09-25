import { s3Storage } from "./s3";
import type { StoragePlugin, R2Config } from "../types";

/**
 * Creates a Cloudflare R2 storage driver plugin.
 *
 * Cloudflare R2 provides S3-compatible object storage with zero egress fees.
 * Configures optimal S3 presets (such as auto region) for Cloudflare R2.
 *
 * @param config - The {@link R2Config} configuration options.
 * @returns A {@link StoragePlugin} instance configured for Cloudflare R2.
 *
 * @example
 * ```typescript
 * import { r2Storage } from "@nishchinte/storage";
 *
 * export const storage = r2Storage({
 *   endpoint: process.env.R2_ENDPOINT!,
 *   accessKeyId: process.env.R2_ACCESS_KEY_ID!,
 *   secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
 *   bucket: "my-media-bucket",
 *   publicUrl: "https://media.mysite.com",
 * });
 * ```
 */
export function r2Storage(config: R2Config): StoragePlugin {
  const baseS3 = s3Storage({
    bucket: config.bucket,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: "auto",
    endpoint: config.endpoint,
    publicUrl: config.publicUrl,
  });

  return {
    ...baseS3,
    name: "r2",
  };
}
