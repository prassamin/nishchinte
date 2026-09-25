"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";

import { useDebounce } from "@nishchinte/hooks";
import { actions } from "@nishchinte/server/actions";
import type { ContentItem, SortDirection, SortKey } from "./types";

function uploadFileWithProgress(
  path: string,
  file: File,
  onProgress: (loaded: number, total: number) => void,
): Promise<{ url: string; path: string; name: string; mimeType?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `/api/v1/admin/media/upload`;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.ok) {
            resolve({
              url: res.url || res.uploads?.[0]?.url || "",
              path: res.path || res.uploads?.[0]?.path || "",
              name: res.name || res.uploads?.[0]?.name || file.name,
              mimeType: res.mimeType || res.uploads?.[0]?.mimeType || file.type,
            });
          } else {
            reject(new Error(res.error || "Upload failed"));
          }
        } catch {
          resolve({ url: "", path, name: file.name, mimeType: file.type });
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText || xhr.status}`));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Upload failed: network error")),
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("parentPath", path);

    xhr.open("POST", url, true);
    xhr.send(formData);
  });
}

export function useContentManager() {
  const queryClient = useQueryClient();

  const [currentPath, setCurrentPath] = useState<string>("/");
  const [rootPath] = useState<string>("/");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(["/"]),
  );
  const [loadingTreePaths, setLoadingTreePaths] = useState<Set<string>>(
    new Set(),
  );
  const [folderTree, setFolderTree] = useState<Record<string, ContentItem[]>>(
    {},
  );

  type UploadFileItem = {
    id: string;
    name: string;
    size: number;
    path: string;
    status: "pending" | "uploading" | "done" | "error";
    percent: number;
    loaded: number;
    error?: string;
  };
  const [uploadQueue, setUploadQueue] = useState<UploadFileItem[]>([]);

  const debouncedSearch = useDebounce(search.trim(), 300);

  const listQuery = useQuery({
    queryKey: [
      "content-manager",
      currentPath,
      debouncedSearch,
      sortKey,
      sortDirection,
    ],
    queryFn: async () => {
      if (!currentPath) {
        return { items: [], total: 0, nextOffset: null };
      }

      const res = await actions.storage.list({
        path: currentPath,
        query: debouncedSearch || undefined,
        sortKey,
        sortDirection,
        limit: 100,
        offset: 0,
      });
      console.log(res);
      if (!res.ok) {
        throw new Error(res.error || "Failed to load content");
      }

      return {
        items: res.items as ContentItem[],
        total: res.total,
        nextOffset: res.nextOffset,
      };
    },
    enabled: !!currentPath,
    staleTime: 10_000,
  });

  const items = listQuery.data?.items ?? [];

  const folders = useMemo(
    () => items.filter((item) => item.kind === "folder"),
    [items],
  );

  useEffect(() => {
    if (!currentPath) return;
    if (!listQuery.data) return;

    const nextFolders = listQuery.data.items.filter(
      (item) => item.kind === "folder",
    );

    setFolderTree((prev) => {
      const prevFolders = prev[currentPath] ?? [];

      const isSameLength = prevFolders.length === nextFolders.length;
      const isSameByPath =
        isSameLength &&
        prevFolders.every(
          (item, index) => item.path === nextFolders[index]?.path,
        );

      if (isSameByPath) return prev;

      return {
        ...prev,
        [currentPath]: nextFolders,
      };
    });
  }, [currentPath, listQuery.dataUpdatedAt]);

  const files = useMemo(
    () => items.filter((item) => item.kind === "file"),
    [items],
  );

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!currentPath) throw new Error("Path not ready");
      const res = await actions.storage.createFolder({
        path: currentPath,
        name,
      });
      if (!res.ok) throw new Error(res.error || "Folder create failed");
      return res.folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["content-manager"],
      });
      toast.success("Folder created successfully");
    },
    onError: (err: any) => {
      toast.danger(err?.message || "Failed to create folder");
    },
  });

  const CONCURRENCY = 3;
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const uploadMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      if (!currentPath) throw new Error("Path not ready");
      if (filesToUpload.length === 0) return;

      const validFiles: File[] = [];
      const queue: UploadFileItem[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        if (file.size > MAX_FILE_SIZE) {
          queue.push({
            id: `${Date.now()}-skipped-${file.name}`,
            name: file.name,
            size: file.size,
            path: "",
            status: "error",
            percent: 0,
            loaded: 0,
            error: `Maximum file size is ${(
              MAX_FILE_SIZE /
              (1024 * 1024)
            ).toFixed(0)}MB`,
          });
        } else {
          validFiles.push(file);
          queue.push({
            id: `${Date.now()}-${i}`,
            name: file.name,
            size: file.size,
            path: `${currentPath}/${file.name}`,
            status: "pending",
            percent: 0,
            loaded: 0,
          });
        }
      }

      setUploadQueue([...queue]);

      if (validFiles.length === 0) {
        setTimeout(() => setUploadQueue([]), 8000);
        return [];
      }

      const uploadedItems: Array<{
        path: string;
        name: string;
        size?: number;
        type?: string;
      }> = [];

      const worker = async () => {
        while (true) {
          const idx = queue.findIndex((q) => q.status === "pending");
          if (idx === -1) break;

          const item = queue[idx];
          const file = validFiles.find((f) => f.name === item.name);
          if (!item || !file) continue;

          item.status = "uploading";
          item.percent = 0;
          setUploadQueue([...queue]);

          try {
            const uploaded = await uploadFileWithProgress(
              currentPath,
              file,
              (loaded, total) => {
                item.percent = total ? Math.round((loaded / total) * 100) : 0;
                item.loaded = loaded;
                setUploadQueue([...queue]);
              },
            );

            item.status = "done";
            item.percent = 100;
            uploadedItems.push({
              path: uploaded.path || item.path,
              name: item.name,
              size: item.size,
              type: file.type,
            });
          } catch (err: any) {
            item.status = "error";
            item.error = err?.message || "Upload failed";
          }
          setUploadQueue([...queue]);
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
      setTimeout(() => setUploadQueue([]), 8000);
      return uploadedItems;
    },
    onSuccess: (data, filesToUpload) => {
      const uploadedCount = data?.length ?? 0;
      const failedCount = filesToUpload.length - uploadedCount;
      if (uploadedCount === 0) {
        // All skipped or failed - errors shown in panel
      } else if (failedCount > 0) {
        toast.warning(`${uploadedCount} files uploaded, ${failedCount} failed`);
      } else {
        toast.success(`${uploadedCount} files uploaded successfully`);
      }
      queryClient.invalidateQueries({
        queryKey: ["content-manager"],
      });
    },
    onError: (err: any) => {
      toast.danger(err?.message || "Failed to upload files");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (paths: string[]) => {
      const res = await actions.storage.delete(paths);
      if (!res.ok) throw new Error(res.error || "Delete failed");
      return res.deleted;
    },
    onSuccess: () => {
      setSelectedPaths(new Set());
      queryClient.invalidateQueries({
        queryKey: ["content-manager"],
      });
      toast.success("Items deleted successfully");
    },
    onError: (err: any) => {
      toast.danger(err?.message || "Failed to delete items");
    },
  });

  const openFolder = (item: ContentItem) => {
    if (item.kind !== "folder") return;
    setSelectedPaths(new Set());
    setCurrentPath(item.path);
  };

  const ensureAncestorsExpanded = (path: string) => {
    if (!rootPath || !path.startsWith(rootPath)) return;

    const segments = path.split("/").filter(Boolean);
    const rootSegments = rootPath.split("/").filter(Boolean);
    const ancestorSet = new Set<string>(expandedPaths);

    for (let i = rootSegments.length; i <= segments.length; i += 1) {
      const candidate = segments.slice(0, i).join("/");
      if (candidate) ancestorSet.add(candidate);
    }

    setExpandedPaths(ancestorSet);
  };

  const goToPath = (path: string) => {
    setSelectedPaths(new Set());
    setCurrentPath(path);
    ensureAncestorsExpanded(path);
  };

  const toggleSelect = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedPaths(new Set());

  const loadFolderChildren = async (path: string, force = false) => {
    if (!force && folderTree[path]) return;

    setLoadingTreePaths((prev) => new Set(prev).add(path));

    try {
      const res = await actions.storage.list({
        path,
        limit: 100,
        offset: 0,
        sortKey: "name",
        sortDirection: "asc",
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to load folders");
      }

      setFolderTree((prev) => ({
        ...prev,
        [path]: res.items.filter(
          (item) => item.kind === "folder",
        ) as ContentItem[],
      }));
    } catch (err: any) {
      toast.danger(err?.message || "Failed to load folder tree");
    } finally {
      setLoadingTreePaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  };

  const toggleExpandPath = async (path: string) => {
    const isOpen = expandedPaths.has(path);

    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });

    if (!isOpen) {
      await loadFolderChildren(path);
    }
  };

  const reloadCurrent = async () => {
    if (!currentPath) return;
    await queryClient.invalidateQueries({
      queryKey: ["content-manager"],
    });
    await loadFolderChildren(currentPath, true);
  };

  const parentPath = useMemo(() => {
    if (!currentPath || !rootPath || currentPath === rootPath) return null;
    const idx = currentPath.lastIndexOf("/");
    if (idx <= 0) return rootPath;
    const candidate = currentPath.slice(0, idx);
    if (candidate.length < rootPath.length) return rootPath;
    return candidate;
  }, [currentPath, rootPath]);

  const goUp = () => {
    if (!parentPath) return;
    goToPath(parentPath);
  };

  const selectAllVisible = () => {
    setSelectedPaths(new Set(items.map((item) => item.path)));
  };

  return {
    currentPath,
    rootPath,
    parentPath,
    search,
    sortKey,
    sortDirection,
    selectedPaths,
    items,
    folders,
    files,
    folderTree,
    expandedPaths,
    loadingTreePaths,
    isFetching: listQuery.isFetching,
    errorMessage:
      listQuery.error instanceof Error ? listQuery.error.message : null,
    setSearch,
    setSortKey,
    setSortDirection,
    openFolder,
    goToPath,
    toggleSelect,
    clearSelection,
    selectAllVisible,
    goUp,
    toggleExpandPath,
    reloadCurrent,
    createFolder: (name: string) => createFolderMutation.mutateAsync(name),
    isCreatingFolder: createFolderMutation.isPending,
    uploadFiles: (filesToUpload: File[]) =>
      uploadMutation.mutate(filesToUpload),
    isUploading: uploadMutation.isPending,
    uploadQueue,
    clearUploadQueue: () => setUploadQueue([]),
    deleteSelected: async () =>
      await deleteMutation.mutateAsync(Array.from(selectedPaths)),
    deletePaths: (paths: string[]) => deleteMutation.mutate(paths),
    isDeleting: deleteMutation.isPending,
  };
}
