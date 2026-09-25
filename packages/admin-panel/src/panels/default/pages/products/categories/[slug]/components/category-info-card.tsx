"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderTree } from "lucide-react";
import { useCategoryStore } from "../store";
import MarkdownEditor from "../../../../../components/markdown-editor";
import { CategoryParentSelect } from "../../../../../components/category-parent-select";
import { actions } from "@nishchinte/server/actions";
import {
  markdownToPlain,
  truncateText,
} from "@nishchinte/utils";

type CategoryInfoCardProps = {
  categoryId?: string;
};

export function CategoryInfoCard({ categoryId }: CategoryInfoCardProps) {
  const {
    form,
    isSeoTitleManuallyEdited,
    isSeoDescriptionManuallyEdited,
    setForm,
  } = useCategoryStore();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await actions.product.category.list();
      if (!res.ok) throw new Error(res.error || "Failed to fetch categories");
      return res.categories;
    },
    staleTime: 60 * 1000,
  });

  return (
    <div className="rounded-2xl border border-ap-border bg-ap-surface p-5">
      <h2 className="mb-4 text-[15px] font-bold text-ap-foreground">
        Category Information
      </h2>

      <div className="space-y-4">
        {/* Parent Category Selector */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ap-foreground">
            <FolderTree size={14} className="text-ap-muted" />
            Parent Category
          </label>

          <CategoryParentSelect
            value={form.parentId || ""}
            onChange={(value) =>
              setForm({
                ...form,
                parentId: value,
              })
            }
            categories={categories}
            excludeCategoryId={categoryId}
          />

          <p className="mt-1 text-[12px] text-ap-muted">
            Choose a parent category to nest this category under, or None to
            keep it as a top-level category.
          </p>
        </div>

        {/* Category Name */}
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ap-foreground">
            <FolderTree size={14} className="text-ap-muted" />
            Category Name
          </label>
          <input
            value={form.name}
            onChange={(e) => {
              const nextName = e.target.value;
              setForm({
                ...form,
                name: nextName,
                seoTitle: isSeoTitleManuallyEdited
                  ? form.seoTitle
                  : truncateText(markdownToPlain(nextName || ""), 70),
              });
            }}
            placeholder="e.g. T-Shirts"
            className="w-full rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 text-[13px] font-medium text-ap-foreground">
            Description
          </label>
          <MarkdownEditor
            value={form.description}
            onChange={(value) =>
              setForm({
                ...form,
                description: value,
                seoDescription: isSeoDescriptionManuallyEdited
                  ? form.seoDescription
                  : truncateText(markdownToPlain(value || ""), 320),
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
