"use server";

import { prisma, Prisma, type CouponType, type CouponTarget } from "@nishchinte/db";
import { auth } from "@nishchinte/auth/server";
import { safeRevalidate } from "./utils";

export type { CouponType, CouponTarget };

export interface CreateCouponInput {
  name: string;
  code: string;
  type?: CouponType;
  discountValue: number | string;
  minPurchase?: number | string | null;
  maxDiscountAmount?: number | string | null;
  maxUses?: number | null;
  maxUsesPerUser?: number | null;
  target?: CouponTarget;
  productIds?: string[] | null;
  categoryIds?: string[] | null;
  isLimitedTime?: boolean;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  isActive?: boolean;
}

export interface UpdateCouponInput extends Partial<CreateCouponInput> {}

export interface ListCouponsInput {
  page?: number;
  limit?: number;
  search?: string;
  type?: CouponType | "ALL";
  target?: CouponTarget | "ALL";
  isActive?: boolean | "ALL";
  sortBy?: "createdAt" | "name" | "code" | "discountValue" | "currentUses";
  sortOrder?: "asc" | "desc";
}

export interface CouponItem {
  id: string;
  name: string;
  code: string;
  type: CouponType;
  discountValue: string;
  minPurchase: string | null;
  maxDiscountAmount: string | null;
  maxUses: number | null;
  maxUsesPerUser: number;
  currentUses: number;
  target: CouponTarget;
  productIds: string[];
  categoryIds: string[];
  isLimitedTime: boolean;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListCouponsResult {
  ok: true;
  coupons: CouponItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidateCouponInput {
  code: string;
  customerId?: string | null;
  cartItems: Array<{
    productId: string;
    categoryId?: string | null;
    price: number;
    quantity: number;
  }>;
}

export interface ValidateCouponResult {
  ok: boolean;
  error?: string;
  coupon?: {
    id: string;
    code: string;
    name: string;
    type: CouponType;
    discountValue: number;
    discountAmount: number;
    eligibleSubtotal: number;
  };
}

function parseJsonArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function transformCoupon(c: any): CouponItem {
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    type: c.type,
    discountValue: c.discountValue ? c.discountValue.toString() : "0.00",
    minPurchase: c.minPurchase ? c.minPurchase.toString() : null,
    maxDiscountAmount: c.maxDiscountAmount ? c.maxDiscountAmount.toString() : null,
    maxUses: c.maxUses ?? null,
    maxUsesPerUser: c.maxUsesPerUser ?? 1,
    currentUses: c.currentUses ?? 0,
    target: c.target ?? "ALL",
    productIds: parseJsonArray(c.productIds),
    categoryIds: parseJsonArray(c.categoryIds),
    isLimitedTime: Boolean(c.isLimitedTime),
    startDate: c.startDate ? new Date(c.startDate) : null,
    endDate: c.endDate ? new Date(c.endDate) : null,
    isActive: Boolean(c.isActive),
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  };
}

/**
 * Server Action: List coupons with search, filters, pagination and sorting.
 */
export async function listCouponsAction(
  options: ListCouponsInput = {},
): Promise<ListCouponsResult | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.search?.trim()) {
      const term = options.search.trim();
      where.OR = [
        { code: { contains: term } },
        { name: { contains: term } },
      ];
    }

    if (options.type && options.type !== "ALL") {
      where.type = options.type;
    }

    if (options.target && options.target !== "ALL") {
      where.target = options.target;
    }

    if (options.isActive !== undefined && options.isActive !== "ALL") {
      where.isActive = options.isActive === true;
    }

    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder || "desc";

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    return {
      ok: true,
      coupons: coupons.map(transformCoupon),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: any) {
    console.error("listCouponsAction error:", error);
    return { ok: false, error: error?.message || "Failed to fetch coupons" };
  }
}

/**
 * Server Action: Get single coupon by ID.
 */
export async function getCouponByIdAction(
  id: string,
): Promise<CouponItem | null> {
  try {
    await auth.admin.requireUser();

    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) return null;
    return transformCoupon(coupon);
  } catch (error) {
    console.error("getCouponByIdAction error:", error);
    return null;
  }
}

/**
 * Server Action: Get single coupon by Code.
 */
export async function getCouponByCodeAction(
  code: string,
): Promise<CouponItem | null> {
  try {
    await auth.admin.requireUser();

    const normalizedCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) return null;
    return transformCoupon(coupon);
  } catch (error) {
    console.error("getCouponByCodeAction error:", error);
    return null;
  }
}

/**
 * Server Action: Check if a coupon code is available / unique.
 */
export async function checkCouponCodeAction(
  code: string,
  excludeId?: string,
): Promise<{ available: boolean }> {
  try {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) return { available: false };

    const existing = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
      select: { id: true },
    });

    if (!existing) return { available: true };
    if (excludeId && existing.id === excludeId) return { available: true };

    return { available: false };
  } catch {
    return { available: false };
  }
}

/**
 * Server Action: Create a new Coupon.
 */
export async function createCouponAction(
  input: CreateCouponInput,
): Promise<{ ok: true; coupon: CouponItem } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    if (!input.name?.trim()) {
      return { ok: false, error: "Coupon name is required" };
    }

    const code = input.code?.trim().toUpperCase();
    if (!code) {
      return { ok: false, error: "Coupon code is required" };
    }

    // Uniqueness check
    const existing = await prisma.coupon.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existing) {
      return { ok: false, error: `Coupon code '${code}' already exists` };
    }

    const discountValue = Number(input.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      return { ok: false, error: "Discount value must be greater than 0" };
    }

    const type = input.type || "PERCENTAGE";
    if (type === "PERCENTAGE" && discountValue > 100) {
      return { ok: false, error: "Percentage discount cannot exceed 100%" };
    }

    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const isLimitedTime = Boolean(input.isLimitedTime);

    if (isLimitedTime) {
      if (input.startDate) startDate = new Date(input.startDate);
      if (input.endDate) endDate = new Date(input.endDate);

      if (startDate && endDate && startDate > endDate) {
        return { ok: false, error: "Start date cannot be after end date" };
      }
    }

    const created = await prisma.coupon.create({
      data: {
        name: input.name.trim(),
        code,
        type,
        discountValue,
        minPurchase: input.minPurchase ? Number(input.minPurchase) : null,
        maxDiscountAmount: input.maxDiscountAmount
          ? Number(input.maxDiscountAmount)
          : null,
        maxUses: input.maxUses ? Number(input.maxUses) : null,
        maxUsesPerUser:
          input.maxUsesPerUser !== undefined && input.maxUsesPerUser !== null
            ? Number(input.maxUsesPerUser)
            : 1,
        target: input.target || "ALL",
        productIds: input.productIds && input.productIds.length > 0 ? input.productIds : Prisma.JsonNull,
        categoryIds: input.categoryIds && input.categoryIds.length > 0 ? input.categoryIds : Prisma.JsonNull,
        isLimitedTime,
        startDate,
        endDate,
        isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      },
    });

    await safeRevalidate("/admin/coupons");
    await safeRevalidate("/admin/orders");

    return {
      ok: true,
      coupon: transformCoupon(created),
    };
  } catch (error: any) {
    console.error("createCouponAction error:", error);
    return { ok: false, error: error?.message || "Failed to create coupon" };
  }
}

/**
 * Server Action: Update an existing Coupon.
 */
export async function updateCouponAction(
  id: string,
  input: UpdateCouponInput,
): Promise<{ ok: true; coupon: CouponItem } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    const existing = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!existing) {
      return { ok: false, error: "Coupon not found" };
    }

    const data: any = {};

    if (input.name !== undefined) {
      if (!input.name.trim()) return { ok: false, error: "Coupon name is required" };
      data.name = input.name.trim();
    }

    if (input.code !== undefined) {
      const code = input.code.trim().toUpperCase();
      if (!code) return { ok: false, error: "Coupon code is required" };
      if (code !== existing.code) {
        const duplicate = await prisma.coupon.findUnique({
          where: { code },
          select: { id: true },
        });
        if (duplicate) {
          return { ok: false, error: `Coupon code '${code}' already exists` };
        }
        data.code = code;
      }
    }

    if (input.type !== undefined) {
      data.type = input.type;
    }

    const type = input.type || existing.type;

    if (input.discountValue !== undefined) {
      const discountValue = Number(input.discountValue);
      if (isNaN(discountValue) || discountValue <= 0) {
        return { ok: false, error: "Discount value must be greater than 0" };
      }
      if (type === "PERCENTAGE" && discountValue > 100) {
        return { ok: false, error: "Percentage discount cannot exceed 100%" };
      }
      data.discountValue = discountValue;
    }

    if (input.minPurchase !== undefined) {
      data.minPurchase = input.minPurchase ? Number(input.minPurchase) : null;
    }

    if (input.maxDiscountAmount !== undefined) {
      data.maxDiscountAmount = input.maxDiscountAmount
        ? Number(input.maxDiscountAmount)
        : null;
    }

    if (input.maxUses !== undefined) {
      data.maxUses = input.maxUses ? Number(input.maxUses) : null;
    }

    if (input.maxUsesPerUser !== undefined) {
      data.maxUsesPerUser =
        input.maxUsesPerUser !== null ? Number(input.maxUsesPerUser) : 1;
    }

    if (input.target !== undefined) {
      data.target = input.target;
    }

    if (input.productIds !== undefined) {
      data.productIds = input.productIds && input.productIds.length > 0 ? input.productIds : Prisma.JsonNull;
    }

    if (input.categoryIds !== undefined) {
      data.categoryIds = input.categoryIds && input.categoryIds.length > 0 ? input.categoryIds : Prisma.JsonNull;
    }

    if (input.isLimitedTime !== undefined) {
      data.isLimitedTime = Boolean(input.isLimitedTime);
    }

    if (input.startDate !== undefined) {
      data.startDate = input.startDate ? new Date(input.startDate) : null;
    }

    if (input.endDate !== undefined) {
      data.endDate = input.endDate ? new Date(input.endDate) : null;
    }

    const finalStartDate = data.startDate !== undefined ? data.startDate : existing.startDate;
    const finalEndDate = data.endDate !== undefined ? data.endDate : existing.endDate;
    if (finalStartDate && finalEndDate && finalStartDate > finalEndDate) {
      return { ok: false, error: "Start date cannot be after end date" };
    }

    if (input.isActive !== undefined) {
      data.isActive = Boolean(input.isActive);
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data,
    });

    await safeRevalidate("/admin/coupons");
    await safeRevalidate(`/admin/coupons/${id}`);
    await safeRevalidate("/admin/orders");

    return {
      ok: true,
      coupon: transformCoupon(updated),
    };
  } catch (error: any) {
    console.error("updateCouponAction error:", error);
    return { ok: false, error: error?.message || "Failed to update coupon" };
  }
}

/**
 * Server Action: Delete a single Coupon.
 */
export async function deleteCouponAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    await prisma.coupon.delete({
      where: { id },
    });

    await safeRevalidate("/admin/coupons");
    await safeRevalidate("/admin/orders");

    return { ok: true };
  } catch (error: any) {
    console.error("deleteCouponAction error:", error);
    return { ok: false, error: error?.message || "Failed to delete coupon" };
  }
}

/**
 * Server Action: Bulk delete Coupons.
 */
export async function bulkDeleteCouponsAction(
  ids: string[],
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    if (!ids || ids.length === 0) {
      return { ok: true, count: 0 };
    }

    const result = await prisma.coupon.deleteMany({
      where: { id: { in: ids } },
    });

    await safeRevalidate("/admin/coupons");
    await safeRevalidate("/admin/orders");

    return { ok: true, count: result.count };
  } catch (error: any) {
    console.error("bulkDeleteCouponsAction error:", error);
    return { ok: false, error: error?.message || "Failed to bulk delete coupons" };
  }
}

/**
 * Server Action: Toggle active status of a coupon.
 */
export async function toggleCouponStatusAction(
  id: string,
  isActive?: boolean,
): Promise<{ ok: true; isActive: boolean } | { ok: false; error: string }> {
  try {
    await auth.admin.requireUser();

    const existing = await prisma.coupon.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!existing) {
      return { ok: false, error: "Coupon not found" };
    }

    const nextState = isActive !== undefined ? isActive : !existing.isActive;

    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: nextState },
      select: { isActive: true },
    });

    await safeRevalidate("/admin/coupons");
    return { ok: true, isActive: updated.isActive };
  } catch (error: any) {
    console.error("toggleCouponStatusAction error:", error);
    return { ok: false, error: error?.message || "Failed to toggle status" };
  }
}

/**
 * Server Action: Validate coupon for Checkout / Cart calculation.
 */
export async function validateCouponForCheckoutAction(
  params: ValidateCouponInput,
): Promise<ValidateCouponResult> {
  try {
    const code = params.code?.trim().toUpperCase();
    if (!code) {
      return { ok: false, error: "Please enter a coupon code" };
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      return { ok: false, error: "Invalid or inactive coupon code" };
    }

    const now = new Date();

    // 1. Time validity check
    if (coupon.isLimitedTime) {
      if (coupon.startDate && now < coupon.startDate) {
        return { ok: false, error: "This coupon is not yet active" };
      }
      if (coupon.endDate && now > coupon.endDate) {
        return { ok: false, error: "This coupon has expired" };
      }
    }

    // 2. Global Usage limit check
    if (coupon.maxUses !== null && coupon.maxUses !== undefined) {
      if (coupon.currentUses >= coupon.maxUses) {
        return { ok: false, error: "This coupon has reached its maximum usage limit" };
      }
    }

    // 3. Filter eligible items based on coupon target
    const target = coupon.target;
    const targetedProductIds = new Set(parseJsonArray(coupon.productIds));
    const targetedCategoryIds = new Set(parseJsonArray(coupon.categoryIds));

    let eligibleSubtotal = 0;

    for (const item of params.cartItems || []) {
      const itemTotal = Number(item.price) * Number(item.quantity);
      if (target === "ALL") {
        eligibleSubtotal += itemTotal;
      } else if (target === "SPECIFIC_PRODUCTS") {
        if (targetedProductIds.has(item.productId)) {
          eligibleSubtotal += itemTotal;
        }
      } else if (target === "SPECIFIC_CATEGORIES") {
        if (item.categoryId && targetedCategoryIds.has(item.categoryId)) {
          eligibleSubtotal += itemTotal;
        }
      }
    }

    if (eligibleSubtotal <= 0) {
      return {
        ok: false,
        error: "None of the items in your cart are eligible for this coupon",
      };
    }

    // 4. Minimum Purchase check
    const minPurchase = coupon.minPurchase ? Number(coupon.minPurchase) : 0;
    if (minPurchase > 0 && eligibleSubtotal < minPurchase) {
      return {
        ok: false,
        error: `Minimum eligible purchase of ${minPurchase} required for this coupon`,
      };
    }

    // 5. Calculate discount amount
    const discountValue = Number(coupon.discountValue);
    let discountAmount = 0;

    if (coupon.type === "PERCENTAGE") {
      discountAmount = (eligibleSubtotal * discountValue) / 100;
      if (coupon.maxDiscountAmount) {
        const maxCap = Number(coupon.maxDiscountAmount);
        if (maxCap > 0 && discountAmount > maxCap) {
          discountAmount = maxCap;
        }
      }
    } else {
      // FLAT discount
      discountAmount = Math.min(discountValue, eligibleSubtotal);
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      ok: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        discountValue,
        discountAmount,
        eligibleSubtotal,
      },
    };
  } catch (error: any) {
    console.error("validateCouponForCheckoutAction error:", error);
    return { ok: false, error: error?.message || "Failed to validate coupon" };
  }
}
