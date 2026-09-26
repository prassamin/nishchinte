"use client";

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

export function normalizePath(p?: string | null): string {
  if (!p || p === "/" || p === "\\" || p.trim() === "") return "/";
  const clean = p
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/");
  return clean ? "/" + clean : "/";
}

export function toStorageApiPath(p?: string | null): string {
  const norm = normalizePath(p);
  return norm === "/" ? "" : norm.replace(/^\//, "");
}

export function isImageMime(mime?: string | null) {
  return Boolean(mime && mime.startsWith("image/"));
}

export function isVideoMime(mime?: string | null) {
  return Boolean(mime && mime.startsWith("video/"));
}

export function isAudioMime(mime?: string | null) {
  return Boolean(mime && mime.startsWith("audio/"));
}

export function isMediaItem(item: ContentItem) {
  return (
    item.kind === "file" &&
    (isImageMime(item.mimeType) ||
      isVideoMime(item.mimeType) ||
      isAudioMime(item.mimeType))
  );
}

export function useCreateContentManagerState() {
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

  // Modal / Preview states
  const [isCreateFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isSubmittingFolder, setSubmittingFolder] = useState(false);
  const [isMediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

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
      normalizePath(currentPath),
      debouncedSearch,
      sortKey,
      sortDirection,
    ],
    queryFn: async () => {
      const normPath = normalizePath(currentPath);
      const apiPath = toStorageApiPath(normPath);

      const res = await actions.storage.list({
        path: apiPath,
        query: debouncedSearch || undefined,
        sortKey,
        sortDirection,
        limit: 100,
        offset: 0,
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to load content");
      }

      const normalizedItems: ContentItem[] = (res.items || []).map((item) => ({
        ...item,
        path: normalizePath(item.path),
      })) as ContentItem[];

      return {
        items: normalizedItems,
        total: res.total,
        nextOffset: res.nextOffset,
      };
    },
    enabled: true,
    staleTime: 10_000,
  });

  const items = listQuery.data?.items ?? [];

  const folders = useMemo(
    () => items.filter((item) => item.kind === "folder"),
    [items],
  );

  const mediaItems = useMemo(
    () => items.filter(isMediaItem),
    [items],
  );

  useEffect(() => {
    if (!listQuery.data) return;

    const normPath = normalizePath(currentPath);
    const nextFolders = (listQuery.data.items || []).filter(
      (item) => item.kind === "folder",
    );

    setFolderTree((prev) => {
      const prevFolders = prev[normPath] ?? [];
      const isSameLength = prevFolders.length === nextFolders.length;
      const isSameByPath =
        isSameLength &&
        prevFolders.every(
          (item, index) => item.path === nextFolders[index]?.path,
        );

      if (isSameByPath) return prev;

      return {
        ...prev,
        [normPath]: nextFolders,
      };
    });
  }, [currentPath, listQuery.dataUpdatedAt]);

  const files = useMemo(
    () => items.filter((item) => item.kind === "file"),
    [items],
  );

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const normPath = normalizePath(currentPath);
      const apiPath = toStorageApiPath(normPath);
      const res = await actions.storage.createFolder({
        path: apiPath,
        name,
      });
      if (!res.ok) throw new Error(res.error || "Folder create failed");
      return res.folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["content-manager"],
      });
      void loadFolderChildren(currentPath, true);
      toast.success("Folder created successfully");
    },
    onError: (err: any) => {
      toast.danger(err?.message || "Failed to create folder");
    },
  });

  const handleCloseFolderModal = () => {
    if (createFolderMutation.isPending || isSubmittingFolder) return;
    setCreateFolderOpen(false);
    setFolderName("");
  };

  const handleCreateFolder = async () => {
    const nextName = folderName.trim();
    if (!nextName || isSubmittingFolder) return;

    setSubmittingFolder(true);
    try {
      await createFolderMutation.mutateAsync(nextName);
      handleCloseFolderModal();
    } catch {
      // Keep modal open on failure
    } finally {
      setSubmittingFolder(false);
    }
  };

  const openPreview = (item: ContentItem) => {
    const idx = mediaItems.findIndex((i) => i.path === item.path);
    if (idx >= 0) {
      setMediaViewerIndex(idx);
    } else {
      setMediaViewerIndex(0);
    }
    setMediaViewerOpen(true);
  };

  const closePreview = () => {
    setMediaViewerOpen(false);
  };

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
          const fileToUpload = validFiles.find((f) => f.name === item.name);
          if (!fileToUpload) break;

          queue[idx] = { ...item, status: "uploading" };
          setUploadQueue([...queue]);

          try {
            const apiPath = toStorageApiPath(currentPath);
            const res = await uploadFileWithProgress(
              apiPath,
              fileToUpload,
              (loaded, total) => {
                const percent = Math.min(
                  99,
                  Math.round((loaded / total) * 100),
                );
                queue[idx] = {
                  ...queue[idx],
                  status: "uploading",
                  percent,
                  loaded,
                };
                setUploadQueue([...queue]);
              },
            );

            queue[idx] = {
              ...queue[idx],
              status: "done",
              percent: 100,
              loaded: item.size,
            };
            setUploadQueue([...queue]);
            uploadedItems.push(res);
          } catch (err: any) {
            queue[idx] = {
              ...queue[idx],
              status: "error",
              error: err?.message || "Upload failed",
            };
            setUploadQueue([...queue]);
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(CONCURRENCY, validFiles.length) },
        () => worker(),
      );
      await Promise.all(workers);

      setTimeout(() => {
        setUploadQueue([]);
      }, 5000);

      return uploadedItems;
    },
    onSuccess: () => {
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
      return { deleted: res.deleted, deletedPaths: paths };
    },
    onSuccess: ({ deleted, deletedPaths }) => {
      setSelectedPaths(new Set());
      queryClient.invalidateQueries({
        queryKey: ["content-manager"],
      });

      const normDeleted = deletedPaths.map((p) => normalizePath(p));
      const normCurrent = normalizePath(currentPath);

      // If current path was deleted or is inside a deleted path, navigate to parent
      const isInsideDeleted = normDeleted.some(
        (del) => normCurrent === del || normCurrent.startsWith(del + "/"),
      );

      let targetPath = normCurrent;
      if (isInsideDeleted) {
        const matchedDel = normDeleted.find(
          (del) => normCurrent === del || normCurrent.startsWith(del + "/"),
        );
        if (matchedDel) {
          const parts = matchedDel.split("/").filter(Boolean);
          parts.pop();
          targetPath = parts.length === 0 ? "/" : "/" + parts.join("/");
        } else {
          targetPath = "/";
        }
        setCurrentPath(targetPath);
      }

      // Clean up expandedPaths: remove deleted paths and their descendants
      setExpandedPaths((prev) => {
        const next = new Set<string>();
        for (const p of prev) {
          const isDel = normDeleted.some(
            (del) => p === del || p.startsWith(del + "/"),
          );
          if (!isDel) {
            next.add(p);
          }
        }
        const segments = targetPath.split("/").filter(Boolean);
        next.add("/");
        for (let i = 1; i <= segments.length; i++) {
          next.add("/" + segments.slice(0, i).join("/"));
        }
        return next;
      });

      // Clean up folderTree: remove deleted entries and prune from parent lists
      setFolderTree((prev) => {
        const next: Record<string, ContentItem[]> = {};
        for (const [key, val] of Object.entries(prev)) {
          const isDel = normDeleted.some(
            (del) => key === del || key.startsWith(del + "/"),
          );
          if (!isDel) {
            next[key] = val.filter(
              (item) =>
                !normDeleted.some((del) => normalizePath(item.path) === del),
            );
          }
        }
        return next;
      });

      // Force reload tree for target path and root
      void loadFolderChildren(targetPath, true);
      if (targetPath !== "/") {
        void loadFolderChildren("/", true);
      }

      toast.success(
        deleted.length === 1
          ? "Item deleted successfully"
          : `${deleted.length} items deleted successfully`,
      );
    },
    onError: (err: any) => {
      toast.danger(err?.message || "Failed to delete items");
    },
  });

  useEffect(() => {
    void loadFolderChildren("/", true);
  }, []);

  const openFolder = (item: ContentItem) => {
    if (item.kind !== "folder") return;
    goToPath(item.path);
  };

  const loadFolderChildren = async (path: string, force = false) => {
    const normPath = normalizePath(path);
    if (!force && folderTree[normPath]) return;

    setLoadingTreePaths((prev) => new Set(prev).add(normPath));

    try {
      const apiPath = toStorageApiPath(normPath);
      const res = await actions.storage.list({
        path: apiPath,
        limit: 100,
        offset: 0,
        sortKey: "name",
        sortDirection: "asc",
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to load folders");
      }

      const normalizedFolders = (res.items || [])
        .filter((item) => item.kind === "folder")
        .map((item) => ({
          ...item,
          path: normalizePath(item.path),
        })) as ContentItem[];

      setFolderTree((prev) => ({
        ...prev,
        [normPath]: normalizedFolders,
      }));
    } catch (err: any) {
      toast.danger(err?.message || "Failed to load folder tree");
    } finally {
      setLoadingTreePaths((prev) => {
        const next = new Set(prev);
        next.delete(normPath);
        return next;
      });
    }
  };

  const goToPath = (targetPath: string) => {
    setSelectedPaths(new Set());

    const normCurrent = normalizePath(currentPath);
    const normTarget = normalizePath(targetPath);

    // Case 1: Clicking the currently active folder
    if (normCurrent === normTarget) {
      const isExpanded = expandedPaths.has(normTarget);
      if (isExpanded) {
        // If it's root, keep root open, but collapse all its subfolders
        if (normTarget === "/") {
          setExpandedPaths(new Set(["/"]));
        } else {
          // Collapse normTarget and all subfolders beneath it
          setExpandedPaths((prev) => {
            const next = new Set<string>();
            for (const p of prev) {
              const normP = normalizePath(p);
              const isTargetOrChild =
                normP === normTarget || normP.startsWith(normTarget + "/");
              if (!isTargetOrChild) {
                next.add(normP);
              }
            }
            return next;
          });
        }
      } else {
        // Expand normTarget and load children
        setExpandedPaths((prev) => new Set(prev).add(normTarget));
        void loadFolderChildren(normTarget);
      }
      return;
    }

    // Case 2: Navigating from Child to Parent / Ancestor
    const isChildToParent =
      normTarget === "/"
        ? normCurrent !== "/"
        : normCurrent.startsWith(normTarget + "/");

    if (isChildToParent) {
      // Navigate to parent & collapse all deeper branches under normTarget
      setExpandedPaths((prev) => {
        const next = new Set<string>();
        for (const p of prev) {
          const normP = normalizePath(p);
          const isDescendant =
            normTarget === "/"
              ? normP !== "/"
              : normP !== normTarget && normP.startsWith(normTarget + "/");
          if (!isDescendant) {
            next.add(normP);
          }
        }
        // Ensure normTarget and all its ancestors are retained in expandedPaths
        const segments = normTarget.split("/").filter(Boolean);
        next.add("/");
        for (let i = 1; i <= segments.length; i++) {
          next.add("/" + segments.slice(0, i).join("/"));
        }
        return next;
      });
      setCurrentPath(normTarget);
      void loadFolderChildren(normTarget);
      return;
    }

    // Case 3: Navigating from Parent to Child or jumping to another branch
    // Expand normTarget and all its ancestors
    setCurrentPath(normTarget);
    setExpandedPaths((prev) => {
      const next = new Set<string>(prev);
      const segments = normTarget.split("/").filter(Boolean);
      next.add("/");
      for (let i = 1; i <= segments.length; i++) {
        next.add("/" + segments.slice(0, i).join("/"));
      }
      return next;
    });
    void loadFolderChildren(normTarget);
  };

  const toggleSelect = (path: string) => {
    const norm = normalizePath(path);
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(norm)) {
        next.delete(norm);
      } else {
        next.add(norm);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedPaths(new Set());

  const toggleExpandPath = async (path: string) => {
    goToPath(path);
  };

  const reloadCurrent = async () => {
    if (!currentPath) return;
    await queryClient.invalidateQueries({
      queryKey: ["content-manager"],
    });
    await loadFolderChildren(currentPath, true);
  };

  const parentPath = useMemo(() => {
    const norm = normalizePath(currentPath);
    if (norm === "/") return null;
    const idx = norm.lastIndexOf("/");
    if (idx <= 0) return "/";
    return norm.slice(0, idx);
  }, [currentPath]);

  const goUp = () => {
    if (!parentPath) return;
    goToPath(parentPath);
  };

  const selectAllVisible = () => {
    setSelectedPaths(new Set(items.map((item) => normalizePath(item.path))));
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
    mediaItems,
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
    isCreateFolderOpen,
    setCreateFolderOpen,
    folderName,
    setFolderName,
    handleCloseFolderModal,
    handleCreateFolder,
    isSubmittingFolder,
    uploadFiles: (filesToUpload: File[]) =>
      uploadMutation.mutate(filesToUpload),
    isUploading: uploadMutation.isPending,
    uploadQueue,
    clearUploadQueue: () => setUploadQueue([]),
    deleteSelected: async () => {
      const res = await deleteMutation.mutateAsync(Array.from(selectedPaths));
      return res.deleted;
    },
    deletePaths: (paths: string[]) => deleteMutation.mutate(paths),
    isDeleting: deleteMutation.isPending,
    isMediaViewerOpen,
    setMediaViewerOpen,
    mediaViewerIndex,
    setMediaViewerIndex,
    openPreview,
    closePreview,
  };
}

export type ContentManagerContextType = ReturnType<
  typeof useCreateContentManagerState
>;

const ContentManagerContext =
  createContext<ContentManagerContextType | null>(null);

export function ContentManagerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useCreateContentManagerState();
  return createElement(ContentManagerContext.Provider, { value }, children);
}

export function useContent() {
  const ctx = useContext(ContentManagerContext);
  if (!ctx) {
    throw new Error(
      "useContent must be used within a ContentManagerProvider",
    );
  }
  return ctx;
}

export function useContentManager() {
  const ctx = useContext(ContentManagerContext);
  if (ctx) {
    return ctx;
  }
  return useCreateContentManagerState();
}
