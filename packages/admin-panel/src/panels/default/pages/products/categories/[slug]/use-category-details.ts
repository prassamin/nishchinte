import { useEffect, useTransition } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@bprogress/next";
import { toast } from "@heroui/react";
import { useDebounce } from "@nishchinte/hooks";
import { useCategoryStore } from "./store";
import actions from "@nishchinte/server/actions";
import { markdownToPlain, truncateText } from "@nishchinte/utils";

export function useCategoryDetails(categorySlug: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    form,
    baseForm,
    isInitialized,
    isSeoImageManuallyEdited,
    isLinkModalOpen,
    productSearch,
    linkablesError,
    isImageSelectorOpen,
    isSeoImageSelectorOpen,
    setForm,
    setBaseForm,
    setInitialized,
    setSeoTitleManuallyEdited,
    setSeoDescriptionManuallyEdited,
    setSeoImageManuallyEdited,
    setLinkModalOpen,
    setProductSearch,
    setLinkablesError,
    setImageSelectorOpen,
    setSeoImageSelectorOpen,
  } = useCategoryStore();

  const [isLinkingPending, startLinkingTransition] = useTransition();
  const debouncedSearch = useDebounce(productSearch.trim(), 350);

  const fullSlugPath = `/categories/${form.slug || "{slug}"}`;

  const { data, isPending, isFetching } = useQuery({
    queryKey: ["category-details", categorySlug],
    queryFn: async () => {
      const res = await actions.product.category.getBySlug(categorySlug, {
        include: {
          products: true,
          parent: true,
          children: true,
        },
      });
      if (!res.ok) {
        return {
          category: null,
          products: [],
          children: [],
          parent: null,
        };
      }

      return {
        category: {
          id: res.category.id,
          name: res.category.name,
          slug: res.category.slug,
          description: res.category.description || undefined,
          imageUrl: res.category.imageUrl || undefined,
          seoTitle: res.category.seo?.title || undefined,
          seoDescription: res.category.seo?.description || undefined,
          seoImageUrl: res.category.seo?.imageUrl || undefined,
          parentId: res.category.parentId || undefined,
          isActive: res.category.isActive,
          createdAt: res.category.createdAt?.toISOString(),
          updatedAt: res.category.updatedAt?.toISOString(),
          parent: res.category.parent ?? null,
          children: res.category.children ?? [],
        },
        products: res.category.products ?? [],
        children: res.category.children ?? [],
        parent: res.category.parent ?? null,
      };
    },
    staleTime: 30_000,
  });

  const category = data?.category ?? null;
  const products = data?.products ?? [];

  const {
    data: linkableData,
    isFetching: isFetchingLinkables,
    isError: isLinkablesError,
    error: linkablesErrorObj,
  } = useQuery({
    queryKey: [
      "category-linkables",
      category?.id,
      debouncedSearch.toLowerCase(),
    ],
    queryFn: async () => {
      if (!category?.id) return [];

      const res = await actions.product.list({
        search: debouncedSearch || undefined,
        limit: 500,
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to load products");
      }

      return res.products.filter(
        (product) => product.categoryId !== category.id,
      );
    },
    enabled: !!category?.id && isLinkModalOpen,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!isLinkModalOpen) {
      setLinkablesError(null);
      return;
    }

    if (isLinkablesError) {
      setLinkablesError(
        (linkablesErrorObj as Error | undefined)?.message ||
          "Failed to load products",
      );
      return;
    }

    if (linkableData) {
      setLinkablesError(null);
    }
  }, [
    isLinkModalOpen,
    isLinkablesError,
    linkableData,
    linkablesErrorObj,
    setLinkablesError,
  ]);

  useEffect(() => {
    if (!category) return;

    const inheritedMainImage = category.imageUrl || "";

    setForm({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      imageUrl: inheritedMainImage,
      seoTitle:
        category.seoTitle ||
        truncateText(markdownToPlain(category.name || ""), 70),
      seoDescription:
        category.seoDescription ||
        truncateText(markdownToPlain(category.description || ""), 320),
      seoImageUrl: category.seoImageUrl || inheritedMainImage,
      parentId: category.parentId || "",
    });

    setBaseForm({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      imageUrl: inheritedMainImage,
      seoTitle:
        category.seoTitle ||
        truncateText(markdownToPlain(category.name || ""), 70),
      seoDescription:
        category.seoDescription ||
        truncateText(markdownToPlain(category.description || ""), 320),
      seoImageUrl: category.seoImageUrl || inheritedMainImage,
      parentId: category.parentId || "",
    });

    setSeoTitleManuallyEdited(Boolean(category.seoTitle));
    setSeoDescriptionManuallyEdited(Boolean(category.seoDescription));
    setSeoImageManuallyEdited(Boolean(category.seoImageUrl));
    setInitialized(true);
  }, [
    category?.id,
    setForm,
    setBaseForm,
    setSeoTitleManuallyEdited,
    setSeoDescriptionManuallyEdited,
    setSeoImageManuallyEdited,
    setInitialized,
  ]);

  const updateMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      if (!category?.id) {
        throw new Error("Category not found");
      }

      const res = await actions.product.category.update(category.id, {
        name: payload.name.trim(),
        slug: payload.slug.trim() || undefined,
        description: payload.description.trim() || undefined,
        imageUrl: payload.imageUrl.trim() || undefined,
        parentId: payload.parentId.trim() ? payload.parentId.trim() : null,
        seoTitle: payload.seoTitle.trim() || undefined,
        seoDescription: payload.seoDescription.trim() || undefined,
        seoImageUrl: payload.seoImageUrl.trim() || undefined,
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to update category");
      }

      return res.category;
    },
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({
        queryKey: ["category-details", categorySlug],
      });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setBaseForm(form);
      toast.success("Category updated successfully");

      if (updatedCategory?.slug && updatedCategory.slug !== categorySlug) {
        router.replace(`/admin/products/categories/${updatedCategory.slug}`);
      }
    },
    onError: (err: any) => {
      toast.danger(err?.message || "Failed to update category");
    },
  });

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["category-details", categorySlug],
      }),
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({
        queryKey: ["category-linkables", category?.id],
      }),
    ]);
  };

  const handleUnlink = (productId: string) => {
    if (!category?.id) return;

    startLinkingTransition(async () => {
      const res = await actions.product.update(productId, {
        categoryId: null,
      });

      if (!res.ok) {
        toast.danger(res.error || "Failed to unlink product");
        return;
      }

      await refreshQueries();
      toast.success("Product removed from category");
    });
  };

  const handleLink = (productId: string) => {
    if (!category?.id) return;

    startLinkingTransition(async () => {
      const res = await actions.product.update(productId, {
        categoryId: category.id,
      });

      if (!res.ok) {
        toast.danger(res.error || "Failed to link product");
        return;
      }

      await refreshQueries();
      toast.success("Product linked to category");
    });
  };

  const handleSave = () => updateMutation.mutate(form);

  const handleCancel = () => {
    setForm(baseForm);
    setSeoTitleManuallyEdited(Boolean(category?.seoTitle));
    setSeoDescriptionManuallyEdited(Boolean(category?.seoDescription));
    setSeoImageManuallyEdited(Boolean(category?.seoImageUrl));
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(baseForm);

  return {
    data,
    category,
    products,
    children: (data?.children as any[]) ?? [],
    parent: (data?.parent as any) ?? null,
    linkableProducts: linkableData ?? [],
    form,
    isDirty,
    isPending,
    isFetching,
    isFetchingLinkables,
    isLinkingPending,
    isLinkModalOpen,
    productSearch,
    linkablesError,
    isImageSelectorOpen,
    isSeoImageSelectorOpen,
    fullSlugPath,
    updateMutation,
    setForm,
    setLinkModalOpen,
    setProductSearch,
    setImageSelectorOpen,
    setSeoImageSelectorOpen,
    setSeoImageManuallyEdited,
    isSeoImageManuallyEdited,
    handleSave,
    handleCancel,
    handleUnlink,
    handleLink,
  };
}
