"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@heroui/react";

import Content from "../../components/content";

import { useContentManager } from "./use-content-manager";
import { ContentBreadcrumbs } from "./components/content-breadcrumbs";
import { ContentToolbar } from "./components/content-toolbar";
import { ContentTree } from "./components/content-tree";
import { ContentGrid } from "./components/content-grid";
import { CreateFolderModal } from "./components/create-folder-modal";
import { MediaViewer } from "./components/media-viewer";
import { UploadProgressPanel } from "../../components/upload-progress-panel";

import type { ContentItem } from "./types";

type Props = {
  dashboardSlug?: string;
};

export function ContentManagerView({}: Props = {}) {
  const {
    currentPath,
    rootPath,
    parentPath,
    search,
    sortKey,
    sortDirection,
    selectedPaths,
    items,
    folderTree,
    expandedPaths,
    loadingTreePaths,
    isFetching,
    errorMessage,
    openFolder,
    goToPath,
    toggleSelect,
    createFolder,
    isCreatingFolder,
    isUploading,
    uploadQueue,
    clearUploadQueue,
    deletePaths,
    isDeleting,
    toggleExpandPath,
    setSearch,
    setSortKey,
    setSortDirection,
    reloadCurrent,
    uploadFiles,
    selectAllVisible,
    clearSelection,
    deleteSelected,
    goUp,
  } = useContentManager();

  const root = rootPath || "media";
  const [isCreateFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isSubmittingFolder, setSubmittingFolder] = useState(false);
  const [isMediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);

  useEffect(() => {
    if (!root) return;
    if (expandedPaths.has(root)) return;
    void toggleExpandPath(root);
  }, [root, expandedPaths, toggleExpandPath]);

  const handleCloseFolderModal = () => {
    if (isCreatingFolder || isSubmittingFolder) return;
    setCreateFolderOpen(false);
    setFolderName("");
  };

  const handleCreateFolder = async () => {
    const nextName = folderName.trim();
    if (!nextName || isSubmittingFolder) return;

    setSubmittingFolder(true);

    try {
      await createFolder(nextName);
      handleCloseFolderModal();
    } catch {
      // Keep modal open on failure.
    } finally {
      setSubmittingFolder(false);
    }
  };

  const handlePreviewMedia = (item: ContentItem) => {
    // Find index among media items
    const mediaItems = items.filter(
      (i) =>
        i.kind === "file" &&
        (i.mimeType?.startsWith("image/") ||
          i.mimeType?.startsWith("video/") ||
          i.mimeType?.startsWith("audio/")),
    );
    const index = mediaItems.findIndex((i) => i.path === item.path);
    if (index >= 0) {
      setMediaViewerIndex(index);
      setMediaViewerOpen(true);
    }
  };

  if (!currentPath && isFetching) {
    return (
      <Content className="grid place-items-center">
        <Spinner className="text-ap-accent" />
      </Content>
    );
  }

  return (
    <Content className="overflow-clip">
      <div className="flex flex-col h-full rounded-2xl border border-ap-border/50 bg-linear-to-b from-ap-background to-ap-surface/20 overflow-auto shadow-xl shadow-black/5">
        {/* Header with Breadcrumbs */}
        <div className="border-b border-ap-border/50 bg-ap-surface/30 px-4 py-3">
          <ContentBreadcrumbs
            path={currentPath}
            rootPath={root}
            onNavigate={(path) => goToPath(path || root)}
          />
        </div>

        {/* Toolbar */}
        <ContentToolbar
          onCreateFolder={() => setCreateFolderOpen(true)}
          onUploadFiles={uploadFiles}
          onReload={reloadCurrent}
          onSearchChange={setSearch}
          onSortKeyChange={setSortKey}
          onSortDirectionChange={setSortDirection}
          onDeleteSelected={deleteSelected}
          onGoUp={goUp}
          search={search}
          sortKey={sortKey}
          sortDirection={sortDirection}
          isFetching={isFetching}
          isUploading={isUploading}
          isDeleting={isDeleting}
          selectedCount={selectedPaths.size}
          canGoUp={Boolean(parentPath)}
        />

        {/* Error Message */}
        {errorMessage ? (
          <div className="mx-4 mb-4 rounded-xl border border-ap-danger/30 bg-ap-danger/5 px-4 py-3 text-sm text-ap-danger flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ap-danger" />
            {errorMessage}
          </div>
        ) : null}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] flex-1 min-h-0">
          {/* Sidebar */}
          <ContentTree
            rootPath={root}
            currentPath={currentPath}
            folderTree={folderTree}
            expandedPaths={expandedPaths}
            loadingTreePaths={loadingTreePaths}
            onNavigate={goToPath}
            onToggleExpand={toggleExpandPath}
          />

          {/* Content Grid */}
          <ContentGrid
            items={items}
            selectedPaths={selectedPaths}
            onToggleSelect={toggleSelect}
            onOpenFolder={openFolder}
            onDeleteItem={(path) => deletePaths([path])}
            onSelectAll={selectAllVisible}
            onClearSelection={clearSelection}
            onPreview={handlePreviewMedia}
          />
        </div>
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={handleCloseFolderModal}
        folderName={folderName}
        onFolderNameChange={setFolderName}
        onSubmit={handleCreateFolder}
        isSubmitting={isCreatingFolder || isSubmittingFolder}
      />

      {/* Media Viewer */}
      <MediaViewer
        isOpen={isMediaViewerOpen}
        onClose={() => setMediaViewerOpen(false)}
        items={items}
        initialIndex={mediaViewerIndex}
        onDeleteItem={(path) => deletePaths([path])}
      />

      {/* Processing Indicator (folder/delete only) */}
      {(isCreatingFolder || isDeleting) && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-2xl border border-ap-border/40 bg-ap-background/80 backdrop-blur-2xl px-5 py-3 text-sm shadow-2xl shadow-black/15 flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-6 h-6">
            <svg
              className="animate-spin w-5 h-5 text-ap-accent"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-ap-foreground text-[13px] leading-tight">
              {isCreatingFolder
                ? "ফোল্ডার তৈরি হচ্ছে..."
                : "আইটেম মুছে ফেলা হচ্ছে..."}
            </span>
            <span className="text-[11px] text-ap-muted/80 leading-tight">
              অনুগ্রহ করে অপেক্ষা করুন
            </span>
          </div>
        </div>
      )}

      {/* Upload Progress Panel (Fixed bottom-right with Framer Motion) */}
      <UploadProgressPanel queue={uploadQueue} onClear={clearUploadQueue} />
    </Content>
  );
}
