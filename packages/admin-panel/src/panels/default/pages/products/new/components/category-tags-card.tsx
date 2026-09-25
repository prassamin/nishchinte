"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FolderTree,
  Plus,
  Check,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@heroui/react";
import { ProductFormData } from "../types";
import {
  CategoryUpsertDrawer,
  type CategoryUpsertInput,
} from "../../components/category-upsert-drawer";

type Category = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  imageUrl?: string | null;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CategoryTagsCard({
  formData,
  updateFormData,
  categories,
  isLoadingCategories,
}: {
  formData: ProductFormData;
  updateFormData: (updates: Partial<ProductFormData>) => void;
  categories: Category[];
  isLoadingCategories?: boolean;
}) {
  const [categoryInput, setCategoryInput] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);

  const [isCategoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [categoryDrawerInitialValues, setCategoryDrawerInitialValues] =
    useState<Partial<CategoryUpsertInput>>({});

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === formData.categoryId) || null,
    [categories, formData.categoryId],
  );

  useEffect(() => {
    if (!isCategoryOpen) {
      setCategoryInput(selectedCategory?.name ?? "");
    }
  }, [selectedCategory?.name, isCategoryOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryWrapperRef.current &&
        !categoryWrapperRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = useMemo(() => {
    const query = categoryInput.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(query));
  }, [categories, categoryInput]);

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

            <div className="relative" ref={categoryWrapperRef}>
              <div
                className="flex items-center gap-2 p-2.5 min-h-11 border border-ap-border/60 rounded-xl bg-ap-field-background/30 focus-within:ring-2 focus-within:ring-ap-accent-soft focus-within:border-ap-accent transition-all shadow-sm cursor-pointer"
                onClick={() => setIsCategoryOpen(true)}
              >
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCategoryInput(next);
                    setIsCategoryOpen(true);

                    if (next.trim() === "") {
                      updateFormData({ categoryId: "" });
                    }
                  }}
                  onFocus={() => setIsCategoryOpen(true)}
                  placeholder={
                    isLoadingCategories
                      ? "Loading categories..."
                      : "Search or select category"
                  }
                  className="flex-1 bg-transparent text-[14px] text-ap-foreground placeholder:text-ap-muted/60 outline-none px-1"
                />
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-ap-muted transition-transform",
                    isCategoryOpen && "rotate-180",
                  )}
                />
              </div>

              {isCategoryOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-full rounded-xl border border-ap-border bg-ap-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                    {filteredCategories.length === 0 ? (
                      <p className="px-3 py-2 text-[13px] text-ap-muted">
                        No categories found.
                      </p>
                    ) : (
                      filteredCategories.map((category) => {
                        const isSelected = category.id === formData.categoryId;
                        const image = category.image || category.imageUrl;

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              updateFormData({ categoryId: category.id });
                              setCategoryInput(category.name);
                              setIsCategoryOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-[14px] transition-colors",
                              isSelected
                                ? "bg-ap-accent/10 text-ap-accent"
                                : "hover:bg-ap-field-background/50 text-ap-foreground",
                            )}
                          >
                            <span className="inline-flex items-center gap-2 min-w-0">
                              {image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt={category.name}
                                  className="w-5 h-5 rounded object-cover border border-ap-border/60 shrink-0"
                                />
                              ) : (
                                <span className="w-5 h-5 rounded border border-ap-border/60 grid place-content-center shrink-0 text-ap-muted">
                                  <ImageIcon size={12} />
                                </span>
                              )}
                              <span className="font-medium truncate">
                                {category.name}
                              </span>
                            </span>
                            {isSelected && <Check size={15} />}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-ap-border/50 bg-ap-field-background/30">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryOpen(false);
                        setCategoryDrawerInitialValues({
                          name: categoryInput.trim(),
                          slug: slugify(categoryInput),
                        });
                        setCategoryDrawerOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[14px] font-semibold text-ap-foreground hover:bg-ap-surface border border-transparent hover:border-ap-border/60 transition-colors"
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
          setCategoryInput(created.name);
        }}
      />
    </>
  );
}
