"use server";

import { prisma, type DiscountType } from "@nishchinte/db";
import { auth } from "@nishchinte/auth/server";
import {
  safeRevalidate,
} from "../utils";
import { slugify } from "@nishchinte/utils";
import { generateUniqueSlug, normalizeMedia, ProductMediaItem } from "./utils";

export interface ProductOptionValueInput {
  id?: string;
  value: string;
  position?: number;
}

export interface ProductOptionInput {
  id?: string;
  name: string;
  position?: number;
  values: Array<string | ProductOptionValueInput>;
}

export interface ProductVariantInput {
  id?: string;
  title: string;
  price?: number | string | null;
  costPrice?: number | string | null;
  sku?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
  inventoryQuantity?: number;
  isActive?: boolean;
  optionValues?: Record<string, string>; // { "Color": "Red", "Size": "XL" }
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  description?: string | null;
  price: number | string;
  costPrice?: number | string | null;
  sku?: string | null;
  barcode?: string | null;
  media?: Array<string | { url: string; mimeType?: string }> | null;
  inStock?: boolean;
  inventoryQuantity?: number;
  discountType?:
    | DiscountType
    | "NONE"
    | "PERCENTAGE"
    | "FLAT"
    | "LIMITED_TIME_PERCENTAGE"
    | "LIMITED_TIME_FLAT";
  discountValue?: number | string | null;
  discountStartAt?: string | Date | null;
  discountEndAt?: string | Date | null;
  isActive?: boolean;
  categoryId?: string | null;
  tags?: string[]; // Tag names or tag IDs
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageUrl?: string | null;
  options?: ProductOptionInput[];
  variants?: ProductVariantInput[];
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number | string;
  costPrice?: number | string | null;
  sku?: string | null;
  barcode?: string | null;
  media?: Array<string | { url: string; mimeType?: string }> | null;
  inStock?: boolean;
  inventoryQuantity?: number;
  discountType?:
    | DiscountType
    | "NONE"
    | "PERCENTAGE"
    | "FLAT"
    | "LIMITED_TIME_PERCENTAGE"
    | "LIMITED_TIME_FLAT";
  discountValue?: number | string | null;
  discountStartAt?: string | Date | null;
  discountEndAt?: string | Date | null;
  isActive?: boolean;
  categoryId?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageUrl?: string | null;
  options?: ProductOptionInput[];
  variants?: ProductVariantInput[];
}

export type ProductSortKey =
  | "name"
  | "price"
  | "createdAt"
  | "inventoryQuantity";
export type ProductSortDirection = "asc" | "desc";

export interface ListProductsInput {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  inStock?: boolean;
  isActive?: boolean;
  tagId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortKey?: ProductSortKey;
  sortDirection?: ProductSortDirection;
}

export interface TransformedVariant {
  id: string;
  productId: string;
  title: string;
  price: number | null;
  costPrice: number | null;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  inventoryQuantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  optionValues: Record<string, string>; // Map of optionName -> value
}

export interface ProductItem {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  costPrice: number | null;
  sku: string | null;
  barcode: string | null;
  media: ProductMediaItem[];
  inStock: boolean;
  inventoryQuantity: number;
  discountType: DiscountType;
  discountValue: number | null;
  discountStartAt: Date | null;
  discountEndAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  options?: Array<{
    id: string;
    name: string;
    position: number;
    values: Array<{
      id: string;
      value: string;
      position: number;
    }>;
  }>;
  variants?: TransformedVariant[];
  tags?: Array<{
    id: string;
    name: string;
  }>;
  seo?: {
    slug: string;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
  } | null;
}

export interface ListProductsResult {
  ok: true;
  products: ProductItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Server Action: Lists products with filtering, search, sorting, and pagination.
 */
export async function listProductsAction(
  input: ListProductsInput = {},
): Promise<ListProductsResult | { ok: false; error: string }> {
  try {
    const page = Math.max(1, input.page || 1);
    const limit = Math.max(1, Math.min(100, input.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (input.search?.trim()) {
      const q = input.search.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
      ];
    }

    if (input.categoryId) {
      where.categoryId = input.categoryId;
    }

    if (typeof input.inStock === "boolean") {
      where.inStock = input.inStock;
    }

    if (typeof input.isActive === "boolean") {
      where.isActive = input.isActive;
    }

    if (input.tagId) {
      where.tags = {
        some: {
          tagId: input.tagId,
        },
      };
    }

    if (input.minPrice !== undefined || input.maxPrice !== undefined) {
      where.price = {};
      if (input.minPrice !== undefined) where.price.gte = input.minPrice;
      if (input.maxPrice !== undefined) where.price.lte = input.maxPrice;
    }

    const sortKey = input.sortKey || "createdAt";
    const sortDirection = input.sortDirection || "desc";

    const [rawProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortKey]: sortDirection },
        include: {
          category: {
            select: { id: true, name: true },
          },
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
      }),
      prisma.product.count({ where }),
    ]);

    // Fetch SEO entries for all products
    const productIds = rawProducts.map((p) => p.id);
    const seoEntries = await prisma.seoEntry.findMany({
      where: {
        entityType: "PRODUCT",
        entityId: { in: productIds },
        locale: "default",
      },
    });

    const seoMap = new Map<string, (typeof seoEntries)[0]>();
    seoEntries.forEach((s) => seoMap.set(s.entityId, s));

    const products: ProductItem[] = rawProducts.map((p) => {
      const seo = seoMap.get(p.id);

      const transformedVariants: TransformedVariant[] = p.variants.map((v) => {
        const optionValuesMap: Record<string, string> = {};
        v.optionValues.forEach((vov) => {
          if (vov.optionValue?.option?.name) {
            optionValuesMap[vov.optionValue.option.name] =
              vov.optionValue.value;
          }
        });

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
      });

      return {
        id: p.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: seo?.slug || slugify(p.name),
        description: p.description,
        price: Number(p.price),
        costPrice: p.costPrice ? Number(p.costPrice) : null,
        sku: p.sku,
        barcode: p.barcode,
        media: normalizeMedia(p.media as any),
        inStock: p.inStock,
        inventoryQuantity: p.inventoryQuantity,
        discountType: p.discountType,
        discountValue: p.discountValue ? Number(p.discountValue) : null,
        discountStartAt: p.discountStartAt,
        discountEndAt: p.discountEndAt,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        category: p.category,
        options: p.options,
        variants: transformedVariants,
        tags: p.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
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

    return {
      ok: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: any) {
    console.error("listProductsAction error:", error);
    return { ok: false, error: error.message || "Failed to list products" };
  }
}

/**
 * Server Action: Gets a single product by its ID.
 */
export async function getProductByIdAction(
  id: string,
): Promise<{ ok: true; product: ProductItem } | { ok: false; error: string }> {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
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
    });

    if (!product) {
      return { ok: false, error: "Product not found" };
    }

    const seo = await prisma.seoEntry.findFirst({
      where: { entityType: "PRODUCT", entityId: id, locale: "default" },
    });

    const transformedVariants: TransformedVariant[] = product.variants.map(
      (v) => {
        const optionValuesMap: Record<string, string> = {};
        v.optionValues.forEach((vov) => {
          if (vov.optionValue?.option?.name) {
            optionValuesMap[vov.optionValue.option.name] =
              vov.optionValue.value;
          }
        });

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
      },
    );

    return {
      ok: true,
      product: {
        id: product.id,
        categoryId: product.categoryId,
        name: product.name,
        slug: seo?.slug || slugify(product.name),
        description: product.description,
        price: Number(product.price),
        costPrice: product.costPrice ? Number(product.costPrice) : null,
        sku: product.sku,
        barcode: product.barcode,
        media: normalizeMedia(product.media as any),
        inStock: product.inStock,
        inventoryQuantity: product.inventoryQuantity,
        discountType: product.discountType,
        discountValue: product.discountValue
          ? Number(product.discountValue)
          : null,
        discountStartAt: product.discountStartAt,
        discountEndAt: product.discountEndAt,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        category: product.category,
        options: product.options,
        variants: transformedVariants,
        tags: product.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })),
        seo: seo
          ? {
              slug: seo.slug,
              title: seo.title,
              description: seo.description,
              imageUrl: seo.imageUrl,
            }
          : null,
      },
    };
  } catch (error: any) {
    console.error("getProductByIdAction error:", error);
    return { ok: false, error: error.message || "Failed to get product" };
  }
}

/**
 * Server Action: Gets a single product by its SEO slug.
 */
export async function getProductBySlugAction(
  slug: string,
  locale: string = "default",
): Promise<{ ok: true; product: ProductItem } | { ok: false; error: string }> {
  try {
    const seo = await prisma.seoEntry.findFirst({
      where: {
        entityType: "PRODUCT",
        slug,
        locale,
      },
    });

    if (!seo) {
      return { ok: false, error: "Product not found" };
    }

    return getProductByIdAction(seo.entityId);
  } catch (error: any) {
    console.error("getProductBySlugAction error:", error);
    return {
      ok: false,
      error: error.message || "Failed to get product by slug",
    };
  }
}

/**
 * Server Action: Validates if a product SEO slug is available in the database.
 */
export async function checkProductSlugAction(
  slug: string,
  excludeEntityId?: string,
  locale: string = "default",
): Promise<
  | {
      ok: true;
      available: boolean;
      slug: string;
      suggestedSlug?: string;
    }
  | {
      ok: false;
      error: string;
    }
> {
  try {
    const raw = (slug || "").trim();
    const normalizedSlug = slugify(raw);

    if (!normalizedSlug) {
      return {
        ok: true,
        available: false,
        slug: "",
      };
    }

    const existing = await prisma.seoEntry.findFirst({
      where: {
        locale,
        slug: normalizedSlug,
        ...(excludeEntityId ? { NOT: { entityId: excludeEntityId } } : {}),
      },
      select: { id: true, entityType: true, entityId: true },
    });

    if (!existing) {
      return {
        ok: true,
        available: true,
        slug: normalizedSlug,
      };
    }

    // Slug is taken, find next available suggested slug
    let counter = 1;
    let candidate = `${normalizedSlug}-${counter}`;
    while (true) {
      const candidateExists = await prisma.seoEntry.findFirst({
        where: {
          locale,
          slug: candidate,
          ...(excludeEntityId ? { NOT: { entityId: excludeEntityId } } : {}),
        },
        select: { id: true },
      });
      if (!candidateExists) break;
      counter++;
      candidate = `${normalizedSlug}-${counter}`;
    }

    return {
      ok: true,
      available: false,
      slug: normalizedSlug,
      suggestedSlug: candidate,
    };
  } catch (error: any) {
    console.error("checkProductSlugAction error:", error);
    return {
      ok: false,
      error: error.message || "Failed to check slug availability",
    };
  }
}

/**
 * Server Action: Creates a new product with options, variants, tags, and SEO entry.
 */
export async function createProductAction(
  input: CreateProductInput,
): Promise<{ ok: true; product: ProductItem } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    if (!input.name?.trim()) {
      return { ok: false, error: "Product name is required" };
    }

    const priceNum = Number(input.price) || 0;
    const costPriceNum =
      input.costPrice !== undefined &&
      input.costPrice !== "" &&
      input.costPrice !== null
        ? Number(input.costPrice)
        : null;

    const normalizedMediaList = normalizeMedia(input.media);

    const createdProduct = await prisma.$transaction(async (tx) => {
      // 1. Create base product
      const product = await tx.product.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          price: priceNum,
          costPrice: costPriceNum,
          sku: input.sku?.trim() || null,
          barcode: input.barcode?.trim() || null,
          media: normalizedMediaList as any,
          inStock: input.inStock ?? true,
          inventoryQuantity: input.inventoryQuantity ?? -1,
          discountType: (input.discountType as DiscountType) || "NONE",
          discountValue:
            input.discountValue !== undefined &&
            input.discountValue !== null &&
            input.discountValue !== ""
              ? Number(input.discountValue)
              : null,
          discountStartAt: input.discountStartAt
            ? new Date(input.discountStartAt)
            : null,
          discountEndAt: input.discountEndAt
            ? new Date(input.discountEndAt)
            : null,
          isActive: input.isActive ?? true,
          categoryId: input.categoryId || null,
        },
      });

      // 2. Generate and create SEO entry
      const uniqueSlug = await generateUniqueSlug(
        tx,
        input.slug || input.name,
        "PRODUCT",
        product.id,
      );

      await tx.seoEntry.create({
        data: {
          entityType: "PRODUCT",
          entityId: product.id,
          locale: "default",
          slug: uniqueSlug,
          title: input.seoTitle?.trim() || null,
          description: input.seoDescription?.trim() || null,
          imageUrl:
            input.seoImageUrl?.trim() ||
            (normalizedMediaList.length > 0
              ? normalizedMediaList[0].url
              : null),
        },
      });

      // 3. Options & Option Values
      const optionValueLookup = new Map<string, string>(); // "OptionName::Value" -> optionValueId

      if (input.options && input.options.length > 0) {
        for (let i = 0; i < input.options.length; i++) {
          const opt = input.options[i];
          if (!opt.name?.trim()) continue;

          const createdOpt = await tx.productOption.create({
            data: {
              productId: product.id,
              name: opt.name.trim(),
              position: opt.position ?? i,
            },
          });

          const rawValues = opt.values || [];
          for (let vIdx = 0; vIdx < rawValues.length; vIdx++) {
            const rawVal = rawValues[vIdx];
            const valStr =
              typeof rawVal === "string" ? rawVal.trim() : rawVal.value.trim();
            const valPos =
              typeof rawVal === "string" ? vIdx : (rawVal.position ?? vIdx);

            if (!valStr) continue;

            const createdVal = await tx.productOptionValue.create({
              data: {
                optionId: createdOpt.id,
                value: valStr,
                position: valPos,
              },
            });

            optionValueLookup.set(
              `${opt.name.trim()}::${valStr}`,
              createdVal.id,
            );
          }
        }
      }

      // 4. Variants
      if (input.variants && input.variants.length > 0) {
        const variantOptionValueLinks: {
          variantId: string;
          optionValueId: string;
        }[] = [];

        for (const variant of input.variants) {
          const vPrice =
            variant.price !== undefined &&
            variant.price !== "" &&
            variant.price !== null
              ? Number(variant.price)
              : null;
          const vCostPrice =
            variant.costPrice !== undefined &&
            variant.costPrice !== "" &&
            variant.costPrice !== null
              ? Number(variant.costPrice)
              : null;

          const createdVariant = await tx.productVariant.create({
            data: {
              productId: product.id,
              title: variant.title.trim() || "Variant",
              price: vPrice,
              costPrice: vCostPrice,
              sku: variant.sku?.trim() || null,
              barcode: variant.barcode?.trim() || null,
              imageUrl: variant.imageUrl?.trim() || null,
              inventoryQuantity: variant.inventoryQuantity ?? -1,
              isActive: variant.isActive ?? true,
            },
          });

          // Link variant option values
          if (variant.optionValues) {
            for (const [optName, optVal] of Object.entries(
              variant.optionValues,
            )) {
              const optValId = optionValueLookup.get(
                `${optName.trim()}::${optVal.trim()}`,
              );
              if (optValId) {
                variantOptionValueLinks.push({
                  variantId: createdVariant.id,
                  optionValueId: optValId,
                });
              }
            }
          }
        }

        if (variantOptionValueLinks.length > 0) {
          await tx.productVariantOptionValue.createMany({
            data: variantOptionValueLinks,
            skipDuplicates: true,
          });
        }
      }

      // 5. Tags
      if (input.tags && input.tags.length > 0) {
        const tagAssignments: { productId: string; tagId: string }[] = [];
        for (const rawTag of input.tags) {
          const tagName = rawTag.trim();
          if (!tagName) continue;

          const tag = await tx.productTag.upsert({
            where: { name: tagName },
            create: { name: tagName },
            update: {},
          });

          tagAssignments.push({
            productId: product.id,
            tagId: tag.id,
          });
        }

        if (tagAssignments.length > 0) {
          await tx.productTagAssignment.createMany({
            data: tagAssignments,
            skipDuplicates: true,
          });
        }
      }

      return product.id;
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    await safeRevalidate("/admin/products");
    await safeRevalidate("/products");

    const result = await getProductByIdAction(createdProduct);
    if (!result.ok) {
      return { ok: false, error: "Product created but failed to load details" };
    }

    return { ok: true, product: result.product };
  } catch (error: any) {
    console.error("createProductAction error:", error);
    return { ok: false, error: error.message || "Failed to create product" };
  }
}

/**
 * Server Action: Updates an existing product with options, variants, tags, and SEO.
 */
export async function updateProductAction(
  id: string,
  input: UpdateProductInput,
): Promise<{ ok: true; product: ProductItem } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      return { ok: false, error: "Product not found" };
    }

    const priceNum =
      input.price !== undefined ? Number(input.price) || 0 : undefined;
    const costPriceNum =
      input.costPrice !== undefined
        ? input.costPrice !== "" && input.costPrice !== null
          ? Number(input.costPrice)
          : null
        : undefined;

    await prisma.$transaction(async (tx) => {
      // 1. Update Product attributes
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.description !== undefined)
        updateData.description = input.description?.trim() || null;
      if (priceNum !== undefined) updateData.price = priceNum;
      if (costPriceNum !== undefined) updateData.costPrice = costPriceNum;
      if (input.sku !== undefined) updateData.sku = input.sku?.trim() || null;
      if (input.barcode !== undefined)
        updateData.barcode = input.barcode?.trim() || null;
      if (input.media !== undefined)
        updateData.media = normalizeMedia(input.media) as any;
      if (input.inStock !== undefined) updateData.inStock = input.inStock;
      if (input.inventoryQuantity !== undefined)
        updateData.inventoryQuantity = input.inventoryQuantity;
      if (input.discountType !== undefined)
        updateData.discountType = input.discountType as DiscountType;
      if (input.discountValue !== undefined)
        updateData.discountValue =
          input.discountValue !== "" && input.discountValue !== null
            ? Number(input.discountValue)
            : null;
      if (input.discountStartAt !== undefined)
        updateData.discountStartAt = input.discountStartAt
          ? new Date(input.discountStartAt)
          : null;
      if (input.discountEndAt !== undefined)
        updateData.discountEndAt = input.discountEndAt
          ? new Date(input.discountEndAt)
          : null;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.categoryId !== undefined)
        updateData.categoryId = input.categoryId || null;

      if (Object.keys(updateData).length > 0) {
        await tx.product.update({
          where: { id },
          data: updateData,
        });
      }

      // 2. SEO Entry sync
      let uniqueSlug: string | undefined;
      if (input.slug !== undefined || input.name !== undefined) {
        const baseSlug = input.slug || input.name || existing.name;
        uniqueSlug = await generateUniqueSlug(tx, baseSlug, "PRODUCT", id);
      }

      const seoData: any = {};
      if (uniqueSlug) seoData.slug = uniqueSlug;
      if (input.seoTitle !== undefined)
        seoData.title = input.seoTitle?.trim() || null;
      if (input.seoDescription !== undefined)
        seoData.description = input.seoDescription?.trim() || null;
      if (input.seoImageUrl !== undefined)
        seoData.imageUrl = input.seoImageUrl?.trim() || null;

      if (Object.keys(seoData).length > 0) {
        await tx.seoEntry.upsert({
          where: {
            entityType_entityId_locale: {
              entityType: "PRODUCT",
              entityId: id,
              locale: "default",
            },
          },
          create: {
            entityType: "PRODUCT",
            entityId: id,
            locale: "default",
            slug: uniqueSlug || slugify(input.name || existing.name),
            ...seoData,
          },
          update: seoData,
        });
      }

      // 3. Options & Variants recreation/sync if provided
      if (input.options !== undefined || input.variants !== undefined) {
        await tx.productOption.deleteMany({ where: { productId: id } });
        await tx.productVariant.deleteMany({ where: { productId: id } });

        const optionValueLookup = new Map<string, string>();

        if (input.options && input.options.length > 0) {
          for (let i = 0; i < input.options.length; i++) {
            const opt = input.options[i];
            if (!opt.name?.trim()) continue;

            const createdOpt = await tx.productOption.create({
              data: {
                productId: id,
                name: opt.name.trim(),
                position: opt.position ?? i,
              },
            });

            const rawValues = opt.values || [];
            for (let vIdx = 0; vIdx < rawValues.length; vIdx++) {
              const rawVal = rawValues[vIdx];
              const valStr =
                typeof rawVal === "string"
                  ? rawVal.trim()
                  : rawVal.value.trim();
              const valPos =
                typeof rawVal === "string" ? vIdx : (rawVal.position ?? vIdx);

              if (!valStr) continue;

              const createdVal = await tx.productOptionValue.create({
                data: {
                  optionId: createdOpt.id,
                  value: valStr,
                  position: valPos,
                },
              });

              optionValueLookup.set(
                `${opt.name.trim()}::${valStr}`,
                createdVal.id,
              );
            }
          }
        }

        if (input.variants && input.variants.length > 0) {
          const variantOptionValueLinks: {
            variantId: string;
            optionValueId: string;
          }[] = [];

          for (const variant of input.variants) {
            const vPrice =
              variant.price !== undefined &&
              variant.price !== "" &&
              variant.price !== null
                ? Number(variant.price)
                : null;
            const vCostPrice =
              variant.costPrice !== undefined &&
              variant.costPrice !== "" &&
              variant.costPrice !== null
                ? Number(variant.costPrice)
                : null;

            const createdVariant = await tx.productVariant.create({
              data: {
                productId: id,
                title: variant.title.trim() || "Variant",
                price: vPrice,
                costPrice: vCostPrice,
                sku: variant.sku?.trim() || null,
                barcode: variant.barcode?.trim() || null,
                imageUrl: variant.imageUrl?.trim() || null,
                inventoryQuantity: variant.inventoryQuantity ?? -1,
                isActive: variant.isActive ?? true,
              },
            });

            if (variant.optionValues) {
              for (const [optName, optVal] of Object.entries(
                variant.optionValues,
              )) {
                const optValId = optionValueLookup.get(
                  `${optName.trim()}::${optVal.trim()}`,
                );
                if (optValId) {
                  variantOptionValueLinks.push({
                    variantId: createdVariant.id,
                    optionValueId: optValId,
                  });
                }
              }
            }
          }

          if (variantOptionValueLinks.length > 0) {
            await tx.productVariantOptionValue.createMany({
              data: variantOptionValueLinks,
              skipDuplicates: true,
            });
          }
        }
      }

      // 4. Tags sync if provided
      if (input.tags !== undefined) {
        await tx.productTagAssignment.deleteMany({ where: { productId: id } });

        const tagAssignments: { productId: string; tagId: string }[] = [];
        for (const rawTag of input.tags) {
          const tagName = rawTag.trim();
          if (!tagName) continue;

          const tag = await tx.productTag.upsert({
            where: { name: tagName },
            create: { name: tagName },
            update: {},
          });

          tagAssignments.push({
            productId: id,
            tagId: tag.id,
          });
        }

        if (tagAssignments.length > 0) {
          await tx.productTagAssignment.createMany({
            data: tagAssignments,
            skipDuplicates: true,
          });
        }
      }
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    await safeRevalidate("/admin/products");
    await safeRevalidate(`/admin/products/${id}`);
    await safeRevalidate("/products");

    const result = await getProductByIdAction(id);
    if (!result.ok) {
      return { ok: false, error: "Product updated but failed to load details" };
    }

    return { ok: true, product: result.product };
  } catch (error: any) {
    console.error("updateProductAction error:", error);
    return { ok: false, error: error.message || "Failed to update product" };
  }
}

/**
 * Server Action: Deletes a product and its associated SEO entry.
 */
export async function deleteProductAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    await prisma.$transaction(async (tx) => {
      await tx.seoEntry.deleteMany({
        where: { entityType: "PRODUCT", entityId: id },
      });

      await tx.product.delete({
        where: { id },
      });
    });

    await safeRevalidate("/admin/products");
    await safeRevalidate("/products");

    return { ok: true };
  } catch (error: any) {
    console.error("deleteProductAction error:", error);
    return { ok: false, error: error.message || "Failed to delete product" };
  }
}

/**
 * Server Action: Deletes multiple products by their IDs.
 */
export async function bulkDeleteProductsAction(
  ids: string[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    if (!Array.isArray(ids) || ids.length === 0) {
      return { ok: false, error: "No product IDs provided" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.seoEntry.deleteMany({
        where: { entityType: "PRODUCT", entityId: { in: ids } },
      });

      await tx.product.deleteMany({
        where: { id: { in: ids } },
      });
    });

    await safeRevalidate("/admin/products");
    await safeRevalidate("/products");

    return { ok: true, count: ids.length };
  } catch (error: any) {
    console.error("bulkDeleteProductsAction error:", error);
    return { ok: false, error: error.message || "Failed to delete products" };
  }
}

/**
 * Server Action: Toggles product active or inStock status.
 */
export async function toggleProductStatusAction(
  id: string,
  field: "inStock" | "isActive" = "isActive",
): Promise<
  | { ok: true; inStock?: boolean; isActive?: boolean }
  | { ok: false; error: string }
> {
  try {
    await auth.admin.requireUser();

    const product = await prisma.product.findUnique({
      where: { id },
      select: { inStock: true, isActive: true },
    });

    if (!product) {
      return { ok: false, error: "Product not found" };
    }

    const nextValue = !product[field];

    const updated = await prisma.product.update({
      where: { id },
      data: {
        [field]: nextValue,
      },
      select: { inStock: true, isActive: true },
    });

    await safeRevalidate("/admin/products");
    await safeRevalidate("/products");

    return { ok: true, inStock: updated.inStock, isActive: updated.isActive };
  } catch (error: any) {
    console.error("toggleProductStatusAction error:", error);
    return {
      ok: false,
      error: error.message || "Failed to update product status",
    };
  }
}
