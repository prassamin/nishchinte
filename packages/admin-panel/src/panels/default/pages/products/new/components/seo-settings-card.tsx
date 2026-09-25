import { Spinner } from "@heroui/react";
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  RotateCcw,
  Tag,
} from "lucide-react";

type SeoSettingsCardProps = {
  slugPrefix: string;
  slug: string;
  fullSlugPath: string;
  onSlugChange: (slug: string) => void;
  onResetSlug: () => void;
  isSlugManuallyEdited: boolean;
  isCheckingSlug: boolean;
  slugAvailability: {
    available: boolean;
    slug: string;
    suggestedSlug?: string;
  } | null;
  seoTitle: string;
  seoDescription: string;
  seoImageUrl: string;
  onSeoTitleChange: (title: string) => void;
  onSeoDescriptionChange: (description: string) => void;
  onSeoImageSelect: (files: { url: string; mimeType: string }[]) => void;
  onSeoImageSelectorOpen: () => void;
  isSeoTitleManuallyEdited: boolean;
  setSeoTitleManuallyEdited: (value: boolean) => void;
  isSeoDescriptionManuallyEdited: boolean;
  setSeoDescriptionManuallyEdited: (value: boolean) => void;
  isSeoImageManuallyEdited: boolean;
  setSeoImageManuallyEdited: (value: boolean) => void;
};

export function SeoSettingsCard({
  slugPrefix,
  slug,
  fullSlugPath,
  onSlugChange,
  onResetSlug,
  isSlugManuallyEdited,
  isCheckingSlug,
  slugAvailability,
  seoTitle,
  seoDescription,
  seoImageUrl,
  onSeoTitleChange,
  onSeoDescriptionChange,
  onSeoImageSelect,
  onSeoImageSelectorOpen,
  setSeoImageManuallyEdited,
}: SeoSettingsCardProps) {
  return (
    <div className="rounded-2xl border border-ap-border bg-ap-surface p-5">
      <h2 className="mb-4 text-[15px] font-bold text-ap-foreground">
        SEO Settings
      </h2>
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[13px] font-medium text-ap-foreground">
              <Tag size={14} className="text-ap-muted" />
              URL Slug
            </label>
            {isSlugManuallyEdited && (
              <button
                type="button"
                onClick={onResetSlug}
                className="flex items-center gap-1 text-[12px] font-medium text-ap-accent transition-colors hover:underline"
              >
                <RotateCcw size={12} />
                Reset to default
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-ap-border bg-ap-field-background/30 shadow-sm transition-all focus-within:border-ap-accent focus-within:ring-2 focus-within:ring-ap-accent-soft">
            <div className="flex items-center">
              <span className="shrink-0 select-none border-r border-ap-border bg-ap-surface/60 px-3 py-2 text-[12px] text-ap-muted">
                {slugPrefix}
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
                placeholder="product-slug"
                className="w-full bg-transparent px-3 py-2 text-[14px] text-ap-foreground outline-none placeholder:text-ap-muted/60"
              />
              <div className="flex items-center pr-3">
                {isCheckingSlug ? (
                  <Spinner size="sm" className="text-ap-accent" />
                ) : slugAvailability ? (
                  slugAvailability.available ? (
                    <CheckCircle2 size={16} className="text-ap-success" />
                  ) : (
                    <AlertCircle size={16} className="text-ap-danger" />
                  )
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[12px]">
            <div>
              {isCheckingSlug ? (
                <span className="text-ap-muted">Checking availability...</span>
              ) : slugAvailability ? (
                slugAvailability.available ? (
                  <span className="flex items-center gap-1 font-medium text-ap-success">
                    <CheckCircle2 size={12} />
                    Slug is available
                  </span>
                ) : (
                  <div className="space-y-1">
                    <span className="flex items-center gap-1 font-medium text-ap-danger">
                      <AlertCircle size={12} />
                      This slug is already in use
                    </span>
                    {slugAvailability.suggestedSlug && (
                      <div className="flex items-center gap-1.5 text-ap-muted">
                        <span>Suggested:</span>
                        <button
                          type="button"
                          onClick={() =>
                            onSlugChange(slugAvailability.suggestedSlug!)
                          }
                          className="rounded bg-ap-accent/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-ap-accent transition-colors hover:bg-ap-accent/20"
                        >
                          {slugAvailability.suggestedSlug}
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <span className="text-ap-muted">
                  Full path:{" "}
                  <span className="font-medium text-ap-foreground">
                    {fullSlugPath}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-medium text-ap-foreground">
            Meta Title
          </label>
          <input
            value={seoTitle}
            onChange={(e) => onSeoTitleChange(e.target.value)}
            placeholder="e.g. Premium Cotton Casual Shirt"
            className="w-full rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
          />
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-medium text-ap-foreground">
            Meta Description
          </label>
          <textarea
            value={seoDescription}
            onChange={(e) => onSeoDescriptionChange(e.target.value)}
            rows={3}
            placeholder="Short description for search engine results..."
            className="w-full resize-none rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
          />
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-medium text-ap-foreground">
            Social Share Image (OG / Twitter)
          </label>

          {seoImageUrl ? (
            <div className="rounded-xl border border-ap-border bg-ap-field-background p-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={seoImageUrl}
                  alt={seoTitle || "SEO Image"}
                  className="h-16 w-16 rounded-lg border border-ap-border/60 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ap-foreground">
                    SEO image selected
                  </p>
                  <p className="truncate text-[12px] text-ap-muted">
                    {seoImageUrl}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSeoImageSelectorOpen()}
                  className="rounded-lg border border-ap-border px-3 py-1.5 text-[13px] text-ap-foreground transition-colors hover:bg-ap-field-background"
                >
                  Change Image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSeoImageManuallyEdited(true);
                    onSeoImageSelect([{ url: "", mimeType: "" }]);
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
              onClick={() => onSeoImageSelectorOpen()}
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
