"use client";

import { useState } from "react";
import { Trash2, Plus, Image as ImageIcon } from "lucide-react";
import MarkdownEditor from "../../../../components/markdown-editor";
import { MediaSelector } from "../../../../components/media-selector";
import { ProductFormData } from "../types";
import { toast } from "@heroui/react";
import { useConfig } from "@nishchinte/config/client";

export function BasicInfoCard({
  formData,
  updateFormData,
}: {
  formData: ProductFormData;
  updateFormData: (updates: Partial<ProductFormData>) => void;
}) {
  const { videoAllowed } = useConfig();
  const [isMediaSelectorOpen, setMediaSelectorOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-ap-border bg-ap-surface p-6 flex flex-col gap-5">
      {/* Title */}
      <div>
        <label className="text-[13px] font-semibold text-ap-foreground block mb-1">
          Product Title <span className="text-ap-danger">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="e.g. Short Sleeve Casual T-Shirt"
          className="w-full px-3 py-2 border border-ap-border rounded-xl text-[14px] focus:ring-2 focus:ring-ap-accent-soft focus:border-ap-accent outline-none transition-all shadow-sm text-ap-foreground placeholder:text-ap-muted/60"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[13px] font-semibold text-ap-foreground block mb-1">
          Description
        </label>
        <MarkdownEditor
          allowed={["image"]}
          value={formData.description}
          onChange={(val) => updateFormData({ description: val })}
        />
      </div>

      {/* Media */}
      <div>
        <label className="text-[13px] font-semibold text-ap-foreground block mb-1">
          Product Media
        </label>
        <div className="mt-1">
          {formData.media.length === 0 ? (
            <div
              onClick={() => setMediaSelectorOpen(true)}
              className="group cursor-pointer relative border-2 border-dashed border-ap-accent/30 rounded-2xl bg-ap-accent/5 hover:bg-ap-accent/10 hover:border-ap-accent/50 transition-all duration-300 p-10 flex flex-col items-center justify-center text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-linear-to-b from-transparent to-ap-accent/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="w-16 h-16 mb-4 rounded-full bg-ap-surface shadow-sm border border-ap-border/60 flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all duration-300 relative z-10">
                <ImageIcon className="w-7 h-7 text-ap-accent/80 group-hover:text-ap-accent transition-colors" />
              </div>
              <div className="relative z-10 flex flex-col gap-1.5">
                <h3 className="text-[16px] font-semibold text-ap-foreground">
                  Select Product Media
                </h3>
                <p className="text-[14px] text-ap-muted font-medium max-w-60">
                  Click to choose photos from your media library or upload new
                  files
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-ap-border rounded-[10px] p-6 bg-ap-field-background flex flex-col md:flex-row gap-3 items-start justify-start">
              {/* Main Media (Featured) */}
              <div className="relative max-w-full md:max-w-1/2 lg:max-w-1/3 aspect-square rounded-lg overflow-hidden border border-ap-border group bg-ap-surface">
                {formData.media[0]?.mimeType?.startsWith("video/") ? (
                  <video
                    src={formData.media[0].url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={formData.media[0]?.url}
                    alt="Product preview"
                    className="w-full h-full object-contain"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaSelectorOpen(true)}
                    className="px-4 py-2 bg-ap-surface rounded-lg font-medium text-sm hover:bg-ap-surface/90 shadow-sm"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateFormData({
                        media: formData.media.filter((_, i) => i !== 0),
                      })
                    }
                    className="px-4 py-2 bg-ap-surface rounded-lg font-medium text-sm text-ap-danger hover:bg-ap-surface/90 shadow-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Thumbnail Grid & Upload More */}
              <div className="flex items-center flex-wrap gap-3">
                {formData.media.slice(1).map((item, i) => (
                  <div
                    key={i}
                    className="relative w-24 h-24 rounded-lg overflow-hidden border border-ap-border group bg-ap-surface"
                  >
                    {item.mimeType?.startsWith("video/") ? (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        updateFormData({
                          media: formData.media.filter(
                            (_, idx) => idx !== i + 1,
                          ),
                        })
                      }
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 size={16} className="text-white" />
                    </button>
                  </div>
                ))}
                {/* Add More Button */}
                {formData.media.length < 8 && (
                  <div
                    onClick={() => setMediaSelectorOpen(true)}
                    className="w-24 h-24 rounded-lg border border-dashed border-ap-border flex items-center justify-center cursor-pointer hover:border-ap-accent hover:bg-ap-accent/5 transition-all bg-ap-surface"
                  >
                    <Plus size={20} className="text-ap-muted" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <MediaSelector
        isOpen={isMediaSelectorOpen}
        onClose={() => setMediaSelectorOpen(false)}
        multiple={true}
        allowed={videoAllowed ? ["image", "video"] : ["image"]}
        onSelect={(files, e) => {
          // Create a mutable copy of the selected files array
          let processedFiles = [...files];

          // If form data currently has no media, enforce the first-image rule
          if (formData.media.length === 0) {
            // Find the index of the very first image in the selection
            const firstImageIndex = processedFiles.findIndex((f) =>
              f.mimeType.startsWith("image/"),
            );

            // Case A: No images were selected at all (only videos)
            if (firstImageIndex === -1) {
              e?.preventDefault();
              return toast.warning("First content should be an image");
            }

            // Case B: Images exist, but there are leading videos that need to be moved backward
            if (firstImageIndex > 0) {
              const leadingVideos = processedFiles.slice(0, firstImageIndex);
              const firstImage = processedFiles[firstImageIndex];
              const remainingFiles = processedFiles.slice(firstImageIndex + 1);

              // Reconstruct the array: First Image -> Leading Videos -> Rest of the files
              processedFiles = [
                firstImage,
                ...leadingVideos,
                ...remainingFiles,
              ];
            }
          }

          // Map and filter using the processed files array
          const currentUrls = new Set(formData.media.map((m) => m.url));
          const newMedia = processedFiles
            .filter((file) => !currentUrls.has(file.url))
            .map((file) => ({
              url: file.url,
              mimeType: file.mimeType || "image/jpeg",
            }));

          updateFormData({
            media: [...formData.media, ...newMedia],
          });
        }}
      />
    </section>
  );
}
