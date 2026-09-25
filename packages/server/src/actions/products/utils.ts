import { getMimeType } from "@nishchinte/storage";
import { getLeafSegment, slugify, slugifyPath } from "@nishchinte/utils";

/**
 * Generates a unique SEO slug for products or general flat entities.
 */
export async function generateUniqueSlug(
  tx: any,
  baseText: string,
  entityType: "PRODUCT" | "CATEGORY",
  excludeEntityId?: string,
  locale: string = "default",
): Promise<string> {
  const base =
    slugify(baseText) ||
    (entityType === "PRODUCT" ? "product" : "category");
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await tx.seoEntry.findFirst({
      where: {
        entityType,
        locale,
        slug: candidate,
        ...(excludeEntityId ? { NOT: { entityId: excludeEntityId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${counter}`;
    counter++;
  }
}

/**
 * Generates a hierarchical SEO slug for categories (e.g. "tshirt/women/summer").
 * Evaluates parent lineage and resolves sibling uniqueness cleanly without cross-parent collisions.
 */
export async function generateCategoryHierarchicalSlug(
  tx: any,
  segmentOrSlugText: string,
  parentId?: string | null,
  excludeEntityId?: string,
  locale: string = "default",
): Promise<string> {
  // Extract the leaf segment
  const leafSegment = slugify(getLeafSegment(segmentOrSlugText)) || "category";

  let parentSlugPrefix = "";
  if (parentId) {
    const parentSeo = await tx.seoEntry.findFirst({
      where: {
        entityType: "CATEGORY",
        entityId: parentId,
        locale,
      },
      select: { slug: true },
    });

    if (parentSeo?.slug) {
      parentSlugPrefix = `${parentSeo.slug}/`;
    } else {
      const parentCategory = await tx.productCategory.findUnique({
        where: { id: parentId },
        select: { name: true },
      });
      if (parentCategory?.name) {
        parentSlugPrefix = `${slugify(parentCategory.name)}/`;
      }
    }
  }

  const base = `${parentSlugPrefix}${leafSegment}`;
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await tx.seoEntry.findFirst({
      where: {
        entityType: "CATEGORY",
        locale,
        slug: candidate,
        ...(excludeEntityId ? { NOT: { entityId: excludeEntityId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${parentSlugPrefix}${leafSegment}-${counter}`;
    counter++;
  }
}

/**
 * Recursively cascades slug updates to all descendant categories when a parent's slug changes.
 * Example: if "tshirt" changes to "t-shirts", "tshirt/women/summer" becomes "t-shirts/women/summer".
 */
export async function updateDescendantCategorySlugs(
  tx: any,
  oldParentSlug: string,
  newParentSlug: string,
  locale: string = "default",
): Promise<void> {
  if (!oldParentSlug || !newParentSlug || oldParentSlug === newParentSlug) {
    return;
  }

  const oldPrefix = `${oldParentSlug}/`;
  const newPrefix = `${newParentSlug}/`;

  const descendantSeos = await tx.seoEntry.findMany({
    where: {
      entityType: "CATEGORY",
      locale,
      slug: {
        startsWith: oldPrefix,
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  for (const entry of descendantSeos) {
    const suffix = entry.slug.slice(oldPrefix.length);
    const updatedSlug = `${newPrefix}${suffix}`;

    await tx.seoEntry.update({
      where: { id: entry.id },
      data: { slug: updatedSlug },
    });
  }
}

export interface ProductMediaItem {
  url: string;
  mimeType: string;
}

/**
 * Normalizes mixed media input (strings or objects) into a structured ProductMediaItem array.
 */
export function normalizeMedia(
  media?: Array<string | { url: string; mimeType?: string }> | null,
): ProductMediaItem[] {
  if (!Array.isArray(media)) return [];
  return media
    .filter((item) => {
      if (typeof item === "string") return Boolean(item.trim());
      return Boolean(item?.url?.trim());
    })
    .map((item) => {
      if (typeof item === "string") {
        return {
          url: item.trim(),
          mimeType: getMimeType(item.trim()) || "image/jpeg",
        };
      }
      return {
        url: item.url.trim(),
        mimeType: item.mimeType || getMimeType(item.url.trim()) || "image/jpeg",
      };
    });
}
