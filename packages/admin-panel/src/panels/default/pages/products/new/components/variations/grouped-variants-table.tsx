"use client";

import { useMemo, useState } from "react";
import { Select, ListBox, ListBoxItem, cn } from "@heroui/react";
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";
import { ProductFormData, ProductVariant } from "../../types";
import { VariantEditModal } from "./variant-edit-modal";
import { MediaSelector } from "../../../../../components/media-selector";
import { useConfig } from "@nishchinte/config/client";

export function GroupedVariantsTable({
  formData,
  groupByOption,
  setGroupByOption,
  updateFormData,
}: {
  formData: ProductFormData;
  groupByOption: string | null;
  setGroupByOption: (val: string | null) => void;
  updateFormData: (updates: Partial<ProductFormData>) => void;
}) {
  const { currency } = useConfig();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(
    null,
  );
  const [imagingVariant, setImagingVariant] = useState<ProductVariant | null>(
    null,
  );
  const [imagingGroup, setImagingGroup] = useState<string | null>(null);

  const groupedVariants = useMemo(() => {
    if (!groupByOption || formData.variants.length === 0) return null;

    const groups: Record<string, ProductVariant[]> = {};
    formData.variants.forEach((v) => {
      const groupVal = (v.optionValues as any)?.[groupByOption] || "Other";
      if (!groups[groupVal]) groups[groupVal] = [];
      groups[groupVal].push(v);
    });
    return groups;
  }, [formData.variants, groupByOption]);

  if (!groupedVariants || Object.keys(groupedVariants).length === 0)
    return null;

  // When there is only one option type every "group" contains exactly one variant
  // so expand/collapse adds zero value — render a clean flat table instead.
  const isSingleOption =
    formData.options.filter((o) => o.name.trim() && o.values.length > 0)
      .length === 1;

  const updateVariant = (
    variantId: string,
    updates: Partial<ProductVariant>,
  ) => {
    const newVars = formData.variants.map((v) =>
      v.id === variantId ? { ...v, ...updates } : v,
    );
    updateFormData({ variants: newVars });
  };

  const updateBulkGroup = (
    groupName: string,
    field: "price",
    value: string,
  ) => {
    const newVars = formData.variants.map((v) => {
      const gName = (v.optionValues as any)?.[groupByOption || ""] || "Other";
      if (gName === groupName) {
        return { ...v, [field]: value };
      }
      return v;
    });
    updateFormData({ variants: newVars });
  };

  const toggleGroupExpand = (groupName: string) => {
    const next = new Set(expandedGroups);
    if (next.has(groupName)) {
      next.delete(groupName);
    } else {
      next.add(groupName);
    }
    setExpandedGroups(next);
  };

  const expandAll = () => {
    if (expandedGroups.size === Object.keys(groupedVariants).length) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(Object.keys(groupedVariants)));
    }
  };

  const hasUnlimitedVariant = formData.variants.some(
    (variant) => variant.inventoryQuantity === -1,
  );
  const totalInventory = hasUnlimitedVariant
    ? -1
    : formData.variants.reduce(
        (acc, v) => acc + Math.max(0, v.inventoryQuantity || 0),
        0,
      );
  const isVariantPriceLocked = String(formData.price ?? "").trim() !== "";

  return (
    <div className="border-t-4 border-ap-field-background mt-4 bg-ap-surface rounded-[inherit]">
      {/* ── FLAT VIEW — only one option type, no nesting needed ─────── */}
      {isSingleOption ? (
        <>
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_140px] gap-4 px-6 py-3.5 border-b border-ap-border/50 bg-ap-field-background/30">
            <div className="text-[12px] font-bold text-ap-muted uppercase tracking-wider">
              Variant
            </div>
            <div className="text-[12px] font-bold text-ap-muted uppercase tracking-wider">
              Price
            </div>
          </div>

          <div className="flex flex-col">
            {formData.variants.map((v) => (
              <div
                key={v.id}
                onClick={() => setEditingVariant(v)}
                className="group grid grid-cols-[1fr_140px] items-center gap-4 px-6 py-3.5 border-b border-ap-border/40 last:border-0 hover:bg-ap-accent/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {v.imageUrl ? (
                    <div
                      className="w-10 h-10 rounded-md border border-ap-border/60 overflow-hidden bg-ap-surface shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagingVariant(v);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.imageUrl}
                        alt={v.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-md border border-ap-border/60 flex items-center justify-center bg-ap-field-background text-ap-muted shadow-sm shrink-0 cursor-pointer hover:bg-ap-field-background/80 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagingVariant(v);
                      }}
                    >
                      <ImageIcon size={16} className="text-ap-muted/50" />
                    </div>
                  )}
                  <span className="text-[14px] font-semibold text-ap-foreground/90 group-hover:text-ap-accent transition-colors truncate">
                    {v.title}
                  </span>
                </div>

                <div
                  className="relative shadow-sm rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ap-muted/80 text-[14px] font-medium">
                    {currency.symbol}
                  </span>
                  <input
                    type="number"
                    value={v.price}
                    onChange={(e) =>
                      updateVariant(v.id, { price: e.target.value })
                    }
                    min={0}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-ap-border/60 bg-ap-surface text-[14px] font-medium focus:ring-2 focus:ring-ap-accent-soft focus:border-ap-accent outline-none transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* ── GROUPED VIEW — 2+ option types, grouping makes sense ─── */}

          {/* Group By Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ap-border/50 bg-ap-surface">
            <div className="flex items-center gap-4">
              <span className="text-[14px] text-ap-foreground/80 font-semibold tracking-tight">
                Group by
              </span>
              <div className="w-32">
                <Select
                  aria-label="Group by"
                  value={groupByOption}
                  onChange={(key) => {
                    if (!key) return;
                    const val = key as string;
                    if (val) setGroupByOption(val);
                  }}
                  className="w-full"
                >
                  {({ isFocused }) => (
                    <>
                      <Select.Trigger
                        className={cn(
                          "flex! justify-between! px-3! py-2! border! border-ap-border! rounded-xl! shadow-sm! text-[14px]! transition-colors! outline-none! min-w-full! cursor-pointer! relative!",
                          isFocused
                            ? "ring-2! ring-ap-accent-soft! border-ap-accent!"
                            : "",
                        )}
                      >
                        <Select.Value className="truncate" />
                        <Select.Indicator className="text-ap-muted shrink-0" />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox className="p-1">
                          {formData.options
                            .filter((o) => o.name.trim())
                            .map((o) => (
                              <ListBoxItem
                                key={o.name.trim()}
                                id={o.name.trim()}
                                textValue={o.name.trim()}
                                className="rounded-md data-[hover=true]:bg-ap-accent/10 data-[hover=true]:text-ap-accent"
                              >
                                {o.name}
                              </ListBoxItem>
                            ))}
                        </ListBox>
                      </Select.Popover>
                    </>
                  )}
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-2 border border-ap-border/60 rounded-lg hover:bg-ap-field-background hover:border-ap-border text-ap-muted transition-colors bg-ap-surface shadow-sm"
              >
                <Search size={16} />
              </button>
              <button
                type="button"
                className="p-2 border border-ap-border/60 rounded-lg hover:bg-ap-field-background hover:border-ap-border text-ap-muted transition-colors bg-ap-surface shadow-sm"
              >
                <Filter size={16} />
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1fr_140px] gap-4 px-6 py-3.5 border-b border-ap-border/50 bg-ap-field-background/30">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-ap-muted uppercase tracking-wider">
                Variant
              </span>
              <span className="text-ap-muted/40">•</span>
              <button
                type="button"
                onClick={expandAll}
                className="text-[13px] font-semibold text-ap-accent hover:text-ap-accent/80 transition-colors"
              >
                {expandedGroups.size === Object.keys(groupedVariants).length
                  ? "Collapse all"
                  : "Expand all"}
              </button>
            </div>
            <div className="text-[12px] font-bold text-ap-muted uppercase tracking-wider">
              Price
            </div>
          </div>

          {/* Group Rows */}
          <div className="flex flex-col">
            {Object.entries(groupedVariants).map(([groupName, variants]) => {
              const isExpanded = expandedGroups.has(groupName);
              const parentPrice = variants[0]?.price || "";
              const isParentPriceDisabled =
                isVariantPriceLocked || variants.length <= 1;

              return (
                <div
                  key={groupName}
                  className="border-b border-ap-border/40 last:border-0 hover:bg-ap-field-background/30 transition-colors"
                >
                  <div className="group/row grid grid-cols-[1fr_140px] items-center gap-4 px-6 py-4">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const uniqueImgs = Array.from(
                          new Set(
                            variants.map((v) => v.imageUrl).filter(Boolean),
                          ),
                        ) as string[];
                        const rotations = [-18, 8, -6, 14, -12];
                        return (
                          <div
                            title="Click to set image for all variants in this group"
                            onClick={() => setImagingGroup(groupName)}
                            className="w-11 h-11 flex items-center justify-center cursor-pointer relative"
                          >
                            {uniqueImgs.length === 0 ? (
                              <div className="w-11 h-11 rounded-lg border border-ap-border/60 flex items-center justify-center bg-ap-field-background group/img text-ap-muted shadow-sm hover:border-ap-accent/50 hover:bg-ap-accent/10 transition-all">
                                <ImageIcon
                                  size={18}
                                  className="text-ap-muted/60 group-hover/img:text-ap-accent transition-colors"
                                />
                              </div>
                            ) : uniqueImgs.length === 1 ? (
                              <div className="w-11 h-11 rounded-lg border border-ap-border/60 overflow-hidden shadow-sm group-hover/row:border-ap-accent/50 transition-all relative">
                                <img
                                  src={uniqueImgs[0]}
                                  alt={groupName}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/25 transition-colors flex items-center justify-center">
                                  <ImageIcon
                                    size={14}
                                    className="text-white drop-shadow opacity-0 group-hover/row:opacity-100 transition-opacity"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="relative w-11 h-11">
                                {uniqueImgs.slice(0, 4).map((url, i) => (
                                  <div
                                    key={url}
                                    style={{
                                      transform: `rotate(${rotations[i] ?? rotations[i % rotations.length]}deg)`,
                                      zIndex: i + 1,
                                    }}
                                    className="absolute inset-0 w-11 h-11 rounded-lg border-2 border-ap-surface overflow-hidden shadow-md transition-all group-hover/row:scale-110"
                                  >
                                    <img
                                      src={url}
                                      alt={groupName}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex flex-col">
                        <p className="text-[15px] font-bold text-ap-foreground leading-tight tracking-tight">
                          {groupName}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleGroupExpand(groupName)}
                          className="flex items-center gap-1.5 text-[13px] text-ap-muted hover:text-ap-accent font-semibold mt-1 transition-colors"
                        >
                          {variants.length} variant
                          {variants.length !== 1 ? "s" : ""}
                          <span className="bg-ap-field-background p-0.5 rounded-full border border-ap-border/40">
                            {isExpanded ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="relative shadow-sm rounded-lg group/input">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ap-muted/80 text-[14px] font-medium">
                          {currency.symbol}
                        </span>
                        <input
                          type="number"
                          value={parentPrice}
                          onChange={(e) =>
                            updateBulkGroup(groupName, "price", e.target.value)
                          }
                          min={0}
                          placeholder="0.00"
                          disabled={isParentPriceDisabled}
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-ap-border/60 bg-ap-surface text-[14px] font-medium focus:ring-2 focus:ring-ap-accent-soft focus:border-ap-accent outline-none transition-all group-hover/input:border-ap-border disabled:bg-ap-field-background/50 disabled:text-ap-muted/80 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nested Sub-variants */}
                  {isExpanded && (
                    <div className="pl-21 pr-6 py-2 border-t border-ap-border/30 bg-black/1.5 dark:bg-white/1.5 shadow-inner">
                      {variants.map((v) => {
                        return (
                          <div
                            key={v.id}
                            onClick={() => setEditingVariant(v)}
                            className="group/subrow grid grid-cols-[1fr_140px] gap-4 py-3 items-center border-b border-ap-border/30 last:border-0 hover:bg-ap-accent/5 transition-colors rounded-lg px-2 -mx-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {v.imageUrl ? (
                                <div
                                  className="w-10 h-10 rounded-md border border-ap-border/60 overflow-hidden bg-ap-surface shrink-0 group-hover/subrow:border-ap-accent/50 cursor-pointer hover:opacity-80 transition-opacity relative"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setImagingVariant(v);
                                  }}
                                >
                                  <img
                                    src={v.imageUrl}
                                    alt={v.title}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 hover:bg-black/25 transition-colors flex items-center justify-center">
                                    <ImageIcon
                                      size={14}
                                      className="text-white drop-shadow opacity-0 group-hover/subrow:opacity-100 transition-opacity"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-md border border-ap-border/60 flex items-center justify-center bg-ap-surface text-ap-muted shadow-sm shrink-0 cursor-pointer transition-colors group/nested-img hover:border-ap-accent/50 hover:bg-ap-accent/10 "
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setImagingVariant(v);
                                  }}
                                >
                                  <ImageIcon
                                    size={16}
                                    className="text-ap-muted/50 "
                                  />
                                </div>
                              )}
                              <span className="text-[14px] font-semibold text-ap-foreground/90 group-hover/subrow:text-ap-accent transition-colors text-left truncate">
                                {v.title}
                              </span>
                            </div>
                            <div>
                              <div className="relative shadow-sm rounded-lg group/subinput">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ap-muted/80 text-[13px] font-medium">
                                  {currency.symbol}
                                </span>
                                <input
                                  type="number"
                                  value={v.price}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onFocus={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    updateVariant(v.id, {
                                      price: e.target.value,
                                    })
                                  }
                                  placeholder="0.00"
                                  min={0}
                                  className="w-full pl-7 pr-3 py-1.5 rounded-md border border-ap-border/60 bg-ap-surface text-[14px] focus:ring-2 focus:ring-ap-accent-soft focus:border-ap-accent outline-none transition-all group-hover/subinput:border-ap-border"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="px-6 py-4 bg-ap-field-background/50 border-t border-ap-border/40 text-center">
        <span className="text-[13px] text-ap-muted font-semibold tracking-wide">
          Total inventory at Shop location:{" "}
          <span className="text-ap-foreground">
            {totalInventory === -1
              ? "Unlimited"
              : `${totalInventory} available`}
          </span>
        </span>
      </div>

      <VariantEditModal
        isOpen={!!editingVariant}
        onClose={() => setEditingVariant(null)}
        variant={editingVariant}
        onSave={(updatedVariant) => {
          updateVariant(updatedVariant.id, updatedVariant);
        }}
      />

      <MediaSelector
        isOpen={!!imagingVariant}
        onClose={() => setImagingVariant(null)}
        multiple={false}
        onSelect={(files) => {
          if (files.length > 0 && imagingVariant) {
            const selectedFile = files[0];
            const newVars = formData.variants.map((v) =>
              v.id === imagingVariant.id
                ? { ...v, imageUrl: selectedFile.url }
                : v,
            );

            // Auto-push to main product media if not already present
            const currentMediaUrls = new Set(formData.media.map((m) => m.url));
            const newMedia = currentMediaUrls.has(selectedFile.url)
              ? formData.media
              : [
                  ...formData.media,
                  {
                    url: selectedFile.url,
                    mimeType: selectedFile.mimeType || "image/jpeg",
                  },
                ];

            updateFormData({ variants: newVars, media: newMedia });
          }
          setImagingVariant(null);
        }}
      />

      <MediaSelector
        isOpen={!!imagingGroup}
        onClose={() => setImagingGroup(null)}
        multiple={false}
        onSelect={(files) => {
          if (files.length > 0 && imagingGroup && groupedVariants) {
            const selectedFile = files[0];
            const groupVariants = groupedVariants[imagingGroup] || [];
            const newVars = formData.variants.map((v) => {
              if (groupVariants.some((gv) => gv.id === v.id)) {
                return { ...v, imageUrl: selectedFile.url };
              }
              return v;
            });

            // Auto-push to main product media if not already present
            const currentMediaUrls = new Set(formData.media.map((m) => m.url));
            const newMedia = currentMediaUrls.has(selectedFile.url)
              ? formData.media
              : [
                  ...formData.media,
                  {
                    url: selectedFile.url,
                    mimeType: selectedFile.mimeType || "image/jpeg",
                  },
                ];

            updateFormData({ variants: newVars, media: newMedia });
          }
          setImagingGroup(null);
        }}
      />
    </div>
  );
}
