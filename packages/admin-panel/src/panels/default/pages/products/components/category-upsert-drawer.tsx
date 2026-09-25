"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Drawer,
  Spinner,
  toast,
  Select,
  ListBox,
  ListBoxItem,
  cn,
} from "@heroui/react";
import { FileText, FolderTree, Image as ImageIcon, Link2 } from "lucide-react";
import { MediaSelector } from "../../../components/media-selector";
import { CategoryParentSelect } from "../../../components/category-parent-select";
import MarkdownEditor from "../../../components/markdown-editor";
import { useIsMobile } from "@nishchinte/hooks";
import { actions } from "@nishchinte/server/actions";
import {
  getLeafSegment,
  slugify,
} from "@nishchinte/utils";

export type CategoryUpsertInput = {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
};

type CategoryUpsertDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  categoryId?: string;
  title?: string;
  submitLabel?: string;
  submittingLabel?: string;
  initialValues?: Partial<CategoryUpsertInput>;
  onSuccess?: (category: {
    id: string;
    name: string;
    slug: string;
    image?: string | null;
  }) => void;
};

function sanitizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "");
}

export function CategoryUpsertDrawer({
  isOpen,
  onOpenChange,
  mode = "create",
  categoryId,
  title = mode === "edit" ? "Update Category" : "Create Category",
  submitLabel = mode === "edit" ? "Save Changes" : "Create Category",
  submittingLabel = mode === "edit" ? "Saving..." : "Creating...",
  initialValues,
  onSuccess,
}: CategoryUpsertDrawerProps) {
  const queryClient = useQueryClient();
  const [isImageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [form, setForm] = useState<CategoryUpsertInput>({
    name: "",
    slug: "",
    description: "",
    imageUrl: "",
    parentId: "",
  });
  const isMobile = useIsMobile();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await actions.product.category.list();
      if (!res.ok) throw new Error(res.error || "Failed to fetch categories");
      return res.categories;
    },
    staleTime: 60 * 1000,
  });

  const selectedParent = useMemo(() => {
    if (!form.parentId) return null;
    return categories.find((c) => c.id === form.parentId) || null;
  }, [categories, form.parentId]);

  const leafSlug =
    (form.slug ? getLeafSegment(form.slug) : "").trim() ||
    slugify(form.name || "");
  const parentSlugPrefix = selectedParent?.slug ? `${selectedParent.slug}/` : "";
  const fullPreviewSlug = `${parentSlugPrefix}${leafSlug}`;
  const resolvedSlug = fullPreviewSlug;

  const upsertMutation = useMutation({
    mutationFn: async (payload: CategoryUpsertInput) => {
      if (mode === "edit") {
        if (!categoryId) throw new Error("Category ID is required for editing");
        const res = await actions.product.category.update(categoryId, {
          name: payload.name,
          slug: payload.slug,
          description: payload.description,
          imageUrl: payload.imageUrl,
          parentId: payload.parentId,
        });
        if (!res.ok) throw new Error(res.error || "Failed to update category");
        return res.category;
      }

      const res = await actions.product.category.create({
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        imageUrl: payload.imageUrl,
        parentId: payload.parentId,
      });
      if (!res.ok) throw new Error(res.error || "Failed to create category");
      return res.category;
    },
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-details"] });
      toast.success(
        mode === "edit"
          ? "Category updated successfully"
          : "Category created successfully",
      );
      onSuccess?.(category);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.danger(
        err?.message ||
          (mode === "edit"
            ? "Failed to update category"
            : "Failed to create category"),
      );
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    const name = initialValues?.name ?? "";
    const rawSlug = initialValues?.slug ?? "";
    const leafSlug = rawSlug
      ? getLeafSegment(rawSlug)
      : name
        ? slugify(name)
        : "";

    setForm({
      name,
      slug: leafSlug,
      description: initialValues?.description ?? "",
      imageUrl: initialValues?.imageUrl ?? "",
      parentId: initialValues?.parentId ?? "",
    });
    setIsSlugManuallyEdited(Boolean(initialValues?.slug));
  }, [initialValues, isOpen]);

  return (
    <>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
          <Drawer.Content placement={isMobile ? "bottom" : "right"}>
            <Drawer.Dialog className="w-[calc(100vw-20px)] max-w-xl rounded-2xl sm:w-[calc(100vw-24px)]">
              <Drawer.Header className="border-b border-ap-border/50 pb-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ap-accent/10 text-ap-accent">
                    <FolderTree size={16} />
                  </span>
                  <div>
                    <Drawer.Heading>{title}</Drawer.Heading>
                    <p className="mt-1 text-xs text-ap-muted">
                      Configure category details, slug, description and image.
                    </p>
                  </div>
                </div>
              </Drawer.Header>

              <Drawer.Body className="space-y-5 py-5">
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
                    excludeCategoryId={mode === "edit" ? categoryId : undefined}
                  />

                  <p className="mt-1 text-[12px] text-ap-muted">
                    Select a parent category to create a subcategory, or leave
                    as None for a top-level category.
                  </p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ap-foreground">
                    <FolderTree size={14} className="text-ap-muted" />
                    Category Name
                  </label>
                  <input
                    value={form.name ?? ""}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((p) => ({
                        ...p,
                        name,
                        slug: isSlugManuallyEdited ? p.slug : slugify(name),
                      }));
                    }}
                    placeholder="e.g. T-Shirts"
                    className="w-full rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ap-foreground">
                    <Link2 size={14} className="text-ap-muted" />
                    Slug (URL Segment)
                  </label>
                  <div className="overflow-hidden rounded-xl border border-ap-border bg-ap-field-background/30 shadow-sm transition-all focus-within:border-ap-accent focus-within:ring-2 focus-within:ring-ap-accent-soft">
                    <div className="flex items-center">
                      <span className="border-r border-ap-border bg-ap-surface/60 px-3 py-2 text-[12px] text-ap-muted whitespace-nowrap">
                        /categories/{parentSlugPrefix}
                      </span>
                      <input
                        value={form.slug ?? ""}
                        onChange={(e) => {
                          setIsSlugManuallyEdited(true);
                          setForm((p) => ({
                            ...p,
                            slug: sanitizeSlugInput(e.target.value),
                          }));
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData("text");
                          const sanitized = sanitizeSlugInput(pasted);

                          setIsSlugManuallyEdited(true);
                          setForm((p) => ({
                            ...p,
                            slug: sanitized,
                          }));
                        }}
                        inputMode="text"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="e.g. summer"
                        className="w-full bg-transparent px-3 py-2 text-[14px] text-ap-foreground outline-none placeholder:text-ap-muted/60"
                      />
                    </div>
                  </div>
                  {!!(form.name || form.slug || "").trim() && (
                    <p className="mt-1 text-[12px] text-ap-muted">
                      Full URL:{" "}
                      <span className="font-medium text-ap-foreground">
                        /categories/{fullPreviewSlug || "-"}
                      </span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ap-foreground">
                    <FileText size={14} className="text-ap-muted" />
                    Description
                  </label>
                  <MarkdownEditor
                    value={form.description ?? ""}
                    onChange={(value) =>
                      setForm((p) => ({
                        ...p,
                        description: value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ap-foreground">
                    <ImageIcon size={14} className="text-ap-muted" />
                    Category Image
                  </label>

                  {form.imageUrl ? (
                    <div className="rounded-xl border border-ap-border bg-ap-field-background p-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.imageUrl}
                          alt="Category preview"
                          className="h-16 w-16 rounded-lg border border-ap-border/60 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-ap-foreground">
                            Image selected from media library
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
                          onClick={() =>
                            setForm((p) => ({ ...p, imageUrl: "" }))
                          }
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
                      className="grid w-full place-items-center gap-1 rounded-xl border border-dashed border-ap-muted/60 px-3 py-6 text-[14px] text-ap-muted transition-colors hover:border-ap-accent hover:text-ap-foreground aspect-12/3"
                    >
                      <ImageIcon size={18} />
                      <span>Select image from media library</span>
                    </button>
                  )}
                </div>
              </Drawer.Body>

              <Drawer.Footer className="border-t border-ap-border/50 pt-4">
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="rounded-xl border border-ap-border px-4 py-2 text-ap-foreground transition-colors hover:bg-ap-field-background"
                  >
                    Cancel
                  </button>
                  <Button
                    type="button"
                    isDisabled={
                      upsertMutation.isPending || !(form.name || "").trim()
                    }
                    isPending={upsertMutation.isPending}
                    onClick={async () => {
                      const name = (form.name || "").trim();

                      const payload: CategoryUpsertInput = {
                        name,
                        description: form.description?.trim() || undefined,
                        imageUrl: form.imageUrl?.trim() || undefined,
                        parentId: form.parentId
                          ? form.parentId.trim()
                          : mode === "edit"
                            ? null
                            : undefined,
                      };

                      if (resolvedSlug) {
                        payload.slug = resolvedSlug;
                      }

                      await upsertMutation.mutateAsync(payload);
                    }}
                    className="rounded-xl w-full sm:w-auto bg-ap-accent px-4 py-2 text-ap-accent-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {upsertMutation.isPending ? (
                      <Spinner size="sm" color="current" />
                    ) : null}
                    {upsertMutation.isPending ? submittingLabel : submitLabel}
                  </Button>
                </div>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <MediaSelector
        isOpen={isImageSelectorOpen}
        onClose={() => setImageSelectorOpen(false)}
        multiple={false}
        onSelect={(files) => {
          const next = files[0]?.url;
          if (!next) return;
          setForm((p) => ({ ...p, imageUrl: next }));
        }}
      />
    </>
  );
}
