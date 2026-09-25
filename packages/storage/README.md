# @nishchinte/storage

Unified cloud and local file storage engine for the **Nishchinte** e-commerce platform. Features multi-driver support (AWS S3, Cloudflare R2, Supabase Storage, Cloudinary, Local Disk, In-Memory), automatic MIME type inference, folder hierarchies, and file management operations.

---

## Features

- **Multi-Driver Architecture**: Switch seamlessly between Cloudflare R2, AWS S3, Supabase, Local Disk, Cloudinary, or In-Memory storage.
- **Full File Manager Operations**: Upload, delete, move, rename, recursive directory listing, and folder creation with unified semantics.
- **Universal Input Types**: Accepts `Buffer`, `Uint8Array`, `ArrayBuffer`, `Blob`, `File`, Node.js `ReadableStream`, and base64 strings.
- **Automatic MIME Inference**: Comprehensive MIME type dictionary mapping 100+ extensions with fast type categorization (`image`, `video`, `document`, etc.).
- **URL Resolution**: Automatic generation of public CDN URLs and time-limited presigned private URLs.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/storage": "workspace:*"
  }
}
```

---

## Storage Drivers

### 1. Cloudflare R2 (`r2Storage`)
Fast, zero-egress fee S3-compatible cloud storage.

```typescript
import { r2Storage } from "@nishchinte/storage";

const storage = r2Storage({
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucket: "nishchinte-media",
  publicUrl: "https://cdn.nishchinte.com",
});
```

### 2. Amazon S3 / S3-Compatible (`s3Storage`)
Standard AWS S3 or compatible services (MinIO, Wasabi, Tigris).

```typescript
import { s3Storage } from "@nishchinte/storage";

const storage = s3Storage({
  bucket: "my-store-bucket",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: "us-east-1",
});
```

### 3. Supabase Storage (`supabaseStorage`)
Integrated Supabase project bucket storage.

```typescript
import { supabaseStorage } from "@nishchinte/storage";

const storage = supabaseStorage({
  url: process.env.SUPABASE_URL!,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  bucket: "media",
});
```

### 4. Local Filesystem (`localStorage`)
Local disk storage serving files from your Next.js `public/` folder during development.

```typescript
import { localStorage } from "@nishchinte/storage";

const storage = localStorage({
  basePath: "./public/uploads",
  publicPath: "/uploads",
});
```

### 5. In-Memory Mock (`memoryStorage`)
Fast ephemeral memory storage for automated tests and CI pipelines.

```typescript
import { memoryStorage } from "@nishchinte/storage";

const storage = memoryStorage();
```

---

## Quick Start & Usage

```typescript
import { createStorageClient, r2Storage } from "@nishchinte/storage";

const storage = createStorageClient(
  r2Storage({
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucket: "media-bucket",
    publicUrl: "https://cdn.example.com",
  })
);

// 1. Upload file
const file = await storage.upload(imageBuffer, {
  path: "products/summer",
  filename: "tshirt-front.webp",
  preserveFilename: true,
});
console.log("Uploaded URL:", file.url);

// 2. List directory items
const items = await storage.list("products/summer", {
  types: "image",
});

// 3. Rename or Move items
await storage.rename("products/summer/tshirt-front.webp", "tshirt-primary.webp");
await storage.move("products/summer/tshirt-primary.webp", "archive/summer/tshirt-primary.webp");

// 4. Delete items
await storage.delete("archive/summer/tshirt-primary.webp");
```

---

## Configuration (`nishchinte.config.ts`)

```typescript
import { defineConfig } from "@nishchinte/config";
import { localStorage, r2Storage } from "@nishchinte/storage";

export default defineConfig({
  storage: process.env.NODE_ENV === "production"
    ? r2Storage({
        accountId: process.env.R2_ACCOUNT_ID!,
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        bucket: "nishchinte-prod",
        publicUrl: "https://media.nishchinte.com",
      })
    : localStorage({
        basePath: "./public/uploads",
        publicPath: "/uploads",
      }),
});
```

---

## API Reference

### `StorageClient` Interface

| Method | Signature | Description |
| :--- | :--- | :--- |
| `upload(file, options?)` | `(file: StorageFileInput, options?: UploadOptions) => Promise<UploadResult>` | Uploads a file and returns accessible URL & metadata. |
| `getUrl(path, options?)` | `(path: string, options?: GetUrlOptions) => Promise<string>` | Resolves public or signed temporary URL. |
| `list(folderPath?, options?)` | `(folderPath?: string, options?: ListOptions) => Promise<StorageItem[]>` | Lists files and subdirectories. |
| `createFolder(folderPath, name)` | `(folderPath: string, name: string) => Promise<{ path: string, name: string }>` | Creates directory placeholder. |
| `rename(filePath, nextName)` | `(filePath: string, nextName: string) => Promise<{ from: string, to: string }>` | Renames file/folder in place. |
| `move(sourcePath, targetPath)` | `(sourcePath: string, targetPath: string) => Promise<{ from: string, to: string }>` | Moves file/folder to new target directory. |
| `delete(path)` | `(path: string) => Promise<boolean>` | Deletes a single file. |
| `deleteMany(paths)` | `(paths: string[]) => Promise<string[]>` | Deletes multiple files in bulk. |
| `verify()` | `() => Promise<{ success: boolean, error?: string }>` | Diagnostics and credentials check. |

---

## Related Packages

- [`@nishchinte/config`](file:///mnt/workspace/Git/ecom/packages/config/README.md) - Storage plugin registration.
- [`@nishchinte/server`](file:///mnt/workspace/Git/ecom/packages/server/README.md) - Storage Server Actions for the admin file manager.
- [`@nishchinte/admin-panel`](file:///mnt/workspace/Git/ecom/packages/admin-panel/README.md) - Visual media library browser and uploader UI.
