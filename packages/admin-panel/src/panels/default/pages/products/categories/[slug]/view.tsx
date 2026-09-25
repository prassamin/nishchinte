"use client";

import Link from "next/link";
import { ArrowLeft, FolderTree, CornerDownRight } from "lucide-react";
import { Spinner } from "@heroui/react";
import Content from "../../../../components/content";
import { MediaSelector } from "../../../../components/media-selector";
import { getLeafSegment } from "@nishchinte/utils";

import { useCategoryStore } from "./store";
import { useCategoryDetails } from "./use-category-details";

import { CategoryInfoCard } from "./components/category-info-card";
import { SeoSettingsCard } from "./components/seo-settings-card";
import { CategoryImageCard } from "./components/category-image-card";
import { LinkedProductsCard } from "./components/linked-products-card";
import { SubcategoriesCard } from "./components/subcategories-card";
import { LinkProductModal } from "./components/link-product-modal";
import { FloatingSaveBar } from "./components/floating-save-bar";

type Props = {
  slug: string;
};

export function CategoryDetailsView({ slug }: Props) {
  const { setForm, setImageSelectorOpen, setSeoImageSelectorOpen } =
    useCategoryStore();

  const {
    data,
    isPending,
    form,
    children = [],
    parent = null,
    isDirty,
    isLinkModalOpen,
    productSearch,
    isLinkingPending,
    isImageSelectorOpen,
    isSeoImageSelectorOpen,
    fullSlugPath,
    updateMutation,
    setLinkModalOpen,
    setProductSearch,
    handleSave,
    handleCancel,
    handleUnlink,
    handleLink,
    linkableProducts,
    isFetchingLinkables,
    linkablesError,
    isSeoImageManuallyEdited,
    setSeoImageManuallyEdited,
  } = useCategoryDetails(slug);

  const showInitialLoading = isPending && !data?.category;

  if (showInitialLoading) {
    return (
      <Content className="grid place-items-center">
        <Spinner className="text-ap-accent" />
      </Content>
    );
  }

  if (!data?.category) {
    return (
      <Content>
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-ap-border py-16">
          <FolderTree size={46} className="mb-4 text-ap-muted" />
          <p className="mb-2 font-semibold text-ap-foreground">
            Category not found
          </p>
          <p className="text-sm text-ap-muted">
            No category exists with slug &ldquo;{slug}&rdquo;.
          </p>
        </div>
      </Content>
    );
  }

  const products = data.products ?? [];

  return (
    <Content>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="mx-auto space-y-6 pb-24"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/products/categories"
              className="rounded-xl p-2 transition-colors hover:bg-ap-field-background"
            >
              <ArrowLeft size={20} className="text-ap-foreground" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-ap-foreground">
                  Edit Category
                </h1>
                {parent ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-ap-accent/10 px-2 py-0.5 text-xs font-medium text-ap-accent">
                    <CornerDownRight size={12} />
                    Subcategory
                  </span>
                ) : (
                  <span className="rounded-md bg-ap-field-background px-2 py-0.5 text-xs font-medium text-ap-muted">
                    Root Category
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ap-muted">
                {parent ? (
                  <>
                    <span>Parent:</span>
                    <Link
                      href={`/admin/products/categories/${parent.slug}`}
                      className="font-medium text-ap-accent hover:underline"
                    >
                      {parent.name}
                    </Link>
                    <span>•</span>
                  </>
                ) : null}
                <span>Details for {data.category.name}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <CategoryInfoCard categoryId={data.category.id} />
            <SeoSettingsCard
              parentSlug={parent?.slug || null}
              slugPrefix={
                parent?.slug ? `categories/${parent.slug}/` : "categories/"
              }
              fullSlugPath={
                parent?.slug
                  ? `/categories/${parent.slug}/${getLeafSegment(form.slug) || "{slug}"}`
                  : `/categories/${form.slug || "{slug}"}`
              }
            />
          </section>

          <aside className="space-y-6">
            <CategoryImageCard />
            <SubcategoriesCard
              categoryId={data.category.id}
              categoryName={data.category.name}
              subcategories={children}
            />
            <LinkedProductsCard
              products={products as any}
              onUnlink={handleUnlink}
              isLinkingPending={isLinkingPending}
            />
          </aside>
        </div>

        <FloatingSaveBar
          isDirty={isDirty}
          isPending={updateMutation.isPending}
          onCancel={handleCancel}
          onSave={handleSave}
          isValid={form.name.trim().length > 0}
        />
      </form>

      <MediaSelector
        isOpen={isImageSelectorOpen}
        onClose={() => setImageSelectorOpen(false)}
        multiple={false}
        allowed={["image"]}
        onSelect={(files) => {
          const next = files[0]?.url;
          if (!next) return;
          const { form } = useCategoryStore.getState();
          setForm({
            ...form,
            imageUrl: next,
            seoImageUrl: isSeoImageManuallyEdited ? form.seoImageUrl : next,
          });
        }}
      />
      <MediaSelector
        isOpen={isSeoImageSelectorOpen}
        onClose={() => setSeoImageSelectorOpen(false)}
        multiple={false}
        allowed={["image"]}
        onSelect={(files) => {
          const next = files[0]?.url;
          if (!next) return;
          const { form } = useCategoryStore.getState();
          setSeoImageManuallyEdited(true);
          setForm({ ...form, seoImageUrl: next });
        }}
      />

      <LinkProductModal
        isOpen={isLinkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        search={productSearch}
        onSearchChange={setProductSearch}
        onLink={handleLink}
        isLinkingPending={isLinkingPending}
        linkableProducts={linkableProducts}
        isFetching={isFetchingLinkables}
        errorMessage={linkablesError}
      />
    </Content>
  );
}
