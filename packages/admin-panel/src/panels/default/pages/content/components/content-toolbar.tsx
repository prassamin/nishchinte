import {
  ArrowUp,
  ArrowUpDown,
  FolderPlus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  X,
} from "lucide-react";

import { Dropdown, Header, Label, Spinner, cn } from "@heroui/react";
import { useRef, useState } from "react";
import { useConfirm } from "@nishchinte/confirm";
import { useContent } from "../use-content-manager";

type Props = {
  onCreateFolder?: () => void;
};

function ToolbarButton({
  label,
  icon,
  onClick,
  isPending,
  disabled,
  variant = "default",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isPending?: boolean;
  disabled?: boolean;
  variant?: "default" | "accent" | "danger";
}) {
  const variantStyles = {
    default: "text-ap-muted hover:text-ap-foreground hover:bg-white/60",
    accent: "text-ap-accent bg-ap-accent/10 hover:bg-ap-accent/20",
    danger: "text-ap-danger hover:bg-ap-danger/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isPending}
      className={cn(
        "inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.02] active:scale-[0.98]",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
        variantStyles[variant],
        "[&_svg]:size-4",
      )}
      title={label}
    >
      {isPending ? <Spinner color="current" size="sm" /> : icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

export function ContentToolbar({ onCreateFolder }: Props = {}) {
  const { confirm } = useConfirm();
  const {
    search,
    sortKey,
    sortDirection,
    isFetching,
    parentPath,
    selectedPaths,
    isUploading,
    isDeleting,
    uploadFiles: onUploadFiles,
    reloadCurrent: onReload,
    setSearch: onSearchChange,
    setSortKey: onSortKeyChange,
    setSortDirection: onSortDirectionChange,
    deleteSelected: onDeleteSelected,
    goUp: onGoUp,
    setCreateFolderOpen,
  } = useContent();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFolder = onCreateFolder || (() => setCreateFolderOpen(true));

  const selectedCount = selectedPaths.size;

  return (
    <>
      {/* hidden upload input */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            onUploadFiles(files);
          }
          e.currentTarget.value = "";
        }}
      />

      {/* content toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-ap-border/50 bg-ap-surface/20">
        {/* Navigation Group */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-ap-background/60">
          <ToolbarButton
            label="Up"
            icon={<ArrowUp />}
            onClick={onGoUp}
            disabled={!Boolean(parentPath)}
          />

          <ToolbarButton
            label="Refresh"
            icon={
              isFetching ? (
                <Spinner color="current" size="sm" />
              ) : (
                <RotateCcw className={cn(isFetching && "animate-spin")} />
              )
            }
            onClick={() => void onReload()}
            isPending={isFetching}
          />
        </div>

        {/* Actions Group */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-ap-background/60">
          <ToolbarButton
            label="Upload"
            icon={<Upload />}
            onClick={() => void uploadInputRef.current?.click()}
            isPending={isUploading}
          />

          <ToolbarButton
            label="New Folder"
            icon={<FolderPlus />}
            onClick={handleCreateFolder}
          />
        </div>

        {/* Search & Sort Group */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-ap-background/60">
          {/* Expandable Search */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                setIsSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm",
                "transition-all duration-200 ease-out",
                "hover:scale-[1.02] active:scale-[0.98]",
                isSearchExpanded
                  ? "text-ap-accent bg-ap-accent/10"
                  : "text-ap-muted hover:text-ap-foreground hover:bg-white/60",
              )}
              title="Search"
            >
              <Search size={16} />
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                isSearchExpanded ? "w-48 opacity-100" : "w-0 opacity-0",
              )}
            >
              <div className="relative ml-1">
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onBlur={() => {
                    if (!search) {
                      setIsSearchExpanded(false);
                    }
                  }}
                  placeholder="Search files..."
                  className="h-8 w-full rounded-lg bg-white/60 px-3 pr-8 text-sm text-ap-foreground placeholder:text-ap-muted/50 outline-none ring-2 ring-transparent focus:ring-ap-accent/30 transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSearchChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-ap-muted hover:text-ap-foreground transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sort Popup */}
          <Dropdown>
            <Dropdown.Trigger
              className={cn(
                "inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium",
                "transition-all duration-200 ease-out",
                "hover:scale-[1.02] active:scale-[0.98]",
                "text-ap-muted hover:text-ap-foreground hover:bg-white/60",
              )}
            >
              <ArrowUpDown size={16} />
              <span className="hidden md:inline">Sort</span>
            </Dropdown.Trigger>
            <Dropdown.Popover
              className="min-w-48 p-2 rounded-xl border border-ap-border/40 bg-ap-background/95 backdrop-blur-xl shadow-2xl shadow-black/20"
              placement="bottom end"
            >
              <Dropdown.Menu className="gap-1">
                {/* Sort By Section */}
                <Dropdown.Section>
                  <Header className="text-[11px] font-medium text-ap-muted/60 px-2 py-1.5">
                    Sort by
                  </Header>
                  <Dropdown.Item
                    textValue="Name"
                    className={cn(
                      "rounded-lg px-3 py-2 transition-all duration-150",
                      sortKey === "name"
                        ? "bg-ap-accent/15 text-ap-accent font-medium"
                        : "hover:bg-ap-surface",
                    )}
                    onPress={() => onSortKeyChange("name")}
                  >
                    <Label className="flex items-center justify-between text-sm gap-2">
                      <span>Name</span>
                      {sortKey === "name" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-ap-accent" />
                      )}
                    </Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    textValue="Date"
                    className={cn(
                      "rounded-lg px-3 py-2 transition-all duration-150",
                      sortKey === "createdAt"
                        ? "bg-ap-accent/15 text-ap-accent font-medium"
                        : "hover:bg-ap-surface",
                    )}
                    onPress={() => onSortKeyChange("createdAt")}
                  >
                    <Label className="flex items-center justify-between text-sm gap-2">
                      <span>Date</span>
                      {sortKey === "createdAt" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-ap-accent" />
                      )}
                    </Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    textValue="Size"
                    className={cn(
                      "rounded-lg px-3 py-2 transition-all duration-150",
                      sortKey === "sizeBytes"
                        ? "bg-ap-accent/15 text-ap-accent font-medium"
                        : "hover:bg-ap-surface",
                    )}
                    onPress={() => onSortKeyChange("sizeBytes")}
                  >
                    <Label className="flex items-center justify-between text-sm gap-2">
                      <span>Size</span>
                      {sortKey === "sizeBytes" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-ap-accent" />
                      )}
                    </Label>
                  </Dropdown.Item>
                </Dropdown.Section>

                {/* Sort Order Section */}
                <Dropdown.Section className="mt-2">
                  <Header className="text-[11px] font-medium text-ap-muted/60 px-2 py-1.5">
                    Order
                  </Header>
                  <Dropdown.Item
                    textValue="Ascending"
                    className={cn(
                      "rounded-lg px-3 py-2 transition-all duration-150",
                      sortDirection === "asc"
                        ? "bg-ap-accent/15 text-ap-accent font-medium"
                        : "hover:bg-ap-surface",
                    )}
                    onPress={() => onSortDirectionChange("asc")}
                  >
                    <Label className="flex items-center gap-2 text-sm">
                      <ArrowUpNarrowWide size={14} />
                      <span>Ascending</span>
                      {sortDirection === "asc" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-ap-accent ml-auto" />
                      )}
                    </Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    textValue="Descending"
                    className={cn(
                      "rounded-lg px-3 py-2 transition-all duration-150",
                      sortDirection === "desc"
                        ? "bg-ap-accent/15 text-ap-accent font-medium"
                        : "hover:bg-ap-surface",
                    )}
                    onPress={() => onSortDirectionChange("desc")}
                  >
                    <Label className="flex items-center gap-2 text-sm">
                      <ArrowDownWideNarrow size={14} />
                      <span>Descending</span>
                      {sortDirection === "desc" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-ap-accent ml-auto" />
                      )}
                    </Label>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        {/* Right Actions */}
        <div className="ml-auto flex items-center gap-1 p-1 rounded-lg bg-ap-background/60">
          <button
            type="button"
            onClick={async () => {
              await confirm({
                title: "Delete Selected Items",
                description: `Are you sure you want to permanently delete ${selectedCount} selected item(s)?`,
                isDanger: true,
                onConfirm: async () => {
                  await onDeleteSelected();
                },
              });
            }}
            disabled={selectedCount === 0 || isDeleting}
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
              "hover:scale-[1.02] active:scale-[0.98]",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
              selectedCount > 0
                ? "text-ap-danger hover:bg-ap-danger/10"
                : "text-ap-muted hover:text-ap-foreground hover:bg-white/60",
            )}
            title={`Delete selected (${selectedCount})`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
