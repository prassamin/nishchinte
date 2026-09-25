"use client";

import { useState } from "react";
import { useRouter } from "@bprogress/next";
import { FolderTree, Plus, Image as ImageIcon, ArrowUpRight } from "lucide-react";
import { CategoryUpsertDrawer } from "../../../components/category-upsert-drawer";
import type { CategoryChild } from "@nishchinte/server/actions";

type SubcategoriesCardProps = {
  categoryId: string;
  categoryName: string;
  subcategories: CategoryChild[];
};

export function SubcategoriesCard({
  categoryId,
  categoryName,
  subcategories,
}: SubcategoriesCardProps) {
  const router = useRouter();
  const [isAddDrawerOpen, setAddDrawerOpen] = useState(false);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-ap-border bg-ap-surface">
        <div className="flex items-center justify-between border-b border-ap-border px-4 py-3">
          <div className="flex items-center gap-2">
            <FolderTree size={16} className="text-ap-muted" />
            <h3 className="text-sm font-semibold text-ap-foreground">
              Subcategories ({subcategories.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setAddDrawerOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-ap-accent px-2.5 py-1.5 text-xs font-semibold text-ap-accent-foreground transition-opacity hover:opacity-90"
          >
            <Plus size={13} />
            Add Subcategory
          </button>
        </div>

        {subcategories.length === 0 ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-2.5 grid h-10 w-10 place-content-center rounded-xl bg-ap-field-background text-ap-muted">
              <FolderTree size={18} />
            </div>
            <p className="text-sm font-medium text-ap-foreground">
              No subcategories yet
            </p>
            <p className="mt-1 text-xs text-ap-muted">
              Organize this category by adding subcategories underneath it.
            </p>
            <button
              type="button"
              onClick={() => setAddDrawerOpen(true)}
              className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ap-border bg-ap-field-background/50 px-3 py-1.5 text-xs font-medium text-ap-foreground transition-colors hover:border-ap-accent hover:text-ap-accent"
            >
              <Plus size={13} />
              Create Subcategory
            </button>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="space-y-2">
              {subcategories.map((child) => {
                const childImage = (child as any).imageUrl;
                const childSlug = (child as any).slug || child.name.toLowerCase();

                return (
                  <div
                    key={child.id}
                    onClick={() =>
                      router.push(`/admin/products/categories/${childSlug}`)
                    }
                    className="group flex cursor-pointer items-center gap-3 rounded-xl bg-ap-field-background/50 p-2.5 transition-colors hover:bg-ap-field-background"
                  >
                    {childImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={childImage}
                        alt={child.name}
                        className="h-9 w-9 rounded-lg border border-ap-border/60 object-cover"
                      />
                    ) : (
                      <span className="grid h-9 w-9 place-content-center rounded-lg border border-ap-border text-ap-muted">
                        <ImageIcon size={13} />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ap-foreground group-hover:text-ap-accent transition-colors">
                        {child.name}
                      </p>
                      <p className="text-xs text-ap-muted">/{childSlug}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/products/categories/${childSlug}`);
                      }}
                      className="grid h-7 w-7 place-content-center rounded-lg border border-ap-border text-ap-muted transition-colors hover:border-ap-border hover:bg-ap-surface hover:text-ap-foreground"
                    >
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <CategoryUpsertDrawer
        isOpen={isAddDrawerOpen}
        onOpenChange={setAddDrawerOpen}
        mode="create"
        title={`Add Subcategory to "${categoryName}"`}
        submitLabel="Create Subcategory"
        submittingLabel="Creating..."
        initialValues={{ parentId: categoryId }}
      />
    </>
  );
}
