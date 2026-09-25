"use server";

import { prisma } from "@nishchinte/db";
import { auth } from "@nishchinte/auth/server";
import { safeRevalidate } from "../utils";

export interface CreateTagInput {
  name: string;
}

export interface ListTagsInput {
  search?: string;
}

export interface TagItem {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    products: number;
  };
}

/**
 * Server Action: Lists all product tags with optional search filter.
 */
export async function listTagsAction(
  input: ListTagsInput = {},
): Promise<{ ok: true; tags: TagItem[] } | { ok: false; error: string }> {
  try {
    const where: any = {};
    if (input.search?.trim()) {
      where.name = { contains: input.search.trim() };
    }

    const tags = await prisma.productTag.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return { ok: true, tags };
  } catch (error: any) {
    console.error("listTagsAction error:", error);
    return { ok: false, error: error.message || "Failed to list tags" };
  }
}

/**
 * Server Action: Creates a new product tag or returns an existing one.
 */
export async function createTagAction(
  input: string | CreateTagInput,
): Promise<{ ok: true; tag: TagItem } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    const name = typeof input === "string" ? input : input?.name;
    const trimmed = name?.trim();
    if (!trimmed) {
      return { ok: false, error: "Tag name cannot be empty" };
    }

    const tag = await prisma.productTag.upsert({
      where: { name: trimmed },
      create: { name: trimmed },
      update: {},
    });

    await safeRevalidate("/admin/products");
    return { ok: true, tag };
  } catch (error: any) {
    console.error("createTagAction error:", error);
    return { ok: false, error: error.message || "Failed to create tag" };
  }
}

/**
 * Server Action: Deletes a product tag by its ID.
 */
export async function deleteTagAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    await prisma.productTag.delete({
      where: { id },
    });

    await safeRevalidate("/admin/products");
    return { ok: true };
  } catch (error: any) {
    console.error("deleteTagAction error:", error);
    return { ok: false, error: error.message || "Failed to delete tag" };
  }
}
