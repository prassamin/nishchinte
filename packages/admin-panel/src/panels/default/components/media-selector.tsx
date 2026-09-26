"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Modal, Spinner, toast } from "@heroui/react";
import { X, Upload } from "lucide-react";
import { UploadProgressPanel } from "./upload-progress-panel";
import { MediaThumbnail } from "./media-thumbnail";
import { actions } from "@nishchinte/server/actions";
import { AllowedStorageType } from "@nishchinte/storage";
import { useConfig } from "@nishchinte/config/client";
import { toHumanSize } from "@nishchinte/utils";
import { useShortcuts } from "@keybindy/react";

export type MediaFile = {
  id: string;
  name: string;
  url: string;
  path: string;
  type: string;
  created_at: string;
};

export type OnSelectReturn = {
  url: string;
  mimeType: string;
};

export type OnSelectEvent = {
  preventDefault: () => void;
};

export type UploadFileItem = {
  id: string;
  name: string;
  size: number;
  status: "pending" | "uploading" | "done" | "error";
  percent: number;
  loaded: number;
  error?: string;
};

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

interface MediaSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (files: OnSelectReturn[], event?: OnSelectEvent) => void;
  multiple?: boolean;
  allowed?: AllowedStorageType | AllowedStorageType[];
}

export function MediaSelector({
  isOpen,
  onClose,
  onSelect,
  multiple = true,
  allowed,
}: MediaSelectorProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadFileItem[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<string, OnSelectReturn>>(
    new Map(),
  );
  const config = useConfig();

  const isVideoAllowed = config?.videoAllowed !== false;

  const effectiveAllowed = useMemo(() => {
    if (!isVideoAllowed) {
      if (!allowed) return "image" as AllowedStorageType;
      if (typeof allowed === "string") {
        return allowed === "video" ? ("image" as AllowedStorageType) : allowed;
      }
      if (Array.isArray(allowed)) {
        const filtered = allowed.filter((t) => t !== "video");
        return filtered.length > 0 ? filtered : ("image" as AllowedStorageType);
      }
    }
    return allowed;
  }, [allowed, isVideoAllowed]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAllFiles();
      setSelectedMap(new Map());
      setUploadQueue([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (
          items[i].type.indexOf("image") !== -1 ||
          (isVideoAllowed && items[i].type.indexOf("video") !== -1)
        ) {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        handleUpload(pastedFiles);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [isOpen, isVideoAllowed]);

  const fetchAllFiles = async () => {
    setLoading(true);
    try {
      const res = await actions.storage.list({
        limit: 100,
        types: effectiveAllowed,
        recursive: true,
        sortKey: "createdAt",
        sortDirection: "desc",
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to load files");
      }

      const mediaFiles: MediaFile[] = (res.items || [])
        .filter((item) => item.kind === "file")
        .map((item) => ({
          id: item.path,
          name: item.name,
          url: item.url || `/uploads/${item.path}`,
          path: item.path,
          type: item.mimeType || "image/jpeg",
          created_at: item.createdAt || new Date().toISOString(),
        }));

      setFiles(mediaFiles);
    } catch (err: any) {
      toast("Error loading media", {
        description: err.message,
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (uploadFiles: FileList | File[]) => {
    const filesArray = Array.from(uploadFiles);
    if (filesArray.length === 0) return;
    setUploading(true);

    try {
      const validFiles: { file: File; id: string }[] = [];
      const queue: UploadFileItem[] = [];

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const id = `${Date.now()}-${i}-${file.name}`;
        if (config?.fileSizeLimit && file.size > config.fileSizeLimit) {
          queue.push({
            id,
            name: file.name,
            size: file.size,
            status: "error",
            percent: 0,
            loaded: 0,
            error: `Exceeds ${toHumanSize(config.fileSizeLimit).toUpperCase()} limit`,
          });
        } else {
          validFiles.push({ file, id });
          queue.push({
            id,
            name: file.name,
            size: file.size,
            status: "pending",
            percent: 0,
            loaded: 0,
          });
        }
      }

      setUploadQueue([...queue]);

      if (validFiles.length === 0) {
        setTimeout(() => setUploadQueue([]), 6000);
        return;
      }

      const CONCURRENCY = 3;
      const uploadedItems: Array<{
        url: string;
        path: string;
        name: string;
        mimeType?: string;
      }> = [];

      let currentQueue = [...queue];
      const updateQueueItem = (id: string, patch: Partial<UploadFileItem>) => {
        currentQueue = currentQueue.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        );
        setUploadQueue([...currentQueue]);
      };

      const remaining = [...validFiles];
      const worker = async () => {
        while (remaining.length > 0) {
          const next = remaining.shift();
          if (!next) break;

          updateQueueItem(next.id, { status: "uploading", percent: 0 });

          try {
            const uploaded = await uploadFileWithProgress(
              "media/products",
              next.file,
              (loaded, total) => {
                const percent = total ? Math.round((loaded / total) * 100) : 0;
                updateQueueItem(next.id, { percent, loaded });
              },
            );

            updateQueueItem(next.id, { status: "done", percent: 100 });
            uploadedItems.push(uploaded);
          } catch (err: any) {
            updateQueueItem(next.id, {
              status: "error",
              error: err?.message || "Upload failed",
            });
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, validFiles.length) }, () =>
          worker(),
        ),
      );

      if (uploadedItems.length > 0) {
        const newFiles: MediaFile[] = uploadedItems.map((u, i) => ({
          id: u.path || `upload-${Date.now()}-${i}`,
          name: u.name,
          url: u.url,
          path: u.path,
          type: u.mimeType || "image/jpeg",
          created_at: new Date().toISOString(),
        }));

        setFiles((prev) => [...newFiles, ...prev]);

        const newSelects: OnSelectReturn[] = newFiles.map((f) => ({
          url: f.url,
          mimeType: f.type,
        }));

        if (newSelects.length > 0) {
          setSelectedMap((prev) => {
            const next = multiple
              ? new Map(prev)
              : new Map<string, OnSelectReturn>();
            newSelects.forEach((s) => next.set(s.url, s));
            return next;
          });
        }
      }

      setTimeout(() => {
        setUploadQueue((current) => {
          const isFinished = current.every(
            (q) => q.status === "done" || q.status === "error",
          );
          return isFinished ? [] : current;
        });
      }, 6000);
    } catch (err: any) {
      toast.danger("Upload Failed", {
        description: err?.message || "Failed to upload files",
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleSelection = (file: MediaFile) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(file.url)) {
        next.delete(file.url);
      } else {
        if (!multiple) next.clear();
        next.set(file.url, { url: file.url, mimeType: file.type });
      }
      return next;
    });
  };

  const handleDone = () => {
    let isDefaultPrevented = false;
    const event: OnSelectEvent = {
      preventDefault: function () {
        isDefaultPrevented = true;
      },
    };

    // Fire the callback with the custom event
    onSelect(Array.from(selectedMap.values()), event);

    // Only call onClose if preventDefault() was NOT called in the parent
    if (!isDefaultPrevented) {
      onClose();
    }
  };

  const normalizeMime = (type: AllowedStorageType) => {
    if (type.includes("/")) return type;
    return `${type}/*`;
  };

  useShortcuts(
    [
      {
        keys: ["Enter"],
        handler: () => {
          if (selectedMap.size > 0) {
            handleDone();
          }
        },
      },
    ],
    {
      disabled: !isOpen,
    },
  );

  return (
    <>
      <Modal>
        <Modal.Backdrop
          isOpen={isOpen}
          onOpenChange={(open) => !open && onClose()}
        >
          <Modal.Container>
            <Modal.Dialog className="max-w-4xl w-[calc(100vw-32px)] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-ap-surface">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-ap-border">
                <h2 className="text-lg font-bold text-ap-foreground">
                  Select file
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-ap-field-background rounded-lg transition-colors"
                >
                  <X size={20} className="text-ap-muted" />
                </button>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-ap-field-background/30">
                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (
                      e.dataTransfer.files &&
                      e.dataTransfer.files.length > 0
                    ) {
                      handleUpload(e.dataTransfer.files);
                    }
                  }}
                  className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center mb-8 hover:bg-ap-accent/10 hover:border-ap-accent/50 transition-all duration-300 group overflow-hidden ${
                    isDragging
                      ? "bg-ap-accent/10 border-ap-accent scale-[0.99]"
                      : "bg-ap-accent/5 border-ap-accent/30"
                  }`}
                >
                  <div className="absolute inset-0 bg-linear-to-b from-transparent to-ap-accent/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <div className="flex flex-col items-center gap-1.5 mb-6 relative z-10 text-center">
                    <h3 className="text-[16px] font-semibold text-ap-foreground">
                      {isDragging ? "Drop files here" : "Upload new media"}
                    </h3>
                    <p className="text-[14px] text-ap-muted font-medium max-w-62.5">
                      Drag and drop, click to browse, or paste an image from
                      clipboard.
                    </p>
                    <p className="text-[12px] font-semibold text-ap-muted/70 mt-1">
                      Max file size:{" "}
                      {config?.fileSizeLimit
                        ? toHumanSize(config.fileSizeLimit).toUpperCase()
                        : "5MB"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 relative z-10">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={
                        typeof effectiveAllowed === "string"
                          ? normalizeMime(effectiveAllowed)
                          : typeof effectiveAllowed === "object"
                            ? effectiveAllowed
                                .map((f) => normalizeMime(f))
                                .join(",")
                            : "image/*"
                      }
                      multiple={multiple}
                      onChange={(e) =>
                        e.target.files && handleUpload(e.target.files)
                      }
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-ap-surface border border-ap-border rounded-xl text-[14px] font-semibold text-ap-foreground hover:bg-ap-field-background hover:border-ap-border shadow-sm transition-all duration-200"
                    >
                      {uploading ? (
                        <Spinner
                          size="sm"
                          color="current"
                          className="text-ap-muted"
                        />
                      ) : (
                        "Browse files"
                      )}
                    </button>
                  </div>
                </div>

                {/* Grid */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Spinner
                      size="lg"
                      color="current"
                      className="text-ap-accent mb-4"
                    />
                    <p className="text-ap-muted text-sm font-medium">
                      Loading media...
                    </p>
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-ap-surface/50 rounded-2xl border border-dashed border-ap-border/60">
                    <div className="w-16 h-16 bg-ap-field-background rounded-2xl border border-ap-border flex items-center justify-center mb-5 shadow-sm">
                      <Upload size={24} className="text-ap-muted/60" />
                    </div>
                    <h3 className="text-[17px] font-semibold text-ap-foreground mb-1.5">
                      Your library is empty
                    </h3>
                    <p className="text-[14px] text-ap-muted max-w-65">
                      Upload files to your store&apos;s media library to use
                      them across your products.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {files.map((file) => {
                      const isSelected = selectedMap.has(file.url);
                      const ext =
                        file.name.split(".").pop()?.toUpperCase() || "FILE";

                      return (
                        <div
                          key={file.id}
                          onClick={() => toggleSelection(file)}
                          style={{
                            contentVisibility: "auto",
                            containIntrinsicSize: "200px",
                          }}
                          className={`group relative flex flex-col bg-ap-surface rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                            isSelected
                              ? "ring-2 ring-ap-accent shadow-md shadow-ap-accent/10 scale-[0.98]"
                              : "border border-ap-border/80 hover:border-ap-border hover:shadow-sm"
                          }`}
                        >
                          <div className="aspect-square bg-ap-field-background relative overflow-hidden">
                            <MediaThumbnail
                              url={file.url}
                              name={file.name}
                              type={file.type}
                              isSelected={isSelected}
                            />

                            {/* File extension badge */}
                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-bold text-white/90 uppercase tracking-wider">
                              {ext}
                            </div>

                            {/* Selection Checkbox overlay */}
                            <div
                              className={`absolute top-2 left-2 p-1.5 rounded-lg transition-all duration-200 ${isSelected ? "opacity-100 bg-white shadow-sm scale-100" : "opacity-0 group-hover:opacity-100 bg-black/30 scale-95"}`}
                            >
                              <div
                                className={`w-5 h-5 rounded-xl border-[1.5px] flex items-center justify-center transition-colors ${isSelected ? "bg-ap-accent border-ap-accent" : "border-white/90"}`}
                              >
                                {isSelected && (
                                  <svg
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    className="w-3.5 h-3.5 text-white"
                                  >
                                    <path
                                      d="M3 8L6 11L11 3.5"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="p-3 bg-ap-surface z-10 relative">
                            <p
                              className="text-[12px] font-semibold text-ap-foreground truncate"
                              title={file.name}
                            >
                              {file.name}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-ap-border flex items-center justify-between bg-ap-surface">
                <p className="text-[13px] font-medium text-ap-muted">
                  {selectedMap.size} file{selectedMap.size !== 1 ? "s" : ""}{" "}
                  selected
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl text-[14px] font-semibold text-ap-foreground border border-ap-border bg-ap-surface hover:bg-ap-field-background transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDone}
                    disabled={selectedMap.size === 0}
                    className="px-5 py-2 rounded-xl text-[14px] font-bold text-white bg-ap-accent hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Dedicated Upload Progress Panel */}
      <UploadProgressPanel
        queue={uploadQueue}
        onClear={() => setUploadQueue([])}
      />
    </>
  );
}
