"use client";

import { useMemo } from "react";
import { Select, ListBox, ListBoxItem, cn } from "@heroui/react";
import { FolderTree, Folder, CornerDownRight } from "lucide-react";
import {
  buildCategoryTree,
  flattenCategoryTree,
  getDescendantCategoryIds,
  findCategoryPath,
} from "@nishchinte/utils";
import type { CategoryItem } from "@nishchinte/server/actions";

export type CategoryParentSelectProps = {
  value: string;
  onChange: (value: string) => void;
  categories: CategoryItem[];
  excludeCategoryId?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

export function CategoryParentSelect({
  value,
  onChange,
  categories,
  excludeCategoryId,
  disabled = false,
  className,
  placeholder = "Select parent category",
}: CategoryParentSelectProps) {
  const availableOptions = useMemo(() => {
    const excludedIds = excludeCategoryId
      ? getDescendantCategoryIds(categories, excludeCategoryId)
      : new Set<string>();

    const filtered = categories.filter((c) => !excludedIds.has(c.id));
    const tree = buildCategoryTree(filtered);
    const flat = flattenCategoryTree(tree);

    return flat.map((item) => {
      const path = findCategoryPath(categories, item.id)
        .map((p) => p.name)
        .join(" › ");

      return {
        ...item,
        pathText: path,
      };
    });
  }, [categories, excludeCategoryId]);

  const selectedCategory = useMemo(() => {
    if (!value) return null;
    return availableOptions.find((o) => o.id === value) || null;
  }, [availableOptions, value]);

  return (
    <Select
      aria-label={placeholder}
      value={value || ""}
      isDisabled={disabled}
      onChange={(val) => onChange(val?.toString() || "")}
      className={className}
    >
      {({ isFocused }) => (
        <>
          <Select.Trigger
            className={cn(
              "flex! justify-between! items-center! px-3! py-2! border! border-ap-border! rounded-xl! shadow-sm! text-[14px]! transition-colors! outline-none! min-w-full! cursor-pointer! relative!",
              isFocused
                ? "ring-2! ring-ap-accent-soft! border-ap-accent!"
                : "",
            )}
          >
            <Select.Value className="text-ap-foreground/90 truncate text-xs sm:text-sm">
              {() => {
                if (!selectedCategory) {
                  return (
                    <span className="flex items-center gap-2 text-ap-foreground">
                      <FolderTree size={14} className="text-ap-muted shrink-0" />
                      <span className="truncate">None (Top-Level Category)</span>
                    </span>
                  );
                }

                return (
                  <span className="flex items-center gap-2 text-ap-foreground min-w-0">
                    <Folder size={14} className="text-ap-muted shrink-0" />
                    <span className="truncate font-medium">
                      {selectedCategory.pathText}
                    </span>
                  </span>
                );
              }}
            </Select.Value>
            <Select.Indicator className="text-ap-muted shrink-0 ml-2" />
          </Select.Trigger>
          <Select.Popover className="rounded-xl border border-ap-border bg-ap-surface shadow-xl max-h-80 overflow-y-auto">
            <ListBox className="p-1 space-y-0.5">
              <ListBoxItem
                id=""
                textValue="None (Top-Level Category)"
                className="rounded-lg py-2 px-2.5 transition-colors data-[hover=true]:bg-ap-accent/10 data-[hover=true]:text-ap-accent border-b border-ap-border/40 mb-1"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 place-content-center rounded-md bg-ap-field-background text-ap-muted">
                    <FolderTree size={14} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-ap-foreground">
                      None (Top-Level Category)
                    </p>
                    <p className="text-[11px] text-ap-muted">
                      Create this category as a main top-level department
                    </p>
                  </div>
                </div>
              </ListBoxItem>

              {availableOptions.map((opt) => (
                <ListBoxItem
                  key={opt.id}
                  id={opt.id}
                  textValue={opt.pathText}
                  className="rounded-lg py-1.5 px-2 transition-colors data-[hover=true]:bg-ap-accent/10 data-[hover=true]:text-ap-accent cursor-pointer"
                >
                  <div
                    className="flex items-center gap-2 w-full"
                    style={{ paddingLeft: `${opt.depth * 18}px` }}
                  >
                    {opt.depth > 0 ? (
                      <span className="flex items-center text-ap-muted/70 shrink-0">
                        <CornerDownRight size={13} />
                      </span>
                    ) : (
                      <span className="flex items-center text-ap-muted shrink-0">
                        <Folder size={14} />
                      </span>
                    )}

                    <span
                      className={cn(
                        "truncate text-xs",
                        opt.depth === 0
                          ? "font-semibold text-ap-foreground"
                          : "font-medium text-ap-foreground/90",
                      )}
                    >
                      {opt.name}
                    </span>

                    {opt.depth > 0 && (
                      <span className="ml-auto shrink-0 text-[10px] text-ap-muted/70 font-mono bg-ap-field-background/60 px-1.5 py-0.5 rounded border border-ap-border/40">
                        /{opt.node.slug}
                      </span>
                    )}
                  </div>
                </ListBoxItem>
              ))}
            </ListBox>
          </Select.Popover>
        </>
      )}
    </Select>
  );
}
