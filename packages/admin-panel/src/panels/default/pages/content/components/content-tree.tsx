import { ChevronRight, Folder, HardDrive, Loader2 } from "lucide-react";

import type { ContentItem } from "../types";
import { cn } from "@heroui/react";
import { normalizePath, useContent } from "../use-content-manager";

export function ContentTree() {
  const {
    currentPath,
    rootPath,
    folderTree,
    expandedPaths,
    loadingTreePaths,
    goToPath: onNavigate,
  } = useContent();
  const normRoot = normalizePath(rootPath);
  const normCurrent = normalizePath(currentPath);
  const rootChildren = folderTree[normRoot] ?? folderTree[rootPath] ?? [];

  const renderNode = (node: ContentItem, depth: number) => {
    const nodePath = normalizePath(node.path);
    const isExpanded = expandedPaths.has(nodePath);
    const isLoading = loadingTreePaths.has(nodePath);
    const children = folderTree[nodePath] ?? folderTree[node.path] ?? [];
    const isActive = nodePath === normCurrent;

    return (
      <div key={nodePath}>
        <button
          type="button"
          onClick={() => onNavigate(nodePath)}
          className={cn(
            "group flex w-full items-center gap-2 rounded-lg py-1 px-2 text-left transition-colors",
            isActive
              ? "bg-ap-accent/10 text-ap-accent"
              : "text-ap-muted hover:bg-ap-surface/50 hover:text-ap-foreground",
          )}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          title={nodePath}
        >
          {isLoading ? (
            <Loader2
              size={13}
              className="shrink-0 animate-spin text-ap-accent"
            />
          ) : (
            <ChevronRight
              size={13}
              className={cn(
                "shrink-0 transition-transform duration-200 text-ap-muted/70 group-hover:text-ap-foreground",
                isExpanded ? "rotate-90" : "rotate-0",
              )}
            />
          )}

          <Folder size={15} className="shrink-0" />
          <span className="truncate text-sm font-medium flex-1">
            {node.name}
          </span>
        </button>

        {isExpanded ? (
          <div className="border-l border-ap-border/30 ml-4">
            {children.length > 0
              ? children.map((child) => renderNode(child, depth + 1))
              : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <aside className="overflow-auto border-r border-ap-border/50 bg-ap-surface/20 not-lg:hidden">
      <div className="p-3">
        <div className="mb-2 px-2 text-xs font-medium text-ap-muted/60 uppercase tracking-wider">
          Folder Tree
        </div>

        <button
          type="button"
          onClick={() => onNavigate(normRoot)}
          className={cn(
            "group flex w-full items-center gap-2 rounded-lg py-1 px-2 text-left transition-colors",
            normCurrent === normRoot
              ? "bg-ap-accent/10 text-ap-accent"
              : "text-ap-muted hover:bg-ap-surface/50 hover:text-ap-foreground",
          )}
          title="Root"
        >
          {loadingTreePaths.has(normRoot) ? (
            <Loader2
              size={13}
              className="shrink-0 animate-spin text-ap-accent"
            />
          ) : (
            <ChevronRight
              size={13}
              className={cn(
                "shrink-0 transition-transform duration-200 text-ap-muted/70 group-hover:text-ap-foreground",
                expandedPaths.has(normRoot) ? "rotate-90" : "rotate-0",
              )}
            />
          )}

          <HardDrive size={15} className="shrink-0" />
          <span className="truncate text-sm font-medium flex-1">Root</span>
        </button>

        {expandedPaths.has(normRoot) ? (
          <div className="mt-1">
            {rootChildren.length > 0
              ? rootChildren.map((node) => renderNode(node, 1))
              : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
