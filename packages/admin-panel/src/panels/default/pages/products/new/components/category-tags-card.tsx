"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Folder,
  FolderTree,
  CornerDownRight,
  Plus,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@heroui/react";
import { ProductFormData } from "../types";
import {
  CategoryUpsertDrawer,
  type CategoryUpsertInput,
} from "../../components/category-upsert-drawer";
import {
  buildCategoryTree,
  flattenCategoryTree,
  findCategoryPath,
  slugify,
} from "@nishchinte/utils";
import type { CategoryItem } from "@nishchinte/server/actions";

export function CategoryTagsCard({
  formData,
  updateFormData,
  categories,
  isLoadingCategories,
}: {
  formData: ProductFormData;
  updateFormData: (updates: Partial<ProductFormData>) => void;
  categories: CategoryItem[];
  isLoadingCategories?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isCategoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [categoryDrawerInitialValues, setCategoryDrawerInitialValues] =
    useState<Partial<CategoryUpsertInput>>({});

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === formData.categoryId) || null,
    [categories, formData.categoryId],
  );

  const flatTree = useMemo(() => {
    const tree = buildCategoryTree(categories);
    const flat = flattenCategoryTree(tree);
    return flat.map((item) => ({
      ...item,
      pathText: findCategoryPath(categories, item.id)
        .map((p) => p.name)
        .join(" › "),
    }));
  }, [categories]);

  useEffect(() => {
    if (!isOpen) {
      if (selectedCategory) {
        const path = findCategoryPath(categories, selectedCategory.id)
          .map((p) => p.name)
          .join(" › ");
        setInputValue(path || selectedCategory.name);
      } else {
        setInputValue("");
      }
    }
  }, [selectedCategory, isOpen, categories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSearching = Boolean(
    isOpen &&
      inputValue.trim() &&
      (!selectedCategory ||
        (inputValue.trim().toLowerCase() !==
          selectedCategory.name.toLowerCase() &&
          inputValue.trim().toLowerCase() !==
            findCategoryPath(categories, selectedCategory.id)
              .map((p) => p.name)
              .join(" › ")
              .toLowerCase())),
  );

  const filteredTree = useMemo(() => {
    if (!isSearching) return flatTree;
    const q = inputValue.trim().toLowerCase();
    return flatTree.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.node.slug && item.node.slug.toLowerCase().includes(q)) ||
        item.pathText.toLowerCase().includes(q),
    );
  }, [flatTree, inputValue, isSearching]);

  const handleSelectCategory = (categoryId: string) => {
    updateFormData({ categoryId });
    setIsOpen(false);
  };

  return (
    <>
      <section className="rounded-2xl border border-ap-border bg-ap-surface">
        <div className="p-6 border-b border-ap-border/20">
          <h2 className="text-[15px] font-bold text-ap-foreground flex items-center gap-2">
            <FolderTree size={18} className="text-ap-muted" />
            Category
          </h2>
        </div>

        <div className="p-6 space-y-6 bg-ap-surface rounded-[inherit]">
          <div>
            <label className="text-[13px] font-medium text-ap-foreground block mb-2">
              Select Category
            </label>

            <div className="relative" ref={wrapperRef}>
              {/* Hybrid Input Box */}
              <div
                className={cn(
                  "flex items-center gap-2 p-2.5 min-h-11 border border-ap-border/60 rounded-xl bg-ap-field-background/30 transition-all shadow-sm cursor-pointer",
                  isOpen
                    ? "ring-2 ring-ap-accent-soft border-ap-accent bg-ap-surface"
                    : "hover:border-ap-border",
                )}
                onClick={() => {
                  if (!isOpen) {
                    setIsOpen(true);
                    inputRef.current?.focus();
                  }
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (!isOpen) setIsOpen(true);
                    if (e.target.value.trim() === "") {
                      updateFormData({ categoryId: "" });
                    }
                  }}
                  onFocus={(e) => {
                    setIsOpen(true);
                    if (selectedCategory) {
                      e.target.select();
                    }
                  }}
                  placeholder={
                    isLoadingCategories
                      ? "Loading categories..."
                      : "Search or select category"
                  }
                  disabled={isLoadingCategories}
                  className="flex-1 bg-transparent text-[14px] text-ap-foreground placeholder:text-ap-muted/60 outline-none px-1 min-w-0"
                />

                <div className="flex items-center gap-1 shrink-0">
                  {(selectedCategory || inputValue) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateFormData({ categoryId: "" });
                        setInputValue("");
                        inputRef.current?.focus();
                        setIsOpen(true);
                      }}
                      className="p-1 text-ap-muted hover:text-ap-foreground hover:bg-ap-field-background rounded-md transition-colors cursor-pointer"
                      title="Clear category"
                    >
                      <X size={14} />
                    </button>
                  )}

                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-ap-muted transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </div>
              </div>

              {/* Dropdown - Matches CategoryParentSelect drawer/edit tree look */}
              {isOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-full rounded-xl border border-ap-border bg-ap-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="max-h-60 overflow-y-auto p-1 space-y-0.5 scrollbar-styled">
                    {/* None Option */}
                    {!isSearching && (
                      <button
                        type="button"
                        onClick={() => handleSelectCategory("")}
                        className={cn(
                          "w-full flex items-center justify-between rounded-lg py-1.5 px-2 transition-colors cursor-pointer border-b border-ap-border/40 mb-1 text-left",
                          !formData.categoryId
                            ? "bg-ap-accent/10 text-ap-accent font-semibold"
                            : "hover:bg-ap-accent/10 hover:text-ap-accent text-ap-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex items-center text-ap-muted shrink-0">
                            <Folder size={14} />
                          </span>
                          <span className="truncate text-xs font-semibold text-ap-foreground">
                            None
                          </span>
                        </div>
                        {!formData.categoryId && <Check size={14} />}
                      </button>
                    )}

                    {filteredTree.length === 0 ? (
                      <p className="px-3 py-2 text-[13px] text-ap-muted">
                        No categories found.
                      </p>
                    ) : (
                      filteredTree.map((item) => {
                        const isSelected = item.id === formData.categoryId;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectCategory(item.id)}
                            className={cn(
                              "w-full flex items-center justify-between rounded-lg py-1.5 px-2 transition-colors cursor-pointer text-left",
                              isSelected
                                ? "bg-ap-accent/10 text-ap-accent"
                                : "hover:bg-ap-accent/10 hover:text-ap-accent text-ap-foreground",
                            )}
                          >
                            <div
                              className="flex items-center gap-2 min-w-0 flex-1"
                              style={{
                                paddingLeft: isSearching
                                  ? 0
                                  : `${item.depth * 18}px`,
                              }}
                            >
                              {!isSearching ? (
                                item.depth > 0 ? (
                                  <span className="flex items-center text-ap-muted/70 shrink-0">
                                    <CornerDownRight size={13} />
                                  </span>
                                ) : (
                                  <span className="flex items-center text-ap-muted shrink-0">
                                    <Folder size={14} />
                                  </span>
                                )
                              ) : (
                                <span className="flex items-center text-ap-muted shrink-0">
                                  <Folder size={14} />
                                </span>
                              )}

                              <div className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    "truncate block text-xs",
                                    item.depth === 0
                                      ? "font-semibold text-ap-foreground"
                                      : "font-medium text-ap-foreground/90",
                                  )}
                                >
                                  {item.name}
                                </span>
                                {isSearching && item.depth > 0 && (
                                  <span className="text-[10px] text-ap-muted truncate block">
                                    {item.pathText}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {item.depth > 0 && (
                                <span className="text-[10px] text-ap-muted/70 font-mono px-1.5 py-0.5 rounded">
                                  /{item.node.slug}
                                </span>
                              )}
                              {isSelected && <Check size={14} />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Create New Category Footer */}
                  <div className="p-2 border-t border-ap-border/50 bg-ap-field-background/30">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        const query = inputValue.trim();
                        setCategoryDrawerInitialValues({
                          name: query,
                          slug: slugify(query),
                        });
                        setCategoryDrawerOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-ap-foreground hover:bg-ap-surface border border-transparent hover:border-ap-border/60 transition-colors cursor-pointer"
                    >
                      <Plus size={16} className="text-ap-muted shrink-0" />
                      Create New Category
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <CategoryUpsertDrawer
        isOpen={isCategoryDrawerOpen}
        onOpenChange={setCategoryDrawerOpen}
        mode="create"
        initialValues={categoryDrawerInitialValues}
        onSuccess={(created) => {
          updateFormData({ categoryId: created.id });
          setInputValue(created.name);
        }}
      />
    </>
  );
}
