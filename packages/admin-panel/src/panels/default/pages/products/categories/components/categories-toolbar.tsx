"use client";

import { Search } from "lucide-react";

interface CategoriesToolbarProps {
  searchInput: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CategoriesToolbar({
  searchInput,
  onSearchChange,
}: CategoriesToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative flex-1 max-w-md">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ap-muted"
        />
        <input
          type="text"
          value={searchInput}
          onChange={onSearchChange}
          placeholder="Search categories by name or slug..."
          className="h-10 w-full rounded-xl border border-ap-border bg-ap-surface pl-10 pr-4 text-xs text-ap-foreground placeholder:text-ap-muted outline-none transition focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
        />
      </div>
    </div>
  );
}
