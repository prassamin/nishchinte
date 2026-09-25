// Plugins
export { s3Storage } from "./plugins/s3";
export { r2Storage } from "./plugins/r2";
export { supabaseStorage } from "./plugins/supabase";
export { localStorage } from "./plugins/local";
export { memoryStorage } from "./plugins/memory";
export { cloudinaryStorage } from "./plugins/cloudinary";

// Client & Config Helpers
export { createStorageClient, defineStorageConfig } from "./client";
export type { StorageClient } from "./client";

// MIME & Path Helpers
export { getMimeType, matchesAllowedType, MIME_TYPE_MAP } from "./mime";
export { cleanPath, joinStoragePath, sanitizeFilename } from "./utils";

// Types
export type {
  StorageItem,
  StorageFileInput,
  UploadOptions,
  UploadResult,
  GetUrlOptions,
  ListOptions,
  StorageMediaType,
  StorageMimeType,
  AllowedStorageType,
  StoragePlugin,
  S3Config,
  R2Config,
  SupabaseStorageConfig,
  LocalStorageConfig,
  MemoryStorageConfig,
  CloudinaryConfig,
} from "./types";
