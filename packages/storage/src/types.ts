/**
 * Represents a file or folder item stored in the storage backend.
 */
export interface StorageItem {
  /**
   * File or folder name (e.g. "banner.webp", "documents").
   */
  name: string;

  /**
   * Relative path/key of the item within the storage root (e.g. "media/products/banner.webp").
   */
  path: string;

  /**
   * Public or accessible URL to view/download the item (empty for folders).
   */
  url: string;

  /**
   * Item type: "file" or "folder".
   */
  kind: "file" | "folder";

  /**
   * File size in bytes (undefined for folders).
   */
  sizeBytes?: number;

  /**
   * MIME content type (e.g. "image/webp", "application/pdf").
   */
  mimeType?: string;

  /**
   * ISO 8601 creation timestamp if available.
   */
  createdAt?: string;

  /**
   * ISO 8601 last modified timestamp if available.
   */
  updatedAt?: string;
}

/**
 * Universal file input type accepted by `storage.upload()`.
 */
export type StorageFileInput =
  | Buffer
  | Uint8Array
  | ArrayBuffer
  | Blob
  | File
  | NodeJS.ReadableStream
  | ReadableStream
  | string;

/**
 * Options for file upload operations.
 */
export interface UploadOptions {
  /**
   * Target folder or subfolder path (e.g. "media", "products/images").
   * @default ""
   */
  path?: string;

  /**
   * Desired filename. If omitted, will be extracted from the file object or set to "upload".
   */
  filename?: string;

  /**
   * Explicit MIME content type. If omitted, will be inferred from the filename.
   */
  mimeType?: string;

  /**
   * If true, keeps the exact filename without prepending a timestamp prefix.
   * @default false
   */
  preserveFilename?: boolean;

  /**
   * Custom key/value metadata to attach to the object.
   */
  metadata?: Record<string, string>;
}

/**
 * Standard result returned after a successful file upload.
 */
export interface UploadResult {
  /**
   * Public or accessible URL to the uploaded file.
   */
  url: string;

  /**
   * Relative path/key of the uploaded file in the storage backend.
   */
  path: string;

  /**
   * Cleaned filename of the uploaded file.
   */
  name: string;

  /**
   * Size of the uploaded file in bytes.
   */
  size: number;

  /**
   * MIME content type of the uploaded file.
   */
  mimeType?: string;
}

/**
 * Options for retrieving or generating file URLs.
 */
export interface GetUrlOptions {
  /**
   * URL expiration time in seconds (for signed/temporary URLs).
   */
  expiresIn?: number;

  /**
   * Force download header or specify custom download filename.
   */
  download?: boolean | string;
}

/**
 * Standard top-level media category names for filtering.
 */
export type StorageMediaType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "text"
  | "font"
  | "application";

/**
 * Common standard MIME types for autocomplete support.
 */
export type StorageMimeType =
  | "image/*"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "image/svg+xml"
  | "image/avif"
  | "video/*"
  | "video/mp4"
  | "video/webm"
  | "video/quicktime"
  | "audio/*"
  | "audio/mpeg"
  | "audio/wav"
  | "audio/ogg"
  | "application/pdf"
  | "application/json"
  | "application/zip"
  | "text/plain"
  | "text/csv"
  | "text/html"
  | "text/markdown";

/**
 * Autocomplete-friendly type filter. Accepts media categories, MIME types, file extensions, or custom strings.
 */
export type AllowedStorageType =
  | StorageMediaType
  | StorageMimeType
  | (string & {});

/**
 * Options for listing files and folders.
 */
export interface ListOptions {
  /**
   * Whether to recursively list all subdirectories.
   * @default false
   */
  recursive?: boolean;

  /**
   * Maximum number of items to return.
   * @default 100
   */
  limit?: number;

  /**
   * Pagination cursor or offset.
   */
  cursor?: string;

  /**
   * Filter items by MIME type, media category (e.g. "image", "video"), or file extension (e.g. "png", "pdf").
   *
   * @example "image" -> matches all image formats
   * @example "image/*" -> matches all image formats
   * @example ["image/jpeg", "image/png"] -> matches specific MIME types
   * @example ["pdf", "docx"] -> matches specific file extensions
   */
  types?: AllowedStorageType | AllowedStorageType[];

  /**
   * Whether to include folders in the result when filtering by types.
   * @default true
   */
  includeFolders?: boolean;
}

/**
 * Core interface that every storage driver/plugin must implement.
 */
export interface StoragePlugin {
  /**
   * Unique identifier of the plugin driver (e.g. "s3", "r2", "supabase", "local", "memory").
   */
  readonly name: string;

  /**
   * Uploads a file to the storage provider.
   *
   * @param file - File content as Buffer, Blob, File, Uint8Array, Stream, or string.
   * @param options - Upload options including path, filename, and mimeType.
   * @returns A promise resolving to an {@link UploadResult}.
   */
  upload(file: StorageFileInput, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Resolves the public or accessible URL for a given file path.
   *
   * @param path - Relative storage path or key.
   * @param options - URL generation options (such as expiration).
   * @returns A promise resolving to the URL string.
   */
  getUrl(path: string, options?: GetUrlOptions): Promise<string>;

  /**
   * Deletes a single file by its path/key.
   *
   * @param path - Relative storage path or key.
   * @returns A promise resolving to `true` if deleted or `false` if not found or failed.
   */
  delete(path: string): Promise<boolean>;

  /**
   * Deletes multiple files at once.
   *
   * @param paths - Array of relative storage paths or keys.
   * @returns A promise resolving to the list of deleted paths.
   */
  deleteMany(paths: string[]): Promise<string[]>;

  /**
   * Lists files and folders under a given directory.
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
   * Moves or renames an item from one path to another.
   *
   * @param sourcePath - Original path or key.
   * @param targetPath - Destination path or key.
   * @returns A promise resolving to `{ from, to }`.
   */
  move(sourcePath: string, targetPath: string): Promise<{ from: string; to: string }>;

  /**
   * Renames an item within its current folder.
   *
   * @param filePath - Current path.
   * @param nextName - New name for the item.
   * @returns A promise resolving to `{ from, to }`.
   */
  rename(filePath: string, nextName: string): Promise<{ from: string; to: string }>;

  /**
   * Checks if an item exists at the specified path.
   *
   * @param path - Relative storage path or key.
   * @returns A promise resolving to `true` if exists, `false` otherwise.
   */
  exists?(path: string): Promise<boolean>;

  /**
   * Downloads a file's raw binary buffer.
   *
   * @param path - Relative storage path or key.
   * @returns A promise resolving to the file Buffer or null if not found.
   */
  getBuffer?(path: string): Promise<Buffer | null>;

  /**
   * Diagnostic check to verify connectivity and credentials with the storage provider.
   *
   * @returns A promise resolving to `{ success: true }` or `{ success: false, error: string }`.
   */
  verify?(): Promise<{ success: boolean; error?: string }>;
}

/**
 * Configuration options for the S3-compatible storage plugin (AWS S3, Tigris, MinIO, Wasabi, etc.).
 */
export interface S3Config {
  /**
   * Name of the S3 bucket.
   */
  bucket: string;

  /**
   * S3 access key ID.
   */
  accessKeyId: string;

  /**
   * S3 secret access key.
   */
  secretAccessKey: string;

  /**
   * AWS / S3 region (e.g. "us-east-1", "auto").
   * @default "auto"
   */
  region?: string;

  /**
   * S3 API endpoint URL (e.g. "https://fly.storage.tigris.dev", "https://s3.us-east-1.amazonaws.com").
   */
  endpoint?: string;

  /**
   * Public base URL or CDN domain serving files (e.g. "https://cdn.mysite.com" or "https://fly.storage.tigris.dev/my-bucket").
   */
  publicUrl?: string;

  /**
   * Whether to force path style URLs (e.g. `http://endpoint/bucket/key`).
   * Useful for MinIO and local S3 emulators.
   * @default false
   */
  forcePathStyle?: boolean;
}

/**
 * Configuration options for the Cloudflare R2 storage plugin.
 */
export interface R2Config {
  /**
   * Cloudflare R2 Endpoint
   */
  endpoint: string;

  /**
   * Cloudflare R2 Access Key ID.
   */
  accessKeyId: string;

  /**
   * Cloudflare R2 Secret Access Key.
   */
  secretAccessKey: string;

  /**
   * Name of the R2 bucket.
   */
  bucket: string;

  /**
   * Public URL or custom domain connected to the bucket (e.g. "https://pub-xxxx.r2.dev" or "https://media.mysite.com").
   */
  publicUrl?: string;
}

/**
 * Configuration options for the Supabase Storage plugin.
 */
export interface SupabaseStorageConfig {
  /**
   * Supabase Project URL (e.g. "https://xyzcompany.supabase.co").
   */
  url: string;

  /**
   * Supabase secret key or service role (lagecy) key.
   */
  apiKey: string;

  /**
   * Storage bucket name in Supabase.
   */
  bucket: string;

  /**
   * Optional custom public CDN URL override.
   */
  publicUrl?: string;
}

/**
 * Configuration options for the Local Filesystem storage plugin.
 */
export interface LocalStorageConfig {
  /**
   * Absolute or relative path to the directory where uploads are stored on disk.
   * @default path.join(process.cwd(), "public", "uploads")
   */
  uploadDir?: string;

  /**
   * Public URL path prefix for serving local uploads in the browser.
   * @default "/uploads"
   */
  publicPath?: string;

  /**
   * Base URL origin (e.g. "http://localhost:3000" or "https://mysite.com").
   */
  baseUrl?: string;
}

/**
 * Configuration options for the In-Memory storage plugin (unit tests, CI).
 */
export interface MemoryStorageConfig {
  /**
   * Base URL prefix for in-memory simulated file URLs.
   * @default "memory://storage"
   */
  baseUrl?: string;
}

/**
 * Configuration options for the Cloudinary storage plugin.
 */
export interface CloudinaryConfig {
  /**
   * Cloudinary Cloud Name.
   */
  cloudName: string;

  /**
   * Cloudinary API Key.
   */
  apiKey: string;

  /**
   * Cloudinary API Secret.
   */
  apiSecret: string;

  /**
   * Optional default root folder name in Cloudinary (e.g. "media" or "products").
   */
  folder?: string;

  /**
   * Whether to force secure (HTTPS) URLs.
   * @default true
   */
  secure?: boolean;

  /**
   * Optional custom delivery CDN URL (e.g. "https://images.mysite.com").
   */
  deliveryUrl?: string;
}

