"use client";

import { useEffect } from "react";
import { Spinner } from "@heroui/react";

import Content from "../../components/content";

import { ContentManagerProvider, useContent } from "./use-content-manager";
import { ContentBreadcrumbs } from "./components/content-breadcrumbs";
import { ContentToolbar } from "./components/content-toolbar";
import { ContentTree } from "./components/content-tree";
import { ContentGrid } from "./components/content-grid";
import { CreateFolderModal } from "./components/create-folder-modal";
import { MediaViewer } from "./components/media-viewer";
import { UploadProgressPanel } from "../../components/upload-progress-panel";

function ContentManagerViewInner() {
  const {
    currentPath,
    rootPath,
    expandedPaths,
    errorMessage,
    toggleExpandPath,
    isCreatingFolder,
    isDeleting,
    uploadQueue,
    clearUploadQueue,
  } = useContent();

  const root = rootPath || "/";

  useEffect(() => {
    if (!root) return;
    if (expandedPaths.has(root)) return;
    void toggleExpandPath(root);
  }, [root, expandedPaths, toggleExpandPath]);

  if (!currentPath) {
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
          <ContentBreadcrumbs />
        </div>

        {/* Toolbar */}
        <ContentToolbar />

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
          <ContentTree />

          {/* Content Grid */}
          <ContentGrid />
        </div>
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal />

      {/* Media Viewer */}
      <MediaViewer />

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
              {isCreatingFolder ? "Creating folder..." : "Deleting item(s)..."}
            </span>
            <span className="text-[11px] text-ap-muted/80 leading-tight">
              Please wait...
            </span>
          </div>
        </div>
      )}

      {/* Upload Progress Panel (Fixed bottom-right with Framer Motion) */}
      <UploadProgressPanel queue={uploadQueue} onClear={clearUploadQueue} />
    </Content>
  );
}

export function ContentManagerView() {
  return (
    <ContentManagerProvider>
      <ContentManagerViewInner />
    </ContentManagerProvider>
  );
}
