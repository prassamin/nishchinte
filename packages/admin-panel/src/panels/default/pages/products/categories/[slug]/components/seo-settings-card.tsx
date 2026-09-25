"use client";

import { Tag, Image as ImageIcon } from "lucide-react";
import { useCategoryStore } from "../store";
import { getLeafSegment } from "@nishchinte/utils";

type SeoSettingsCardProps = {
  slugPrefix: string;
  fullSlugPath: string;
  parentSlug?: string | null;
};

function sanitizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "");
}

export function SeoSettingsCard({
  slugPrefix,
  fullSlugPath,
  parentSlug,
}: SeoSettingsCardProps) {
  const {
    form,
    setForm,
    setSeoTitleManuallyEdited,
    setSeoDescriptionManuallyEdited,
    setSeoImageManuallyEdited,
    setSeoImageSelectorOpen,
  } = useCategoryStore();

  const currentLeaf = getLeafSegment(form.slug);

  return (
    <div className="rounded-2xl border border-ap-border bg-ap-surface p-5">
      <h2 className="mb-4 text-[15px] font-bold text-ap-foreground">
        SEO Settings
      </h2>
      <div className="space-y-4">
        <div>
          <label className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ap-foreground">
            <Tag size={14} className="text-ap-muted" />
            Slug
          </label>
          <div className="overflow-hidden rounded-xl border border-ap-border bg-ap-field-background/30 shadow-sm transition-all focus-within:border-ap-accent focus-within:ring-2 focus-within:ring-ap-accent-soft">
            <div className="flex items-center">
              <span className="max-w-[60%] border-r border-ap-border bg-ap-surface/60 px-3 py-2 text-[12px] text-ap-muted whitespace-nowrap">
                {slugPrefix}
              </span>
              <input
                value={currentLeaf}
                onChange={(e) => {
                  const sanitized = sanitizeSlugInput(e.target.value);
                  const fullSlug = parentSlug
                    ? `${parentSlug}/${sanitized}`
                    : sanitized;
                  setForm({ ...form, slug: fullSlug });
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="e.g. t-shirts"
                className="w-full bg-transparent px-3 py-2 text-[14px] text-ap-foreground outline-none placeholder:text-ap-muted/60"
              />
            </div>
          </div>
          <p className="mt-1 text-[12px] text-ap-muted">
            Full path:{" "}
            <span className="font-medium text-ap-foreground">
              {fullSlugPath}
            </span>
          </p>
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-medium text-ap-foreground">
            Page Title
          </label>
          <input
            value={form.seoTitle}
            onChange={(e) => {
              setSeoTitleManuallyEdited(true);
              setForm({ ...form, seoTitle: e.target.value });
            }}
            placeholder="e.g. Best T-Shirt Collection"
            className="w-full rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
          />
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-medium text-ap-foreground">
            Meta Description
          </label>
          <textarea
            value={form.seoDescription}
            onChange={(e) => {
              setSeoDescriptionManuallyEdited(true);
              setForm({ ...form, seoDescription: e.target.value });
            }}
            rows={3}
            placeholder="Brief description for search engine results"
            className="w-full resize-none rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
          />
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-medium text-ap-foreground">
            Social Share Image (OG / Twitter)
          </label>

          {form.seoImageUrl ? (
            <div className="rounded-xl border border-ap-border bg-ap-field-background p-3">
              <div className="flex items-center gap-3">
                <img
                  src={form.seoImageUrl}
                  alt={form.seoTitle || form.name || "SEO Image"}
                  className="h-16 w-16 rounded-lg border border-ap-border/60 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ap-foreground">
                    SEO image selected
                  </p>
                  <p className="truncate text-[12px] text-ap-muted">
                    {form.seoImageUrl}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSeoImageSelectorOpen(true)}
                  className="rounded-lg border border-ap-border px-3 py-1.5 text-[13px] text-ap-foreground transition-colors hover:bg-ap-field-background"
                >
                  Change Image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSeoImageManuallyEdited(true);
                    setForm({ ...form, seoImageUrl: "" });
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
              onClick={() => setSeoImageSelectorOpen(true)}
              className="grid w-full place-items-center gap-1 rounded-xl border border-dashed border-ap-muted/60 px-3 py-4 text-[14px] text-ap-muted transition-colors hover:border-ap-accent hover:text-ap-foreground"
            >
              <ImageIcon size={18} />
              <span>Select social share image from media library</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
