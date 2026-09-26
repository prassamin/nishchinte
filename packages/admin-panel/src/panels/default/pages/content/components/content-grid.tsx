import {
  File,
  FileImage,
  Folder,
  Trash2,
  Eye,
  MoreVertical,
  Download,
  Link,
  Video,
} from "lucide-react";

import type { ContentItem } from "../types";
import {
  Checkbox,
  Dropdown,
  Header,
  Label,
  Skeleton,
  cn,
  toast,
} from "@heroui/react";
import { useLayoutEffect, useRef, useState } from "react";

import { useConfirm } from "@nishchinte/confirm";
import {
  isAudioMime,
  isImageMime,
  isMediaItem,
  isVideoMime,
  useContent,
} from "../use-content-manager";

export { isAudioMime, isImageMime, isMediaItem, isVideoMime };

type Props = {
  onPreview?: (item: ContentItem) => void;
};

function formatSize(size?: number | null) {
  if (!size || size <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

type RowActionsMenuProps = {
  item: ContentItem;
  onPreview: (item: ContentItem) => void;
  onDeleteItem: (path: string) => void;
  confirm: ReturnType<typeof useConfirm>["confirm"];
};

function RowActionsMenu({
  item,
  onPreview,
  onDeleteItem,
  confirm,
}: RowActionsMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [isOpen, setIsOpen] = useState(false);

  // Edge safety: calculate if dropdown should open up or down
  const calculatePlacement = (height: number) => {
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (!triggerRect) return;

    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    // Open up if not enough space below and more space above
    setPlacement(
      spaceBelow < height && spaceAbove > spaceBelow ? "top" : "bottom",
    );
  };

  // Measure actual dropdown height after it renders and adjust placement
  useLayoutEffect(() => {
    if (!isOpen) return;

    // Wait for popover to render then measure
    const handle = requestAnimationFrame(() => {
      const popover = popoverRef.current;
      if (!popover) return;

      // Get actual rendered height
      const height = popover.getBoundingClientRect().height + 20; // Add buffer
      calculatePlacement(height);
    });

    return () => cancelAnimationFrame(handle);
  }, [isOpen]);

  const handlePreview = () => onPreview(item);

  const handleDownload = async () => {
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.url, "_blank");
    }
  };

  const handleCopyUrl = () => {
    console.log(item.url, item);
    navigator.clipboard.writeText(item.url);
    toast("Copied", {
      description: "URL copied to clipboard",
      variant: "success",
    });
  };

  const handleDelete = async () => {
    const isFolder = item.kind === "folder";
    const ok = await confirm({
      title: isFolder ? "Delete Folder" : "Delete File",
      description: `Are you sure you want to permanently delete "${item.name}"${
        isFolder ? " folder and all its contents" : ""
      }?`,
      isDanger: true,
    });
    if (ok) onDeleteItem(item.path);
  };

  return (
    <Dropdown onOpenChange={setIsOpen}>
      <Dropdown.Trigger
        ref={triggerRef}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ap-muted hover:text-ap-foreground hover:bg-ap-surface/60 transition-all opacity-0 group-hover:opacity-100"
      >
        <MoreVertical size={15} />
      </Dropdown.Trigger>
      <Dropdown.Popover
        placement={placement}
        className="min-w-52 rounded-xl border border-ap-border/40 bg-ap-background/95 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden"
      >
        <div ref={popoverRef} className="p-1.5">
          <Dropdown.Menu className="gap-0.5">
            {isMediaItem(item) && (
              <Dropdown.Section className="mb-1">
                <Header className="text-[10px] uppercase tracking-wider font-semibold text-ap-muted/50 px-2 py-1">
                  Media
                </Header>
                <Dropdown.Item
                  key="preview"
                  textValue="Preview"
                  onAction={handlePreview}
                  className="rounded-lg data-hovered:bg-ap-accent/10 data-hovered:text-ap-accent transition-colors"
                >
                  <Label className="flex items-center gap-3 text-sm font-medium">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-ap-accent/10">
                      <Eye size={14} className="text-ap-accent" />
                    </div>
                    Preview
                  </Label>
                </Dropdown.Item>
                <Dropdown.Item
                  key="download"
                  textValue="Download"
                  onAction={handleDownload}
                  className="rounded-lg data-hovered:bg-ap-success/10 data-hovered:text-ap-success transition-colors"
                >
                  <Label className="flex items-center gap-3 text-sm font-medium">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-ap-success/10">
                      <Download size={14} className="text-ap-success" />
                    </div>
                    Download
                  </Label>
                </Dropdown.Item>
                <Dropdown.Item
                  key="copy"
                  textValue="Copy URL"
                  onAction={handleCopyUrl}
                  className="rounded-lg data-hovered:bg-ap-warning/10 data-hovered:text-ap-warning transition-colors"
                >
                  <Label className="flex items-center gap-3 text-sm font-medium">
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-ap-warning/10">
                      <Link size={14} className="text-ap-warning" />
                    </div>
                    Copy URL
                  </Label>
                </Dropdown.Item>
              </Dropdown.Section>
            )}
            <Dropdown.Section
              className={
                isMediaItem(item) ? "border-t border-ap-border/30 pt-1" : ""
              }
            >
              <Header className="text-[10px] uppercase tracking-wider font-semibold text-ap-danger/60 px-2 py-1">
                Danger
              </Header>
              <Dropdown.Item
                key="delete"
                textValue="Delete"
                onAction={handleDelete}
                className="rounded-lg text-ap-danger data-hovered:bg-ap-danger/10 data-hovered:text-ap-danger transition-colors"
              >
                <Label className="flex items-center gap-3 text-sm font-medium">
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-ap-danger/10">
                    <Trash2 size={14} className="text-ap-danger" />
                  </div>
                  Delete
                </Label>
              </Dropdown.Item>
            </Dropdown.Section>
          </Dropdown.Menu>
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function ContentGridSkeleton() {
  const skeletonRows = [
    {
      nameWidth: "w-44",
      typeWidth: "w-14",
      sizeWidth: "w-8",
      dateWidth: "w-28",
    },
    {
      nameWidth: "w-52",
      typeWidth: "w-14",
      sizeWidth: "w-8",
      dateWidth: "w-24",
    },
    {
      nameWidth: "w-64",
      typeWidth: "w-16",
      sizeWidth: "w-14",
      dateWidth: "w-32",
    },
    {
      nameWidth: "w-36",
      typeWidth: "w-12",
      sizeWidth: "w-12",
      dateWidth: "w-28",
    },
    {
      nameWidth: "w-56",
      typeWidth: "w-14",
      sizeWidth: "w-16",
      dateWidth: "w-24",
    },
    {
      nameWidth: "w-32",
      typeWidth: "w-10",
      sizeWidth: "w-12",
      dateWidth: "w-28",
    },
    {
      nameWidth: "w-60",
      typeWidth: "w-14",
      sizeWidth: "w-14",
      dateWidth: "w-32",
    },
    {
      nameWidth: "w-40",
      typeWidth: "w-12",
      sizeWidth: "w-10",
      dateWidth: "w-24",
    },
  ];

  return (
    <div className="overflow-x-auto scrollbar-styled animate-in fade-in duration-200">
      <table className="w-full min-w-150">
        <thead>
          <tr className="border-b border-ap-border/50 bg-ap-surface/30">
            <th className="w-12 px-4 py-3">
              <div className="w-4 h-4 rounded-md bg-ap-border/40" />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ap-muted">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ap-muted w-32">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ap-muted w-24">
              Size
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ap-muted w-40">
              Modified
            </th>
            <th className="w-12 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {skeletonRows.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-ap-border/30 last:border-0"
            >
              <td className="px-4 py-2.5">
                <Skeleton className="w-4 h-4 rounded-md bg-ap-border/40" />
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg shrink-0 bg-ap-surface/80 border border-ap-border/30" />
                  <Skeleton
                    className={cn(
                      "h-4 rounded-md bg-ap-muted/20",
                      row.nameWidth,
                    )}
                  />
                </div>
              </td>
              <td className="px-4 py-2.5">
                <Skeleton
                  className={cn(
                    "h-3.5 rounded-md bg-ap-muted/15",
                    row.typeWidth,
                  )}
                />
              </td>
              <td className="px-4 py-2.5">
                <Skeleton
                  className={cn(
                    "h-3.5 rounded-md bg-ap-muted/15",
                    row.sizeWidth,
                  )}
                />
              </td>
              <td className="px-4 py-2.5">
                <Skeleton
                  className={cn(
                    "h-3.5 rounded-md bg-ap-muted/15",
                    row.dateWidth,
                  )}
                />
              </td>
              <td className="px-4 py-2.5">
                <Skeleton className="w-7 h-7 rounded-lg bg-ap-border/30" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContentGrid({ onPreview: onPreviewProp }: Props = {}) {
  const { confirm } = useConfirm();
  const {
    selectedPaths,
    items,
    isFetching,
    openFolder: onOpenFolder,
    toggleSelect: onToggleSelect,
    deletePaths: onDeleteItem,
    selectAllVisible: onSelectAll,
    clearSelection: onClearSelection,
    openPreview,
  } = useContent();

  const handlePreview = onPreviewProp || openPreview;
  const allSelected =
    items.length > 0 && items.every((item) => selectedPaths.has(item.path));
  const someSelected = items.some((item) => selectedPaths.has(item.path));

  const handleToggleSelectAll = () => {
    if (allSelected) {
      if (onClearSelection) {
        onClearSelection();
      } else {
        items.forEach((item) => {
          if (selectedPaths.has(item.path)) {
            onToggleSelect(item.path);
          }
        });
      }
    } else {
      onSelectAll();
    }
  };

  if (isFetching) {
    return <ContentGridSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ap-surface/60 border border-ap-border/50 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <File size={24} className="text-ap-muted/50" />
        </div>
        <h4 className="text-ap-foreground font-semibold text-[15px] mb-1.5">
          No files in this folder
        </h4>
        <p className="text-ap-muted text-[13px] max-w-64">
          Upload media files or create new folders to organize your store
          content.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-styled">
      <table className="w-full min-w-150">
        <thead>
          <tr className="border-b border-ap-border/50 bg-ap-surface/30">
            <th className="w-12 px-4 py-3">
              <Checkbox
                isSelected={allSelected}
                isIndeterminate={someSelected && !allSelected}
                onChange={handleToggleSelectAll}
                aria-label="Select All"
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ap-muted">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ap-muted w-32">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ap-muted w-24">
              Size
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-ap-muted w-40">
              Modified
            </th>
            <th className="w-12 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const selected = selectedPaths.has(item.path);

            return (
              <tr
                key={item.path}
                onClick={() => {
                  if (item.kind === "folder") {
                    return onOpenFolder(item);
                  }
                  if (isMediaItem(item)) {
                    handlePreview(item);
                  }
                }}
                className={`group border-b border-ap-border/30 last:border-0 transition-colors cursor-pointer ${
                  selected ? "bg-ap-accent/5" : "hover:bg-ap-surface/50"
                }`}
              >
                <td
                  className="px-4 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    isSelected={selected}
                    onChange={() => {
                      onToggleSelect(item.path);
                    }}
                    aria-label={`Select ${item.name}`}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox.Content>
                  </Checkbox>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        item.kind === "folder"
                          ? "bg-ap-accent/10 text-ap-accent"
                          : isImageMime(item.mimeType)
                            ? "bg-blue-500/10 text-blue-500"
                            : isVideoMime(item.mimeType)
                              ? "bg-red-500/10 text-red-500"
                              : "bg-ap-surface text-ap-muted",
                      )}
                    >
                      {item.kind === "folder" ? (
                        <Folder size={16} />
                      ) : isImageMime(item.mimeType) ? (
                        <FileImage size={16} />
                      ) : isVideoMime(item.mimeType) ? (
                        <Video size={16} />
                      ) : (
                        <File size={16} />
                      )}
                    </div>
                    <span
                      className="max-w-80 truncate text-sm font-medium text-ap-foreground"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-sm text-ap-muted">
                  {item.kind === "folder"
                    ? "Folder"
                    : item.mimeType?.split("/")[1]?.toUpperCase() || "File"}
                </td>
                <td className="px-4 py-2.5 text-sm text-ap-muted">
                  {item.kind === "folder" ? "—" : formatSize(item.sizeBytes)}
                </td>
                <td className="px-4 py-2.5 text-sm text-ap-muted">
                  {formatDate(item.updatedAt || item.createdAt)}
                </td>
                <td
                  className="px-4 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActionsMenu
                    item={item}
                    onPreview={handlePreview}
                    onDeleteItem={(path) => onDeleteItem([path])}
                    confirm={confirm}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
