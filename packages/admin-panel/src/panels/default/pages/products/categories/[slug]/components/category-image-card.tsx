"use client";

import { Image as ImageIcon } from "lucide-react";
import { useCategoryStore } from "../store";

export function CategoryImageCard() {
  const { form, setForm, setImageSelectorOpen } = useCategoryStore();

  return (
    <div className="rounded-2xl border border-ap-border bg-ap-surface p-5">
      <h2 className="mb-3 text-[15px] font-bold text-ap-foreground">
        Category Image
      </h2>

      {form.imageUrl ? (
        <div className="rounded-xl border border-ap-border bg-ap-field-background p-3">
          <div className="flex items-center gap-3">
            <img
              src={form.imageUrl}
              alt={form.name || "Category"}
              className="h-16 w-16 rounded-lg border border-ap-border/60 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ap-foreground">
                Image selected
              </p>
              <p className="truncate text-[12px] text-ap-muted">
                {form.imageUrl}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setImageSelectorOpen(true)}
              className="rounded-lg border border-ap-border px-3 py-1.5 text-[13px] text-ap-foreground transition-colors hover:bg-ap-field-background"
            >
              Change Image
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({
                  ...form,
                  imageUrl: "",
                  seoImageUrl: form.seoImageUrl,
                });
              }}
              className="rounded-lg border border-ap-danger/30 px-3 py-1.5 text-[13px] text-ap-danger transition-colors hover:bg-ap-danger/10"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setImageSelectorOpen(true)}
          className="grid w-full place-items-center gap-1 rounded-xl border border-dashed border-ap-muted/60 px-3 py-6 text-[14px] text-ap-muted transition-colors hover:border-ap-accent hover:text-ap-foreground"
        >
          <ImageIcon size={18} />
          <span>Select image from media library</span>
        </button>
      )}
    </div>
  );
}
