"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { ProductFormData } from "../types";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
} from "./use-product-mutations";
import { actions } from "@nishchinte/server/actions";
import type {
  CreateProductInput,
  UpdateProductInput,
  CategoryItem,
} from "@nishchinte/server/actions";

function cloneFormData(data: ProductFormData): ProductFormData {
  return JSON.parse(JSON.stringify(data)) as ProductFormData;
}

const initialFormData: ProductFormData = {
  name: "",
  price: "",
  costPrice: "",
  description: "",
  categoryId: "",
  tags: [],
  media: [],
  inStock: true,
  inventoryQuantity: -1,
  sku: "",
  barcode: "",
  slug: "",

  discountType: "NONE",
  discountValue: "",
  discountStartAt: "",
  discountEndAt: "",
  seoTitle: "",
  seoDescription: "",
  seoImageUrl: "",
  options: [],
  variants: [],
};

export function useProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingProductId = searchParams.get("edit");
  const isEditMode = Boolean(editingProductId);

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditInitialized, setIsEditInitialized] = useState(false);
  const [baseFormData, setBaseFormData] =
    useState<ProductFormData>(initialFormData);
  const [isUILoading, setIsUILoading] = useState(true);

  const updateFormData = (updates: Partial<ProductFormData>) => {
    setFormData((prev) => {
      const hasPriceInUpdate = Object.prototype.hasOwnProperty.call(
        updates,
        "price",
      );
      const hasCostPriceInUpdate = Object.prototype.hasOwnProperty.call(
        updates,
        "costPrice",
      );

      const nextPrice = updates.price ?? prev.price;
      const hasBasePrice = String(nextPrice ?? "").trim() !== "";
      const nextCostPrice = updates.costPrice ?? prev.costPrice;
      const hasBaseCostPrice = String(nextCostPrice ?? "").trim() !== "";

      const incomingVariants = updates.variants ?? prev.variants;
      const shouldSyncVariantPriceFromBase = hasPriceInUpdate && hasBasePrice;
      const shouldSyncVariantCostFromBase =
        hasCostPriceInUpdate && hasBaseCostPrice;

      const nextVariants = incomingVariants.map((v) => ({
        ...v,
        ...(shouldSyncVariantPriceFromBase ? { price: String(nextPrice) } : {}),
        ...(shouldSyncVariantCostFromBase
          ? { costPrice: String(nextCostPrice) }
          : {}),
      }));

      return {
        ...prev,
        ...updates,
        variants: nextVariants,
      };
    });
  };

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<
    CategoryItem[]
  >({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await actions.product.category.list();
      if (!res.ok) return [];
      return res.categories;
    },
    staleTime: 60 * 1000,
  });

  const { data: editingProduct, isLoading: isLoadingEditingProduct } = useQuery(
    {
      queryKey: ["admin-product", editingProductId],
      queryFn: async () => {
        if (!editingProductId) return null;
        const res = await actions.product.getById(editingProductId);
        return res.ok ? res.product : null;
      },
      enabled: !!editingProductId,
    },
  );

  useEffect(() => {
    if (!isEditMode || !editingProduct || isEditInitialized) return;

    const nextFormData: ProductFormData = {
      name: editingProduct.name || "",
      description: editingProduct.description || "",
      price: editingProduct.price != null ? String(editingProduct.price) : "",
      costPrice:
        editingProduct.costPrice != null
          ? String(editingProduct.costPrice)
          : "",
      categoryId: editingProduct.categoryId || "",
      tags: editingProduct.tags?.map((t) => t.name) || [],
      media: (editingProduct.media || []).map((m: any) => ({
        url: typeof m === "string" ? m : m.url,
        mimeType:
          typeof m === "string" ? "image/jpeg" : m.mimeType || "image/jpeg",
      })),
      inStock: Boolean(editingProduct.inStock),
      inventoryQuantity: editingProduct.inventoryQuantity ?? -1,
      sku: editingProduct.sku || "",
      barcode: editingProduct.barcode || "",
      slug: editingProduct.slug || editingProduct.seo?.slug || "",
      discountType: editingProduct.discountType || "NONE",
      discountValue:
        editingProduct.discountValue != null
          ? String(editingProduct.discountValue)
          : "",
      discountStartAt: editingProduct.discountStartAt
        ? new Date(editingProduct.discountStartAt).toISOString()
        : "",
      discountEndAt: editingProduct.discountEndAt
        ? new Date(editingProduct.discountEndAt).toISOString()
        : "",
      seoTitle: editingProduct.seo?.title || "",
      seoDescription: editingProduct.seo?.description || "",
      seoImageUrl:
        editingProduct.seo?.imageUrl || editingProduct.media?.[0]?.url || "",
      options:
        editingProduct.options?.map((opt) => ({
          id: opt.id,
          name: opt.name,
          values: opt.values?.map((v) => v.value) || [],
        })) || [],
      variants:
        editingProduct.variants?.map((v) => ({
          id: v.id,
          title: v.title || "",
          price: v.price != null ? String(v.price) : "",
          costPrice: v.costPrice != null ? String(v.costPrice) : "",
          inventoryQuantity: v.inventoryQuantity ?? -1,
          sku: v.sku || "",
          barcode: v.barcode || "",
          imageUrl: v.imageUrl || "",
          optionValues: v.optionValues || {},
        })) || [],
    };

    setFormData(cloneFormData(nextFormData));
    setBaseFormData(cloneFormData(nextFormData));
    setIsEditInitialized(true);
  }, [isEditMode, editingProduct, isEditInitialized]);

  useEffect(() => {
    setIsUILoading(false);
    if (!isEditMode) {
      setBaseFormData(cloneFormData(initialFormData));
    }
  }, [isEditMode]);

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(baseFormData),
    [formData, baseFormData],
  );

  const createMutation = useCreateProductMutation({
    onSuccess: () => {
      setBaseFormData(cloneFormData(formData));
      router.push("/admin/products");
    },
  });

  const updateMutation = useUpdateProductMutation({
    onSuccess: () => {
      setBaseFormData(cloneFormData(formData));
      router.push("/admin/products");
    },
  });

  const isInitializing =
    isUILoading ||
    (isEditMode && (isLoadingEditingProduct || !isEditInitialized));

  const submit = async () => {
    if (!formData.name || !formData.price) return;

    setIsSubmitting(true);

    const normalizedMedia = (formData.media || []).filter(
      (m) => typeof m?.url === "string" && m.url.trim().length > 0,
    );

    const hasVariants = (formData.variants || []).length > 0;
    const hasUnlimitedVariant = (formData.variants || []).some(
      (v) => v.inventoryQuantity === -1,
    );
    const totalVariantInventory = hasUnlimitedVariant
      ? -1
      : (formData.variants || []).reduce(
          (sum, v) => sum + Math.max(0, Number(v.inventoryQuantity) || 0),
          0,
        );

    const normalizedVariants = (formData.variants || []).map((variant) => {
      const cleanedImageUrl = variant.imageUrl?.trim();
      const varQty =
        variant.inventoryQuantity !== undefined &&
        variant.inventoryQuantity !== null &&
        (variant.inventoryQuantity as any) !== ""
          ? Number(variant.inventoryQuantity)
          : -1;

      return {
        id: variant.id,
        title: variant.title,
        price: variant.price ? Number(variant.price) : null,
        costPrice: variant.costPrice ? Number(variant.costPrice) : null,
        sku: variant.sku?.trim() || null,
        barcode: variant.barcode?.trim() || null,
        imageUrl: cleanedImageUrl ? cleanedImageUrl : null,
        inventoryQuantity: varQty,
        optionValues: variant.optionValues || {},
      };
    });

    const calculatedInventoryQuantity = hasVariants
      ? totalVariantInventory
      : formData.inventoryQuantity !== undefined &&
          formData.inventoryQuantity !== null &&
          (formData.inventoryQuantity as any) !== ""
        ? Number(formData.inventoryQuantity)
        : -1;

    const payload: CreateProductInput = {
      name: formData.name.trim(),
      slug: formData.slug?.trim() || undefined,
      description: formData.description || null,
      price: Number(formData.price),
      costPrice: formData.costPrice ? Number(formData.costPrice) : null,
      media: normalizedMedia.map((m) => ({
        url: m.url.trim(),
        mimeType: m.mimeType || "image/jpeg",
      })),
      inStock: formData.inStock,
      inventoryQuantity: calculatedInventoryQuantity,
      sku: formData.sku?.trim() || null,
      barcode: formData.barcode?.trim() || null,
      categoryId: formData.categoryId || null,
      tags: formData.tags || [],
      discountType: formData.discountType as any,
      discountValue: (() => {
        if (formData.discountType === "NONE" || !formData.discountValue) {
          return null;
        }
        const val = Number(formData.discountValue);
        if (isNaN(val) || val < 0) return null;
        if (
          (formData.discountType === "FLAT" ||
            formData.discountType === "LIMITED_TIME_FLAT") &&
          formData.price
        ) {
          return Math.min(Number(formData.price), val);
        }
        if (formData.discountType.includes("PERCENTAGE")) {
          return Math.min(100, val);
        }
        return val;
      })(),
      discountStartAt: formData.discountStartAt || null,
      discountEndAt: formData.discountEndAt || null,
      options: (formData.options || []).map((opt) => ({
        id: opt.id,
        name: opt.name,
        values: opt.values,
      })),
      variants: normalizedVariants,
      seoTitle: formData.seoTitle || formData.name || null,
      seoDescription: formData.seoDescription || formData.description || null,
      seoImageUrl:
        formData.seoImageUrl ||
        (normalizedMedia.length > 0 ? normalizedMedia[0].url : null),
    };

    try {
      if (isEditMode && editingProductId) {
        await updateMutation.mutateAsync({
          productId: editingProductId,
          data: payload as UpdateProductInput,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    updateFormData,
    categories,
    isLoadingCategories,
    tags: [] as { id: string; name: string }[],
    isLoadingTags: false,
    isDirty,
    isEditMode,
    isSubmitting,
    isInitializing,
    submit,
    editingProductId,
    router,
  };
}
