"use client";

import { FolderTree, Plus } from "lucide-react";

interface CategoriesHeaderProps {
  onNewCategory: () => void;
}

export function CategoriesHeader({ onNewCategory }: CategoriesHeaderProps) {
  return (
    <div className="mb-6 rounded-2xl border border-ap-border bg-ap-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2.5 text-ap-foreground">
          <FolderTree size={18} className="text-ap-muted" />
          <h1 className="text-[22px] leading-none font-bold">Categories</h1>
        </div>

        <button
          type="button"
          onClick={onNewCategory}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ap-accent px-3 py-1.5 text-xs font-semibold text-ap-accent-foreground transition-opacity hover:opacity-90 cursor-pointer"
        >
          <Plus size={14} />
          Add Category
        </button>
      </div>
    </div>
  );
}
