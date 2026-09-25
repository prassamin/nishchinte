"use client";

import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { Spinner } from "@heroui/react";

import { BasicInfoCard } from "./components/basic-info-card";
import { VariationsCard } from "./components/variations-card";
import { PricingCard } from "./components/pricing-card";
import { InventoryCard } from "./components/inventory-card";
import { CategoryTagsCard } from "./components/category-tags-card";
import Content from "../../../components/content";
import { useIsMobile } from "@nishchinte/hooks";
import { useProductForm } from "./hooks/use-product-form";
import { FloatingActionBar } from "../../../components/floating-action-bar";
import { MediaSelector } from "../../../components/media-selector";
import { debounce, markdownToPlain, slugify } from "@nishchinte/utils";
import { actions } from "@nishchinte/server/actions";
import { SeoSettingsCard } from "./components/seo-settings-card";

export default function NewProductView() {
  const {
    formData,
    updateFormData,
    categories,
    isLoadingCategories,
    isDirty,
    isEditMode,
    isSubmitting,
    isInitializing,
    editingProductId,
    submit,
    router,
  } = useProductForm();

  const isMobile = useIsMobile({ mobileBreakpoint: 1024 });

  const [isSlugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isSeoImageSelectorOpen, setSeoImageSelectorOpen] = useState(false);
  const [isSeoImageManuallyEdited, setSeoImageManuallyEdited] = useState(false);
  const [isSeoTitleManuallyEdited, setSeoTitleManuallyEdited] = useState(false);
  const [isSeoDescriptionManuallyEdited, setSeoDescriptionManuallyEdited] =
    useState(false);

  // If in edit mode and product has a slug initially, mark it as manually edited if desired
  useEffect(() => {
    if (isEditMode && formData.slug) {
      setSlugManuallyEdited(true);
    }
  }, [isEditMode, formData.slug]);

  const currentSlug = isSlugManuallyEdited
    ? formData.slug || ""
    : formData.slug || (formData.name ? slugify(formData.name) : "");

  const fullSlugPath = `products/${currentSlug || "enter-product-name"}`;

  const [slugAvailability, setSlugAvailability] = useState<{
    available: boolean;
    slug: string;
    suggestedSlug?: string;
  } | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  const checkSlugDebounced = useMemo(
    () =>
      debounce(async (slugToCheck: string, excludeId?: string) => {
        if (!slugToCheck || slugToCheck.trim().length === 0) {
          setSlugAvailability(null);
          setIsCheckingSlug(false);
          return null;
        }

        setIsCheckingSlug(true);
        try {
          const res = await actions.product.checkSlug(slugToCheck, excludeId);
          if (res.ok) {
            setSlugAvailability({
              available: res.available,
              slug: res.slug,
              suggestedSlug: res.suggestedSlug,
            });
          }
          return res;
        } finally {
          setIsCheckingSlug(false);
        }
      }, 300),
    [],
  );

  useEffect(() => {
    if (currentSlug && currentSlug.trim().length > 0) {
      setIsCheckingSlug(true);
      void checkSlugDebounced(
        currentSlug,
        isEditMode && editingProductId ? editingProductId : undefined,
      );
    } else {
      setSlugAvailability(null);
      setIsCheckingSlug(false);
    }
  }, [currentSlug, isEditMode, editingProductId, checkSlugDebounced]);

  const handleSlugChange = (raw: string) => {
    const sanitized = raw
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");
    setSlugManuallyEdited(true);
    updateFormData({
      ...formData,
      slug: sanitized,
    });
  };

  const handleResetSlug = () => {
    setSlugManuallyEdited(false);
    const autoSlug = slugify(formData.name);
    updateFormData({
      ...formData,
      slug: autoSlug,
    });
  };

  const seoTitle = isSeoTitleManuallyEdited ? formData.seoTitle : formData.name;
  const seoDescription = isSeoDescriptionManuallyEdited
    ? formData.seoDescription
    : markdownToPlain(formData.description);
  const seoImageUrl = isSeoImageManuallyEdited
    ? formData.seoImageUrl
    : formData.media?.[0]?.url || "";

  const handleSeoImageSelect = (files: { url: string; mimeType: string }[]) => {
    const next = files[0]?.url;
    if (!next) return;
    setSeoImageManuallyEdited(true);
    updateFormData({
      ...formData,
      seoImageUrl: next,
    });
  };

  if (isInitializing) {
    return (
      <Content className="grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-ap-accent" />
          <p className="text-sm text-ap-muted">Loading product details...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <form
        id="product-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="mx-auto space-y-6 pb-24"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/products"
              className="rounded-xl p-2 transition-colors hover:bg-ap-field-background"
            >
              <ArrowLeft size={20} className="text-ap-foreground" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-ap-foreground">
                {isEditMode ? "Edit Product" : "Add New Product"}
              </h1>
              <p className="text-sm text-ap-muted">
                {isEditMode
                  ? "Update product details, pricing, variants, and SEO"
                  : "Create a new product for your catalog"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <BasicInfoCard
              formData={formData}
              updateFormData={(updates) => {
                // If name changed and slug was not manually edited, keep slug in sync
                if (updates.name !== undefined && !isSlugManuallyEdited) {
                  updateFormData({
                    ...updates,
                    slug: slugify(updates.name),
                  });
                } else {
                  updateFormData(updates);
                }
              }}
            />

            {isMobile && (
              <PricingCard
                formData={formData}
                updateFormData={updateFormData}
              />
            )}

            {isMobile && (
              <CategoryTagsCard
                formData={formData}
                updateFormData={updateFormData}
                categories={categories}
                isLoadingCategories={isLoadingCategories}
              />
            )}

            <InventoryCard
              formData={formData}
              updateFormData={updateFormData}
            />
            <VariationsCard
              formData={formData}
              updateFormData={updateFormData}
            />
            <SeoSettingsCard
              slugPrefix="products/"
              slug={currentSlug}
              fullSlugPath={fullSlugPath}
              onSlugChange={handleSlugChange}
              onResetSlug={handleResetSlug}
              isSlugManuallyEdited={isSlugManuallyEdited}
              isCheckingSlug={isCheckingSlug}
              slugAvailability={slugAvailability}
              seoTitle={seoTitle}
              seoDescription={seoDescription}
              seoImageUrl={seoImageUrl}
              onSeoTitleChange={(title) => {
                setSeoTitleManuallyEdited(true);
                updateFormData({
                  ...formData,
                  seoTitle: title,
                });
              }}
              onSeoDescriptionChange={(description) => {
                setSeoDescriptionManuallyEdited(true);
                updateFormData({
                  ...formData,
                  seoDescription: description,
                });
              }}
              onSeoImageSelect={handleSeoImageSelect}
              onSeoImageSelectorOpen={() => setSeoImageSelectorOpen(true)}
              isSeoTitleManuallyEdited={isSeoTitleManuallyEdited}
              setSeoTitleManuallyEdited={setSeoTitleManuallyEdited}
              isSeoDescriptionManuallyEdited={isSeoDescriptionManuallyEdited}
              setSeoDescriptionManuallyEdited={setSeoDescriptionManuallyEdited}
              isSeoImageManuallyEdited={isSeoImageManuallyEdited}
              setSeoImageManuallyEdited={setSeoImageManuallyEdited}
            />
          </div>

          <aside className="hidden space-y-6 lg:block">
            {!isMobile && (
              <>
                <PricingCard
                  formData={formData}
                  updateFormData={updateFormData}
                />
                <CategoryTagsCard
                  formData={formData}
                  updateFormData={updateFormData}
                  categories={categories}
                  isLoadingCategories={isLoadingCategories}
                />
              </>
            )}
          </aside>
        </div>

        <FloatingActionBar
          isVisible={isDirty}
          title="Unsaved Changes"
          description="You have unsaved product changes"
          actions={[
            {
              id: "cancel",
              label: "Cancel",
              onClick: () => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/admin/products");
                }
              },
              variant: "secondary",
            },
            {
              id: "save",
              label: isEditMode ? "Save Changes" : "Create Product",
              onClick: () => {
                const form = document.getElementById(
                  "product-form",
                ) as HTMLFormElement | null;
                form?.requestSubmit();
              },
              type: "submit",
              form: "product-form",
              icon: <Save size={16} />,
              variant: "primary",
              isPending: isSubmitting,
              isDisabled:
                isSubmitting ||
                !formData.name ||
                !formData.price ||
                slugAvailability?.available === false,
            },
          ]}
        />

        <MediaSelector
          isOpen={isSeoImageSelectorOpen}
          onClose={() => setSeoImageSelectorOpen(false)}
          multiple={false}
          onSelect={handleSeoImageSelect}
          allowed={["image"]}
        />
      </form>
    </Content>
  );
}
