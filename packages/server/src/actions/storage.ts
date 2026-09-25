"use server";

import { auth } from "@nishchinte/auth/server";
import { getMimeType } from "@nishchinte/storage";
import { storage } from "../lib/storage";
import type {
  StorageItem,
  UploadResult,
  AllowedStorageType,
} from "@nishchinte/storage";
import { safeRevalidate } from "./utils";

export type StorageSortKey = "name" | "createdAt" | "sizeBytes";
export type StorageSortDirection = "asc" | "desc";

export interface ListStorageInput {
  path?: string;
  query?: string;
  recursive?: boolean;
  types?: AllowedStorageType | AllowedStorageType[];
  includeFolders?: boolean;
  sortKey?: StorageSortKey;
  sortDirection?: StorageSortDirection;
  limit?: number;
  offset?: number;
}

export interface ListStorageResult {
  ok: true;
  items: StorageItem[];
  total: number;
  nextOffset: number | null;
}

export interface StorageActionError {
  ok: false;
  error: string;
}

function compareValues(
  a: string | number,
  b: string | number,
  direction: StorageSortDirection,
) {
  if (a < b) return direction === "asc" ? -1 : 1;
  if (a > b) return direction === "asc" ? 1 : -1;
  return 0;
}

/**
 * Server Action: Lists items and folders within the configured storage driver.
 */
export async function listStorageAction(
  input: ListStorageInput = {},
): Promise<ListStorageResult | StorageActionError> {
  try {
    await auth.admin.requireUser();

    const parentPath = input.path || "";
    const isSearching = Boolean(input.query?.trim());
    const isRecursive = input.recursive ?? isSearching;

    const rawItems = await storage.list(parentPath, {
      types: input.types,
      includeFolders: input.includeFolders,
      recursive: isRecursive,
      limit: input.limit,
    });
    const query = input.query?.trim().toLowerCase();

    const items: StorageItem[] = (
      await Promise.all(
        rawItems.map(async (item) => {
          const isFolder = item.kind === "folder";
          const url = isFolder
            ? ""
            : item.url || (await storage.getUrl(item.path));
          return {
            ...item,
            url,
            mimeType: isFolder
              ? undefined
              : item.mimeType || getMimeType(item.name),
          };
        }),
      )
    ).filter((item) =>
      query ? item.name.toLowerCase().includes(query) : true,
    );

    const sortKey = input.sortKey ?? "name";
    const sortDirection = input.sortDirection ?? "asc";

    const sorted = [...items].sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "folder" ? -1 : 1;
      }
      if (sortKey === "name") {
        return compareValues(
          a.name.toLowerCase(),
          b.name.toLowerCase(),
          sortDirection,
        );
      }
      if (sortKey === "sizeBytes") {
        return compareValues(a.sizeBytes ?? 0, b.sizeBytes ?? 0, sortDirection);
      }
      return compareValues(
        new Date(a.createdAt ?? 0).getTime(),
        new Date(b.createdAt ?? 0).getTime(),
        sortDirection,
      );
    });

    const limit = Math.max(1, Math.min(100, input.limit ?? 50));
    const offset = Math.max(0, input.offset ?? 0);
    const pageItems = sorted.slice(offset, offset + limit);

    return {
      ok: true,
      items: pageItems,
      total: sorted.length,
      nextOffset:
        sorted.length > offset + pageItems.length
          ? offset + pageItems.length
          : null,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Failed to list storage items",
    };
  }
}

/**
 * Server Action: Creates a new directory/folder inside the storage provider.
 */
export async function createStorageFolderAction(input: {
  path?: string;
  name: string;
}): Promise<
  { ok: true; folder: { path: string; name: string } } | StorageActionError
> {
  try {
    await auth.admin.requireUser();

    if (!input.name || !input.name.trim()) {
      return { ok: false, error: "Folder name is required" };
    }

    const folder = await storage.createFolder(
      input.path || "",
      input.name.trim(),
    );
    await safeRevalidate("/admin/content");

    return { ok: true, folder };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Failed to create folder",
    };
  }
}

/**
 * Server Action: Uploads files from FormData to storage.
 */
export async function uploadStorageAction(formData: FormData): Promise<
  | {
      ok: true;
      uploads: UploadResult[];
      url?: string;
      path?: string;
      name?: string;
    }
  | StorageActionError
> {
  try {
    await auth.admin.requireUser();

    const rawFiles = [
      ...formData.getAll("file"),
      ...formData.getAll("files"),
    ] as File[];

    const files = rawFiles.filter((f) => typeof f !== "string" && f && f.name);

    if (files.length === 0) {
      return { ok: false, error: "No files provided for upload" };
    }

    const parentPath =
      (formData.get("path") as string) ||
      (formData.get("parentPath") as string) ||
      "";

    const uploads: UploadResult[] = [];
    for (const file of files) {
      const result = await storage.upload(file, {
        path: parentPath,
        filename: file.name,
        mimeType: file.type,
      });
      uploads.push(result);
    }

    await safeRevalidate("/admin/content");

    return {
      ok: true,
      uploads,
      url: uploads[0]?.url,
      path: uploads[0]?.path,
      name: uploads[0]?.name,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Failed to upload file",
    };
  }
}

/**
 * Server Action: Renames an existing file or directory in storage.
 */
export async function renameStorageItemAction(input: {
  path: string;
  nextName: string;
}): Promise<
  { ok: true; item: { from: string; to: string } } | StorageActionError
> {
  try {
    await auth.admin.requireUser();

    if (!input.path || !input.nextName) {
      return { ok: false, error: "Path and new name are required" };
    }

    const res = await storage.rename(input.path, input.nextName.trim());
    await safeRevalidate("/admin/content");

    return { ok: true, item: res };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Failed to rename item",
    };
  }
}

/**
 * Server Action: Moves one or more files/folders to a new parent path.
 */
export async function moveStorageItemsAction(input: {
  paths: string[];
  destinationPath?: string;
}): Promise<
  { ok: true; moved: Array<{ from: string; to: string }> } | StorageActionError
> {
  try {
    await auth.admin.requireUser();

    if (!input.paths || input.paths.length === 0) {
      return { ok: false, error: "No paths provided to move" };
    }

    const destination = input.destinationPath || "";
    const moved: Array<{ from: string; to: string }> = [];

    for (const itemPath of input.paths) {
      const segments = itemPath.split("/").filter(Boolean);
      const filename = segments[segments.length - 1] || itemPath;
      const targetPath = destination ? `${destination}/${filename}` : filename;
      const res = await storage.move(itemPath, targetPath);
      moved.push(res);
    }

    await safeRevalidate("/admin/content");

    return { ok: true, moved };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Failed to move items",
    };
  }
}

/**
 * Server Action: Deletes one or multiple files or folders from storage.
 */
export async function deleteStorageItemsAction(
  input: { paths: string[] } | string[],
): Promise<{ ok: true; deleted: string[] } | StorageActionError> {
  try {
    await auth.admin.requireUser();

    const paths = Array.isArray(input) ? input : input?.paths;
    if (!paths || paths.length === 0) {
      return { ok: false, error: "No paths provided for deletion" };
    }

    const deleted = await storage.deleteMany(paths);
    await safeRevalidate("/admin/content");

    return { ok: true, deleted };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Failed to delete storage items",
    };
  }
}

/**
 * Server Action: Generates or resolves the public or signed URL for a file path.
 */
export async function getStorageUrlAction(
  path: string,
  options?: { expiresIn?: number },
): Promise<{ ok: true; url: string; path: string } | StorageActionError> {
  try {
    await auth.admin.requireUser();

    if (!path) {
      return { ok: false, error: "File path is required" };
    }

    const url = await storage.getUrl(path, options);
    return { ok: true, url, path };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Failed to get file URL",
    };
  }
}
