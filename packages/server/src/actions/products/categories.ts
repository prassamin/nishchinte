"use server";

import { prisma, type Prisma } from "@nishchinte/db";
import { auth } from "@nishchinte/auth/server";
import {
  generateUniqueSlug,
  generateCategoryHierarchicalSlug,
  updateDescendantCategorySlugs,
  normalizeMedia,
} from "./utils";
import { safeRevalidate } from "../utils";
import { slugify } from "@nishchinte/utils";
import type { ProductItem, TransformedVariant } from "./products";

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  parentId?: string | null;
  isActive?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageUrl?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  parentId?: string | null;
  isActive?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageUrl?: string | null;
}

export interface ListCategoriesInput {
  search?: string;
  parentId?: string | null;
  isActive?: boolean;
  includeChildren?: boolean;
}

export interface CategorySeo {
  slug: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

export interface CategoryBase {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryParent =
  | { id: string; name: string; slug?: string }
  | (CategoryBase & { seo?: CategorySeo | null });

export type CategoryChild =
  | { id: string; name: string; slug?: string; sortOrder?: number }
  | (CategoryBase & { seo?: CategorySeo | null });

export type CategoryInclude = {
  parent?: boolean | Prisma.ProductCategory$parentArgs;
  children?: boolean | Prisma.ProductCategory$childrenArgs;
  products?: boolean | Prisma.ProductCategory$productsArgs;
  _count?: boolean | Prisma.ProductCategoryCountOutputTypeDefaultArgs;
  seo?: boolean;
};

export interface GetCategoryOptions<
  TInclude extends CategoryInclude = CategoryInclude,
> {
  include?: TInclude;
  locale?: string;
}

export type CategoryItem<T extends CategoryInclude = {}> = CategoryBase & {
  parent?: CategoryParent | null;
  children?: CategoryChild[];
  products?: ProductItem[];
  _count?: { products?: number; children?: number };
  seo?: CategorySeo | null;
} & (T extends { parent: true | object }
  ? { parent: (CategoryBase & { seo?: CategorySeo | null }) | null }
  : {}) &
  (T extends { children: true | object }
    ? { children: Array<CategoryBase & { seo?: CategorySeo | null }> }
    : {}) &
  (T extends { products: true | object } ? { products: ProductItem[] } : {}) &
  (T extends { _count: true | object }
    ? { _count: { products: number; children?: number } }
    : {}) &
  (T extends { seo: true } ? { seo: CategorySeo | null } : {});

/**
 * Server Action: Lists all product categories with optional search and hierarchy.
 */
export async function listCategoriesAction(
  input: ListCategoriesInput = {},
): Promise<
  { ok: true; categories: CategoryItem[] } | { ok: false; error: string }
> {
  try {
    const where: any = {};

    if (input.search?.trim()) {
      where.name = { contains: input.search.trim() };
    }

    if (input.parentId !== undefined) {
      where.parentId = input.parentId;
    }

    if (typeof input.isActive === "boolean") {
      where.isActive = input.isActive;
    }

    const categories = await prisma.productCategory.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: input.includeChildren
          ? {
              select: { id: true, name: true, sortOrder: true },
              orderBy: { sortOrder: "asc" },
            }
          : false,
        _count: {
          select: { products: true },
        },
      },
    });

    // Fetch SEO slugs for all categories
    const categoryIds = categories.map((c) => c.id);
    const seoEntries = await prisma.seoEntry.findMany({
      where: {
        entityType: "CATEGORY",
        entityId: { in: categoryIds },
        locale: "default",
      },
    });

    const seoMap = new Map<string, (typeof seoEntries)[0]>();
    seoEntries.forEach((entry) => seoMap.set(entry.entityId, entry));

    const formatted: CategoryItem[] = categories.map((c) => {
      const seo = seoMap.get(c.id);
      return {
        id: c.id,
        parentId: c.parentId,
        name: c.name,
        slug: seo?.slug || slugify(c.name),
        description: c.description,
        imageUrl: c.imageUrl,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        parent: c.parent,
        children: c.children,
        _count: c._count,
        seo: seo
          ? {
              slug: seo.slug,
              title: seo.title,
              description: seo.description,
              imageUrl: seo.imageUrl,
            }
          : null,
      };
    });

    return { ok: true, categories: formatted };
  } catch (error: any) {
    console.error("listCategoriesAction error:", error);
    return { ok: false, error: error.message || "Failed to list categories" };
  }
}

/**
 * Server Action: Gets a single category by its ID with SEO metadata and optional Prisma-style includes (e.g., products, parent, children).
 */
export async function getCategoryByIdAction<T extends CategoryInclude = {}>(
  id: string,
  options?: GetCategoryOptions<T>,
): Promise<
  { ok: true; category: CategoryItem<T> } | { ok: false; error: string }
> {
  try {
    const locale = options?.locale || "default";

    // Build Prisma include based on caller's options.
    // If no options or include provided, use sensible default relations.
    let prismaInclude: Prisma.ProductCategoryInclude | undefined = undefined;

    if (options?.include) {
      const inc = options.include;
      const builtInclude: Prisma.ProductCategoryInclude = {};

      if (inc.parent) {
        builtInclude.parent = typeof inc.parent === "object" ? inc.parent : true;
      }

      if (inc.children) {
        builtInclude.children =
          typeof inc.children === "object"
            ? inc.children
            : { orderBy: { sortOrder: "asc" } };
      }

      if (inc._count) {
        builtInclude._count =
          typeof inc._count === "object"
            ? inc._count
            : { select: { products: true, children: true } };
      }

      if (inc.products) {
        if (typeof inc.products === "object") {
          const customArgs = inc.products;
          builtInclude.products = {
            ...customArgs,
            include: customArgs.include ?? {
              options: {
                include: {
                  values: {
                    orderBy: { position: "asc" },
                  },
                },
                orderBy: { position: "asc" },
              },
              variants: {
                include: {
                  optionValues: {
                    include: {
                      optionValue: {
                        include: {
                          option: true,
                        },
                      },
                    },
                  },
                },
              },
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          };
        } else {
          builtInclude.products = {
            orderBy: { createdAt: "desc" },
            include: {
              options: {
                include: {
                  values: {
                    orderBy: { position: "asc" },
                  },
                },
                orderBy: { position: "asc" },
              },
              variants: {
                include: {
                  optionValues: {
                    include: {
                      optionValue: {
                        include: {
                          option: true,
                        },
                      },
                    },
                  },
                },
              },
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          };
        }
      }

      if (Object.keys(builtInclude).length > 0) {
        prismaInclude = builtInclude;
      }
    } else {
      // Default relations when no include option is explicitly provided
      prismaInclude = {
        parent: true,
        children: { orderBy: { sortOrder: "asc" } },
        _count: { select: { products: true } },
      };
    }

    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: prismaInclude,
    });

    if (!category) {
      return { ok: false, error: "Category not found" };
    }

    // Determine which SEO entries to query
    const shouldFetchSeo =
      options?.include ? options.include.seo !== false : true;

    // Collect entity IDs for batch SEO resolution
    const categoryIdsToFetch: string[] = [id];
    if ((category as any).parent?.id) {
      categoryIdsToFetch.push((category as any).parent.id);
    }
    if (Array.isArray((category as any).children)) {
      (category as any).children.forEach((c: any) => {
        if (c.id) categoryIdsToFetch.push(c.id);
      });
    }

    const productIdsToFetch: string[] = [];
    if (Array.isArray((category as any).products)) {
      (category as any).products.forEach((p: any) => {
        if (p.id) productIdsToFetch.push(p.id);
      });
    }

    const [categorySeoEntries, productSeoEntries] = await Promise.all([
      shouldFetchSeo && categoryIdsToFetch.length > 0
        ? prisma.seoEntry.findMany({
            where: {
              entityType: "CATEGORY",
              entityId: { in: categoryIdsToFetch },
              locale,
            },
          })
        : Promise.resolve([]),
      shouldFetchSeo && productIdsToFetch.length > 0
        ? prisma.seoEntry.findMany({
            where: {
              entityType: "PRODUCT",
              entityId: { in: productIdsToFetch },
              locale,
            },
          })
        : Promise.resolve([]),
    ]);

    const catSeoMap = new Map<string, (typeof categorySeoEntries)[0]>();
    categorySeoEntries.forEach((s) => catSeoMap.set(s.entityId, s));

    const prodSeoMap = new Map<string, (typeof productSeoEntries)[0]>();
    productSeoEntries.forEach((s) => prodSeoMap.set(s.entityId, s));

    const mainSeo = catSeoMap.get(id);
    const categorySlug = mainSeo?.slug || slugify(category.name);

    // Format parent if present
    let parent:
      | (CategoryBase & { seo?: CategorySeo | null })
      | null
      | undefined = undefined;
    if ("parent" in category) {
      if ((category as any).parent) {
        const p = (category as any).parent;
        const pSeo = catSeoMap.get(p.id);
        parent = {
          id: p.id,
          parentId: p.parentId ?? null,
          name: p.name,
          slug: pSeo?.slug || slugify(p.name),
          description: p.description ?? null,
          imageUrl: p.imageUrl ?? null,
          sortOrder: p.sortOrder ?? 0,
          isActive: p.isActive ?? true,
          createdAt: p.createdAt ?? new Date(),
          updatedAt: p.updatedAt ?? new Date(),
          seo: pSeo
            ? {
                slug: pSeo.slug,
                title: pSeo.title,
                description: pSeo.description,
                imageUrl: pSeo.imageUrl,
              }
            : null,
        };
      } else {
        parent = null;
      }
    }

    // Format children if present
    let children:
      | Array<CategoryBase & { seo?: CategorySeo | null }>
      | undefined = undefined;
    if ("children" in category && Array.isArray((category as any).children)) {
      children = (category as any).children.map((c: any) => {
        const cSeo = catSeoMap.get(c.id);
        return {
          id: c.id,
          parentId: c.parentId ?? category.id,
          name: c.name,
          slug: cSeo?.slug || slugify(c.name),
          description: c.description ?? null,
          imageUrl: c.imageUrl ?? null,
          sortOrder: c.sortOrder ?? 0,
          isActive: c.isActive ?? true,
          createdAt: c.createdAt ?? new Date(),
          updatedAt: c.updatedAt ?? new Date(),
          seo: cSeo
            ? {
                slug: cSeo.slug,
                title: cSeo.title,
                description: cSeo.description,
                imageUrl: cSeo.imageUrl,
              }
            : null,
        };
      });
    }

    // Format products if present
    let products: ProductItem[] | undefined = undefined;
    if ("products" in category && Array.isArray((category as any).products)) {
      products = (category as any).products.map((p: any) => {
        const pSeo = prodSeoMap.get(p.id);

        const transformedVariants: TransformedVariant[] = Array.isArray(
          p.variants,
        )
          ? p.variants.map((v: any) => {
              const optionValuesMap: Record<string, string> = {};
              if (Array.isArray(v.optionValues)) {
                v.optionValues.forEach((vov: any) => {
                  if (vov.optionValue?.option?.name) {
                    optionValuesMap[vov.optionValue.option.name] =
                      vov.optionValue.value;
                  }
                });
              }

              return {
                id: v.id,
                productId: v.productId,
                title: v.title,
                price: v.price ? Number(v.price) : null,
                costPrice: v.costPrice ? Number(v.costPrice) : null,
                sku: v.sku,
                barcode: v.barcode,
                imageUrl: v.imageUrl,
                inventoryQuantity: v.inventoryQuantity,
                isActive: v.isActive,
                createdAt: v.createdAt,
                updatedAt: v.updatedAt,
                optionValues: optionValuesMap,
              };
            })
          : [];

        return {
          id: p.id,
          categoryId: p.categoryId,
          name: p.name,
          slug: pSeo?.slug || slugify(p.name),
          description: p.description,
          price: Number(p.price),
          costPrice: p.costPrice ? Number(p.costPrice) : null,
          sku: p.sku,
          barcode: p.barcode,
          media: normalizeMedia(p.media),
          inStock: p.inStock,
          inventoryQuantity: p.inventoryQuantity,
          discountType: p.discountType,
          discountValue: p.discountValue ? Number(p.discountValue) : null,
          discountStartAt: p.discountStartAt,
          discountEndAt: p.discountEndAt,
          isActive: p.isActive,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          category: {
            id: category.id,
            name: category.name,
            slug: categorySlug,
          },
          options: p.options,
          variants: transformedVariants,
          tags: Array.isArray(p.tags)
            ? p.tags.map((t: any) => ({ id: t.tag.id, name: t.tag.name }))
            : [],
          seo: pSeo
            ? {
                slug: pSeo.slug,
                title: pSeo.title,
                description: pSeo.description,
                imageUrl: pSeo.imageUrl,
              }
            : null,
        };
      });
    }

    const formattedCategory: CategoryItem<T> = {
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      slug: categorySlug,
      description: category.description,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      ...("parent" in category ? { parent } : {}),
      ...("children" in category ? { children } : {}),
      ...("products" in category ? { products } : {}),
      ...("_count" in category ? { _count: (category as any)._count } : {}),
      seo: mainSeo
        ? {
            slug: mainSeo.slug,
            title: mainSeo.title,
            description: mainSeo.description,
            imageUrl: mainSeo.imageUrl,
          }
        : null,
    } as CategoryItem<T>;

    return {
      ok: true,
      category: formattedCategory,
    };
  } catch (error: any) {
    console.error("getCategoryByIdAction error:", error);
    return { ok: false, error: error.message || "Failed to get category" };
  }
}

/**
 * Server Action: Gets a single category by its SEO slug with optional Prisma-style includes.
 */
export async function getCategoryBySlugAction<T extends CategoryInclude = {}>(
  slug: string,
  options?: GetCategoryOptions<T>,
): Promise<
  { ok: true; category: CategoryItem<T> } | { ok: false; error: string }
> {
  try {
    const locale = options?.locale || "default";

    const seo = await prisma.seoEntry.findFirst({
      where: {
        entityType: "CATEGORY",
        slug,
        locale,
      },
    });

    if (!seo) {
      return { ok: false, error: "Category not found" };
    }

    return getCategoryByIdAction<T>(seo.entityId, options);
  } catch (error: any) {
    console.error("getCategoryBySlugAction error:", error);
    return {
      ok: false,
      error: error.message || "Failed to get category by slug",
    };
  }
}

/**
 * Server Action: Creates a new category and its corresponding SEO entry.
 */
export async function createCategoryAction(
  input: CreateCategoryInput,
): Promise<
  { ok: true; category: CategoryItem } | { ok: false; error: string }
> {
  try {
    await auth.admin.requireUser();

    if (!input.name?.trim()) {
      return { ok: false, error: "Category name is required" };
    }

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.productCategory.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          imageUrl: input.imageUrl?.trim() || null,
          sortOrder: input.sortOrder ?? 0,
          parentId: input.parentId || null,
          isActive: input.isActive ?? true,
        },
      });

      const uniqueSlug = await generateCategoryHierarchicalSlug(
        tx,
        input.slug || input.name,
        input.parentId,
        created.id,
      );

      const seo = await tx.seoEntry.create({
        data: {
          entityType: "CATEGORY",
          entityId: created.id,
          locale: "default",
          slug: uniqueSlug,
          title: input.seoTitle?.trim() || null,
          description: input.seoDescription?.trim() || null,
          imageUrl: input.seoImageUrl?.trim() || input.imageUrl?.trim() || null,
        },
      });

      return {
        ...created,
        slug: uniqueSlug,
        seo: {
          slug: uniqueSlug,
          title: seo.title,
          description: seo.description,
          imageUrl: seo.imageUrl,
        },
      };
    });

    await safeRevalidate("/admin/products/categories");
    await safeRevalidate("/categories");

    return { ok: true, category };
  } catch (error: any) {
    console.error("createCategoryAction error:", error);
    return { ok: false, error: error.message || "Failed to create category" };
  }
}

/**
 * Server Action: Updates an existing category and its SEO metadata.
 */
export async function updateCategoryAction(
  id: string,
  input: UpdateCategoryInput,
): Promise<
  { ok: true; category: CategoryItem } | { ok: false; error: string }
> {
  try {
    await auth.admin.requireUser();

    const existing = await prisma.productCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      return { ok: false, error: "Category not found" };
    }

    // Prevent circular parent reference
    if (input.parentId === id) {
      return { ok: false, error: "A category cannot be its own parent" };
    }

    const category = await prisma.$transaction(async (tx) => {
      const updated = await tx.productCategory.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          ...(input.imageUrl !== undefined
            ? { imageUrl: input.imageUrl?.trim() || null }
            : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          ...(input.parentId !== undefined
            ? { parentId: input.parentId || null }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });

      const existingSeo = await tx.seoEntry.findFirst({
        where: { entityType: "CATEGORY", entityId: id, locale: "default" },
      });

      const nextParentId =
        input.parentId !== undefined
          ? input.parentId || null
          : existing.parentId;

      const shouldRecalculateSlug =
        input.slug !== undefined ||
        input.name !== undefined ||
        input.parentId !== undefined;

      let uniqueSlug: string | undefined;
      if (shouldRecalculateSlug) {
        const baseSlugText =
          input.slug || input.name || existingSeo?.slug || existing.name;
        uniqueSlug = await generateCategoryHierarchicalSlug(
          tx,
          baseSlugText,
          nextParentId,
          id,
        );
      }

      const seoData: any = {};
      if (uniqueSlug) seoData.slug = uniqueSlug;
      if (input.seoTitle !== undefined)
        seoData.title = input.seoTitle?.trim() || null;
      if (input.seoDescription !== undefined)
        seoData.description = input.seoDescription?.trim() || null;
      if (input.seoImageUrl !== undefined)
        seoData.imageUrl = input.seoImageUrl?.trim() || null;

      let seo: any = null;
      if (Object.keys(seoData).length > 0) {
        seo = await tx.seoEntry.upsert({
          where: {
            entityType_entityId_locale: {
              entityType: "CATEGORY",
              entityId: id,
              locale: "default",
            },
          },
          create: {
            entityType: "CATEGORY",
            entityId: id,
            locale: "default",
            slug: uniqueSlug || slugify(updated.name),
            ...seoData,
          },
          update: seoData,
        });
      } else {
        seo = existingSeo;
      }

      // Cascade slug updates to any descendants if the slug changed
      if (existingSeo?.slug && uniqueSlug && existingSeo.slug !== uniqueSlug) {
        await updateDescendantCategorySlugs(
          tx,
          existingSeo.slug,
          uniqueSlug,
          "default",
        );
      }

      return {
        ...updated,
        slug: seo?.slug || slugify(updated.name),
        seo: seo
          ? {
              slug: seo.slug,
              title: seo.title,
              description: seo.description,
              imageUrl: seo.imageUrl,
            }
          : null,
      };
    });

    await safeRevalidate("/admin/products/categories");
    await safeRevalidate("/categories");

    return { ok: true, category };
  } catch (error: any) {
    console.error("updateCategoryAction error:", error);
    return { ok: false, error: error.message || "Failed to update category" };
  }
}

/**
 * Server Action: Deletes a category and its associated SEO entry.
 */
export async function deleteCategoryAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!category) {
      return { ok: false, error: "Category not found" };
    }

    await prisma.$transaction(async (tx) => {
      // Get category SEO slug
      const seo = await tx.seoEntry.findFirst({
        where: { entityType: "CATEGORY", entityId: id, locale: "default" },
      });

      const nextParentId = category.parentId || null;

      // If category has children, re-parent them to the closest parent and update hierarchical slugs
      if (category.children.length > 0) {
        for (const child of category.children) {
          // 1. Re-parent child to closest parent (or root if category was top-level)
          await tx.productCategory.update({
            where: { id: child.id },
            data: { parentId: nextParentId },
          });

          const childSeo = await tx.seoEntry.findFirst({
            where: {
              entityType: "CATEGORY",
              entityId: child.id,
              locale: "default",
            },
          });

          const oldChildSlug = childSeo?.slug || child.name;
          const newChildSlug = await generateCategoryHierarchicalSlug(
            tx,
            child.name,
            nextParentId,
            child.id,
          );

          if (childSeo) {
            await tx.seoEntry.update({
              where: { id: childSeo.id },
              data: { slug: newChildSlug },
            });
          } else {
            await tx.seoEntry.create({
              data: {
                entityType: "CATEGORY",
                entityId: child.id,
                locale: "default",
                slug: newChildSlug,
              },
            });
          }

          if (oldChildSlug && oldChildSlug !== newChildSlug) {
            await updateDescendantCategorySlugs(
              tx,
              oldChildSlug,
              newChildSlug,
              "default",
            );
          }
        }
      }

      // Delete polymorphic SEO entry for this category
      await tx.seoEntry.deleteMany({
        where: { entityType: "CATEGORY", entityId: id },
      });

      // Delete the category
      await tx.productCategory.delete({
        where: { id },
      });
    });

    await safeRevalidate("/admin/products/categories");
    await safeRevalidate("/categories");

    return { ok: true };
  } catch (error: any) {
    console.error("deleteCategoryAction error:", error);
    return { ok: false, error: error.message || "Failed to delete category" };
  }
}
