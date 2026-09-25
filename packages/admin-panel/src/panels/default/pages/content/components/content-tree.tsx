import { ChevronRight, Folder, HardDrive, Loader2 } from "lucide-react";

import type { ContentItem } from "../types";
import { cn } from "@heroui/react";

type Props = {
  rootPath: string;
  currentPath: string;
  folderTree: Record<string, ContentItem[]>;
  expandedPaths: Set<string>;
  loadingTreePaths: Set<string>;
  onNavigate: (path: string) => void;
  onToggleExpand: (path: string) => void;
};

export function ContentTree({
  rootPath,
  currentPath,
  folderTree,
  expandedPaths,
  loadingTreePaths,
  onNavigate,
  onToggleExpand,
}: Props) {
  const rootChildren = folderTree[rootPath] ?? [];

  const renderNode = (node: ContentItem, depth: number) => {
    const isExpanded = expandedPaths.has(node.path);
    const children = folderTree[node.path] ?? [];
    const isLoading = loadingTreePaths.has(node.path);
    const isActive = node.path === currentPath;

    return (
      <div key={node.path}>
        <div
          className={cn(
            "group flex items-center rounded-lg transition-colors",
            isActive
              ? "bg-ap-accent/10 text-ap-accent"
              : "text-ap-muted hover:bg-ap-surface/50 hover:text-ap-foreground",
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <button
            type="button"
            onClick={() => void onToggleExpand(node.path)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ap-muted hover:bg-ap-surface/50 transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronRight
              size={14}
              className={cn(
                "transition-transform duration-200",
                isExpanded ? "rotate-90" : "rotate-0",
              )}
            />
          </button>

          <button
            type="button"
            onClick={() => onNavigate(node.path)}
            className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-sm"
            title={node.path}
          >
            <Folder size={15} className="shrink-0" />
            <span className="truncate font-medium">{node.name}</span>
          </button>
        </div>

        {isExpanded ? (
          <div className="border-l border-ap-border/30 ml-4">
            {isLoading ? (
              <div
                className="inline-flex items-center gap-2 px-3 py-2 text-xs text-ap-muted"
                style={{ paddingLeft: `${32 + depth * 16}px` }}
              >
                <Loader2 size={12} className="animate-spin" />
                Loading...
              </div>
            ) : null}

            {!isLoading && children.length > 0
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

        <div
          className={cn(
            "group flex items-center rounded-lg transition-colors",
            currentPath === rootPath
              ? "bg-ap-accent/10 text-ap-accent"
              : "text-ap-muted hover:bg-ap-surface/50 hover:text-ap-foreground",
          )}
        >
          <button
            type="button"
            onClick={() => void onToggleExpand(rootPath)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ap-muted transition-colors"
            aria-label={expandedPaths.has(rootPath) ? "Collapse" : "Expand"}
          >
            <ChevronRight
              size={14}
              className={cn(
                "transition-transform duration-200",
                expandedPaths.has(rootPath) ? "rotate-90" : "rotate-0",
              )}
            />
          </button>

          <button
            type="button"
            onClick={() => onNavigate(rootPath)}
            className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-sm"
            title={rootPath}
          >
            <HardDrive size={15} className="shrink-0" />
            <span className="truncate font-medium">Root</span>
          </button>
        </div>

        {expandedPaths.has(rootPath) ? (
          <div className="mt-1">
            {loadingTreePaths.has(rootPath) ? (
              <div className="inline-flex items-center gap-2 px-3 py-2 text-xs text-ap-muted">
                <Loader2 size={12} className="animate-spin" />
                Loading...
              </div>
            ) : null}

            {!loadingTreePaths.has(rootPath) && rootChildren.length > 0
              ? rootChildren.map((node) => renderNode(node, 1))
              : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
