import type {
  StorageItem,
  StorageSortKey,
  StorageSortDirection,
  ListStorageInput,
  ListStorageResult,
} from "@nishchinte/server/actions";

export type ContentItemKind = "file" | "folder";

export interface ContentItem extends StorageItem {
  parentPath?: string;
}

export type SortKey = StorageSortKey;
export type SortDirection = StorageSortDirection;
export type ListContentInput = ListStorageInput;
export type ListContentResult = ListStorageResult;
