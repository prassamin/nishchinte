"use server";

import {
  prisma,
  Prisma,
  type OrderStatus,
  type PaymentStatus,
  type PaymentMethod,
  type DeliveryType,
} from "@nishchinte/db";
import { auth } from "@nishchinte/auth/server";
import { getConfig } from "@nishchinte/config";
import { validateCouponForCheckoutAction } from "./coupons";
import { safeRevalidate } from "./utils";

export type { OrderStatus, PaymentStatus, PaymentMethod, DeliveryType };

export interface CreateOrderItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface CreateOrderAddressInput {
  name: string;
  phone: string;
  alternativePhone?: string | null;
  email?: string | null;
  division?: string | null;
  district: string;
  upazila?: string | null;
  streetAddress: string;
  postalCode?: string | null;
}

export interface CreateOrderInput {
  items: CreateOrderItemInput[];
  shippingAddress: CreateOrderAddressInput;
  deliveryType?: "STANDARD" | "EXPRESS";
  couponCode?: string | null;
  customerNotes?: string | null;
  saveAddress?: boolean;
}

export interface OrderItemSnapshot {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantTitle: string | null;
  sku: string | null;
  imageUrl: string | null;
  unitPrice: number;
  costPrice: number | null;
  quantity: number;
  subtotal: number;
  discount: number;
  total: number;
  metadata: Record<string, unknown> | null;
}

export interface OrderTimelineItem {
  id: string;
  status: OrderStatus | null;
  title: string;
  note: string | null;
  actorType: string;
  createdAt: Date;
}

export interface OrderSummaryItem {
  id: string;
  orderNumber: string;
  invoiceNumber: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNotes: string | null;
  adminNotes: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "CASH_ON_DELIVERY";
  deliveryType: DeliveryType;
  currency: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  couponCode: string | null;
  courierName: string | null;
  trackingNumber: string | null;
  consignmentId: string | null;
  placedAt: Date;
  confirmedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItemSnapshot[];
  itemCount?: number;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    avatarUrl?: string | null;
    totalOrders?: number;
  } | null;
  shippingAddress?: (CreateOrderAddressInput & { id: string }) | null;
  timeline?: OrderTimelineItem[];
}

export interface ListOrdersInput {
  page?: number;
  limit?: number;
  q?: string;
  search?: string;
  status?: OrderStatus | "ALL";
  paymentStatus?: PaymentStatus | "ALL";
  deliveryType?: DeliveryType | "ALL";
  customerId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  sortBy?: "placedAt" | "createdAt" | "totalAmount" | "orderNumber";
  sortOrder?: "asc" | "desc";
}

export interface ListOrdersResult {
  ok: true;
  orders: OrderSummaryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts: Record<string, number>;
  paymentCounts: Record<string, number>;
}

export interface UpdateOrderInput {
  orderId: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  adminNotes?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  consignmentId?: string | null;
  note?: string;
}

/**
 * Transforms a Prisma Order model into a clean, JSON-serializable OrderSummaryItem.
 */
function transformOrder(order: any): OrderSummaryItem {
  const items: OrderItemSnapshot[] = Array.isArray(order.items)
    ? order.items.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        variantTitle: i.variantTitle,
        sku: i.sku,
        imageUrl: i.imageUrl,
        unitPrice: Number(i.unitPrice ?? 0),
        costPrice: i.costPrice ? Number(i.costPrice) : null,
        quantity: i.quantity,
        subtotal: Number(i.subtotal ?? 0),
        discount: Number(i.discount ?? 0),
        total: Number(i.total ?? 0),
        metadata: (i.metadata as Record<string, unknown>) || null,
      }))
    : [];

  const itemCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    invoiceNumber: order.invoiceNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    customerNotes: order.customerNotes,
    adminNotes: order.adminNotes,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod ?? "CASH_ON_DELIVERY",
    deliveryType: order.deliveryType ?? "STANDARD",
    currency: order.currency ?? "BDT",
    subtotal: Number(order.subtotal ?? 0),
    shippingFee: Number(order.shippingFee ?? 0),
    discountAmount: Number(order.discountAmount ?? 0),
    totalAmount: Number(order.totalAmount ?? 0),
    couponCode: order.couponCode,
    courierName: order.courierName,
    trackingNumber: order.trackingNumber,
    consignmentId: order.consignmentId,
    placedAt: new Date(order.placedAt),
    confirmedAt: order.confirmedAt ? new Date(order.confirmedAt) : null,
    shippedAt: order.shippedAt ? new Date(order.shippedAt) : null,
    deliveredAt: order.deliveredAt ? new Date(order.deliveredAt) : null,
    cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : null,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    items,
    itemCount,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email,
          avatarUrl: order.customer.avatarUrl,
          totalOrders: order.customer._count?.orders ?? undefined,
        }
      : null,
    shippingAddress: order.shippingAddress
      ? {
          id: order.shippingAddress.id,
          name: order.shippingAddress.name,
          phone: order.shippingAddress.phone,
          alternativePhone: order.shippingAddress.alternativePhone,
          email: order.shippingAddress.email,
          division: order.shippingAddress.division,
          district: order.shippingAddress.district,
          upazila: order.shippingAddress.upazila,
          streetAddress: order.shippingAddress.streetAddress,
          postalCode: order.shippingAddress.postalCode,
        }
      : null,
    timeline: Array.isArray(order.timeline)
      ? order.timeline.map((t: any) => ({
          id: t.id,
          status: t.status,
          title: t.title,
          note: t.note,
          actorType: t.actorType,
          createdAt: new Date(t.createdAt),
        }))
      : undefined,
  };
}

/**
 * Generates a human-friendly sequential order number.
 * Format: ORD-YYYYMMDD-XXXX (e.g. ORD-20260924-4821)
 */
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${year}${month}${day}-${randomSuffix}`;
}

/**
 * Server Action: Lists orders for administrative panel with comprehensive search, filters, pagination, and sorting.
 */
export async function listOrdersAction(
  options: ListOrdersInput = {},
): Promise<ListOrdersResult> {
  await auth.admin.requireUser();

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 15));
  const skip = (page - 1) * limit;
  const search = (options.q || options.search || "").trim();

  const where: Prisma.OrderWhereInput = {};

  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
      { customerEmail: { contains: search } },
      { trackingNumber: { contains: search } },
      { consignmentId: { contains: search } },
      {
        shippingAddress: {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { district: { contains: search } },
            { upazila: { contains: search } },
            { streetAddress: { contains: search } },
          ],
        },
      },
    ];
  }

  if (options.status && options.status !== "ALL") {
    where.status = options.status;
  }

  if (options.paymentStatus && options.paymentStatus !== "ALL") {
    where.paymentStatus = options.paymentStatus;
  }

  if (options.deliveryType && options.deliveryType !== "ALL") {
    where.deliveryType = options.deliveryType;
  }

  if (options.customerId) {
    where.customerId = options.customerId;
  }

  if (options.startDate || options.endDate) {
    where.placedAt = {};
    if (options.startDate) where.placedAt.gte = new Date(options.startDate);
    if (options.endDate) where.placedAt.lte = new Date(options.endDate);
  }

  const sortBy = options.sortBy || "placedAt";
  const sortOrder = options.sortOrder || "desc";

  const [total, orders, totalAllCount, statusGroups, paymentGroups] =
    await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: true,
          shippingAddress: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              avatarUrl: true,
              _count: { select: { orders: true } },
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.order.count(),
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ["paymentStatus"],
        _count: { _all: true },
      }),
    ]);

  const statusCounts: Record<string, number> = {
    ALL: totalAllCount,
    PENDING: 0,
    CONFIRMED: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    RETURNED: 0,
    CANCELLED: 0,
  };

  for (const g of statusGroups) {
    statusCounts[g.status] = g._count._all;
  }

  const paymentCounts: Record<string, number> = {
    ALL: totalAllCount,
    PENDING: 0,
    PAID: 0,
    CANCELLED: 0,
  };

  for (const g of paymentGroups) {
    paymentCounts[g.paymentStatus] = g._count._all;
  }

  return {
    ok: true,
    orders: orders.map(transformOrder),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    statusCounts,
    paymentCounts,
  };
}

/**
 * Server Action: Retrieves an order by its ID or readable order number.
 */
export async function getOrderByIdAction(
  orderIdOrNumber: string,
): Promise<{ ok: true; order: OrderSummaryItem } | { ok: false; error: string }> {
  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderIdOrNumber }, { orderNumber: orderIdOrNumber }],
      },
      include: {
        items: true,
        shippingAddress: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            avatarUrl: true,
            _count: { select: { orders: true } },
          },
        },
        timeline: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return { ok: false, error: "Order not found." };
    }

    return {
      ok: true,
      order: transformOrder(order),
    };
  } catch (error: any) {
    console.error("getOrderByIdAction error:", error);
    return { ok: false, error: error?.message || "Failed to retrieve order." };
  }
}

/**
 * Server Action: Creates a new Customer Order (Cash on Delivery).
 * Supports both Authenticated Member Checkout and Guest Checkout.
 */
export async function createOrderAction(
  input: CreateOrderInput,
): Promise<{ ok: true; order: OrderSummaryItem } | { ok: false; error: string; code?: string }> {
  try {
    const config = getConfig();
    const customerAuthMode = config.auth?.customer?.mode || config.customerAuthMode || "hybrid";
    const verificationConfig = config.auth?.customer?.verification;

    // 1. Authenticated User Check
    const user = await auth.customer.getUser();

    if (customerAuthMode === "auth" && !user) {
      return {
        ok: false,
        error: "Customer authentication is required to place an order. Please sign in or create an account.",
        code: "AUTH_REQUIRED",
      };
    }

    if (user) {
      const isEnforced = verificationConfig?.enforceOnCheckout !== false;

      if (isEnforced) {
        const required = verificationConfig?.required ?? "phone";
        const isVerified = auth.customer.isVerified(user, required);

        if (!isVerified) {
          const requiredLabel = Array.isArray(required)
            ? required
                .map((r) => (r === "phone" ? "phone number" : r === "email" ? "email address" : r))
                .join(" and ")
            : required === "phone"
              ? "phone number"
              : required === "email"
                ? "email address"
                : required === "any"
                  ? "account"
                  : `${required}`;

          return {
            ok: false,
            error: `Your ${requiredLabel} is not verified. Please verify your ${requiredLabel} before placing an order.`,
            code: "VERIFICATION_REQUIRED",
          };
        }
      }
    }

    // 2. Validate Input Parameters
    if (!input.items || input.items.length === 0) {
      return { ok: false, error: "Your shopping cart is empty." };
    }

    if (!input.shippingAddress?.name?.trim()) {
      return { ok: false, error: "Recipient name is required." };
    }

    if (!input.shippingAddress?.phone?.trim()) {
      return { ok: false, error: "Recipient phone number is required." };
    }

    if (!input.shippingAddress?.district?.trim() || !input.shippingAddress?.streetAddress?.trim()) {
      return { ok: false, error: "Complete delivery address is required." };
    }

    // 3. Fetch Products and Variants from Database
    const productIds = input.items.map((item) => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: true,
        variants: true,
      },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // 4. Calculate Item Costs and Verify Stock
    let calculatedSubtotal = 0;
    const validatedItems: Array<{
      productId: string;
      variantId: string | null;
      productName: string;
      variantTitle: string | null;
      sku: string | null;
      imageUrl: string | null;
      unitPrice: number;
      costPrice: number | null;
      quantity: number;
      subtotal: number;
      discount: number;
      total: number;
      categoryId?: string | null;
    }> = [];

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) {
        return {
          ok: false,
          error: `The requested product is no longer available.`,
        };
      }

      if (!product.inStock) {
        return {
          ok: false,
          error: `"${product.name}" is currently out of stock.`,
        };
      }

      const qty = Math.max(1, Math.floor(item.quantity));

      if (product.inventoryQuantity >= 0 && product.inventoryQuantity < qty) {
        return {
          ok: false,
          error: `Only ${product.inventoryQuantity} unit(s) available for "${product.name}".`,
        };
      }

      // Calculate unit price with discount
      const basePrice = Number(product.price);
      let effectiveUnitPrice = basePrice;
      const discountVal = product.discountValue ? Number(product.discountValue) : 0;

      if (product.discountType === "PERCENTAGE" && discountVal > 0) {
        effectiveUnitPrice = Math.max(0, basePrice - (basePrice * discountVal) / 100);
      } else if (product.discountType === "FLAT" && discountVal > 0) {
        effectiveUnitPrice = Math.max(0, basePrice - discountVal);
      }

      let variantTitle: string | null = null;
      let selectedSku = product.sku;
      let variantCostPrice = product.costPrice ? Number(product.costPrice) : null;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant || !variant.isActive) {
          return {
            ok: false,
            error: `Selected product option is no longer available.`,
          };
        }
        if (variant.inventoryQuantity >= 0 && variant.inventoryQuantity < qty) {
          return {
            ok: false,
            error: `Only ${variant.inventoryQuantity} unit(s) available for variant "${variant.title}".`,
          };
        }
        variantTitle = variant.title;
        if (variant.price) {
          effectiveUnitPrice = Number(variant.price);
        }
        if (variant.sku) selectedSku = variant.sku;
        if (variant.costPrice) variantCostPrice = Number(variant.costPrice);
      }

      const mediaList = Array.isArray(product.media) ? (product.media as any[]) : [];
      const imageUrl = mediaList[0]?.url || null;

      const itemSubtotal = effectiveUnitPrice * qty;
      calculatedSubtotal += itemSubtotal;

      validatedItems.push({
        productId: product.id,
        variantId: item.variantId || null,
        productName: product.name,
        variantTitle,
        sku: selectedSku,
        imageUrl,
        unitPrice: effectiveUnitPrice,
        costPrice: variantCostPrice,
        quantity: qty,
        subtotal: itemSubtotal,
        discount: 0,
        total: itemSubtotal,
        categoryId: product.categoryId,
      });
    }

    // 5. Calculate Shipping Fee based on District
    const isInsideDhaka = input.shippingAddress.district.toLowerCase().includes("dhaka");
    const shippingFee = isInsideDhaka ? 60 : 120;

    // 6. Evaluate Coupon Discount (if provided)
    let appliedCouponId: string | null = null;
    let appliedCouponCode: string | null = null;
    let discountAmount = 0;

    if (input.couponCode?.trim()) {
      const couponValidation = await validateCouponForCheckoutAction({
        code: input.couponCode.trim(),
        cartItems: validatedItems.map((vi) => ({
          productId: vi.productId,
          categoryId: vi.categoryId || undefined,
          price: vi.unitPrice,
          quantity: vi.quantity,
        })),
      });

      if (!couponValidation.ok || !couponValidation.coupon) {
        return {
          ok: false,
          error: couponValidation.error || "The provided coupon code is invalid.",
        };
      }

      appliedCouponId = couponValidation.coupon.id;
      appliedCouponCode = couponValidation.coupon.code;
      discountAmount = couponValidation.coupon.discountAmount;
    }

    const totalAmount = Math.max(0, calculatedSubtotal + shippingFee - discountAmount);
    const orderNumber = generateOrderNumber();

    // 7. Execute Database Transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 7a. Create Master Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: user?.id || null,
          customerName: input.shippingAddress.name.trim(),
          customerPhone: input.shippingAddress.phone.trim(),
          customerEmail: input.shippingAddress.email?.trim() || user?.email || null,
          customerNotes: input.customerNotes?.trim() || null,
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentMethod: "CASH_ON_DELIVERY",
          deliveryType: (input.deliveryType as DeliveryType) || "STANDARD",
          currency: "BDT",
          subtotal: calculatedSubtotal,
          shippingFee,
          discountAmount,
          totalAmount,
          couponId: appliedCouponId,
          couponCode: appliedCouponCode,
        },
      });

      // 7b. Create Order Address
      const address = await tx.orderAddress.create({
        data: {
          orderId: order.id,
          name: input.shippingAddress.name.trim(),
          phone: input.shippingAddress.phone.trim(),
          alternativePhone: input.shippingAddress.alternativePhone?.trim() || null,
          email: input.shippingAddress.email?.trim() || user?.email || null,
          division: input.shippingAddress.division?.trim() || null,
          district: input.shippingAddress.district.trim(),
          upazila: input.shippingAddress.upazila?.trim() || null,
          streetAddress: input.shippingAddress.streetAddress.trim(),
          postalCode: input.shippingAddress.postalCode?.trim() || null,
        },
      });

      // 7c. Create Order Items
      const createdItems = [];
      for (const item of validatedItems) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantTitle: item.variantTitle,
            sku: item.sku,
            imageUrl: item.imageUrl,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
            discount: item.discount,
            total: item.total,
          },
        });
        createdItems.push(orderItem);

        // Deduct inventory if quantity is tracked (non-negative)
        await tx.product.update({
          where: { id: item.productId },
          data: {
            inventoryQuantity: {
              decrement: item.quantity,
            },
          },
        });

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              inventoryQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // 7d. Create Initial Timeline Event
      const timeline = await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          title: "Order Placed",
          note: "Order placed successfully via Cash on Delivery.",
          actorType: user ? "customer" : "guest",
          actorId: user?.id || null,
        },
      });

      // 7e. Increment Coupon usage if applied
      if (appliedCouponId) {
        await tx.coupon.update({
          where: { id: appliedCouponId },
          data: {
            currentUses: {
              increment: 1,
            },
          },
        });
      }

      // 7f. Save Address to Customer Profile if requested
      if (user && input.saveAddress) {
        await tx.customerAddress.create({
          data: {
            customerId: user.id,
            name: input.shippingAddress.name.trim(),
            phone: input.shippingAddress.phone.trim(),
            division: input.shippingAddress.division?.trim() || null,
            district: input.shippingAddress.district.trim(),
            upazila: input.shippingAddress.upazila?.trim() || null,
            streetAddress: input.shippingAddress.streetAddress.trim(),
            postalCode: input.shippingAddress.postalCode?.trim() || null,
            isDefault: false,
          },
        });
      }

      return {
        ...order,
        items: createdItems,
        shippingAddress: address,
        timeline: [timeline],
      };
    });

    safeRevalidate("/products");
    safeRevalidate("/checkout");
    safeRevalidate("/account/orders");
    safeRevalidate("/admin/orders");

    return {
      ok: true,
      order: transformOrder(createdOrder),
    };
  } catch (error: any) {
    console.error("createOrderAction error:", error);
    return { ok: false, error: error?.message || "Failed to place order. Please try again." };
  }
}

/**
 * Server Action: Lists orders for the currently authenticated customer.
 */
export async function listCustomerOrdersAction(): Promise<{
  ok: boolean;
  orders: OrderSummaryItem[];
  error?: string;
}> {
  try {
    const user = await auth.customer.requireUser();
    const orders = await prisma.order.findMany({
      where: { customerId: user.id },
      include: {
        items: true,
        shippingAddress: true,
        timeline: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { placedAt: "desc" },
    });

    return {
      ok: true,
      orders: orders.map(transformOrder),
    };
  } catch (error: any) {
    console.error("listCustomerOrdersAction error:", error);
    return { ok: false, orders: [], error: error?.message || "Failed to load orders." };
  }
}

/**
 * Server Action: Updates an existing order (Status, Payment, Notes, Courier Details).
 * Admin only.
 */
export async function updateOrderAction(
  input: UpdateOrderInput,
): Promise<{ ok: boolean; order?: OrderSummaryItem; error?: string }> {
  try {
    const admin = await auth.admin.requireUser();

    const existingOrder = await prisma.order.findUnique({
      where: { id: input.orderId },
    });

    if (!existingOrder) {
      return { ok: false, error: "Order not found." };
    }

    const updates: Prisma.OrderUpdateInput = {};
    const timelineEvents: Prisma.OrderTimelineCreateManyOrderInput[] = [];

    const now = new Date();

    if (input.status && input.status !== existingOrder.status) {
      updates.status = input.status;
      if (input.status === "CONFIRMED" && !existingOrder.confirmedAt) updates.confirmedAt = now;
      if (input.status === "SHIPPED" && !existingOrder.shippedAt) updates.shippedAt = now;
      if (input.status === "DELIVERED" && !existingOrder.deliveredAt) {
        updates.deliveredAt = now;
        updates.paymentStatus = "PAID";
      }
      if (input.status === "CANCELLED" && !existingOrder.cancelledAt) updates.cancelledAt = now;

      timelineEvents.push({
        status: input.status,
        title: `Status changed to ${input.status}`,
        note: input.note || null,
        actorType: "admin",
        actorId: admin.id,
      });
    }

    if (input.paymentStatus && input.paymentStatus !== existingOrder.paymentStatus) {
      updates.paymentStatus = input.paymentStatus;
      timelineEvents.push({
        status: existingOrder.status,
        title: `Payment status changed to ${input.paymentStatus}`,
        note: input.note || null,
        actorType: "admin",
        actorId: admin.id,
      });
    }

    if (input.adminNotes !== undefined) {
      updates.adminNotes = input.adminNotes?.trim() || null;
    }

    if (input.courierName !== undefined) {
      updates.courierName = input.courierName?.trim() || null;
    }

    if (input.trackingNumber !== undefined) {
      updates.trackingNumber = input.trackingNumber?.trim() || null;
    }

    if (input.consignmentId !== undefined) {
      updates.consignmentId = input.consignmentId?.trim() || null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: input.orderId },
        data: updates,
        include: {
          items: true,
          shippingAddress: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              avatarUrl: true,
              _count: { select: { orders: true } },
            },
          },
          timeline: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (timelineEvents.length > 0) {
        await tx.orderTimeline.createMany({
          data: timelineEvents.map((t) => ({
            ...t,
            orderId: input.orderId,
          })),
        });
      }

      return order;
    });

    safeRevalidate("/admin/orders");
    safeRevalidate(`/admin/orders/${existingOrder.id}`);
    safeRevalidate(`/orders/${existingOrder.orderNumber}`);

    return {
      ok: true,
      order: transformOrder(updated),
    };
  } catch (error: any) {
    console.error("updateOrderAction error:", error);
    return { ok: false, error: error?.message || "Failed to update order." };
  }
}

/**
 * Server Action: Updates an order's status (Admin only).
 */
export async function updateOrderStatusAction(input: {
  orderId: string;
  status: OrderStatus;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await updateOrderAction({
    orderId: input.orderId,
    status: input.status,
    note: input.note,
  });
  return { ok: res.ok, error: res.error };
}

/**
 * Server Action: Deletes a single order by ID (Admin only).
 */
export async function deleteOrderAction(
  orderId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await auth.admin.requireUser();

    await prisma.order.delete({
      where: { id: orderId },
    });

    safeRevalidate("/admin/orders");
    return { ok: true };
  } catch (error: any) {
    console.error("deleteOrderAction error:", error);
    return { ok: false, error: error?.message || "Failed to delete order." };
  }
}

/**
 * Server Action: Bulk deletes multiple orders by IDs (Admin only).
 */
export async function bulkDeleteOrdersAction(
  orderIds: string[],
): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    await auth.admin.requireUser();

    if (!orderIds || orderIds.length === 0) {
      return { ok: true, count: 0 };
    }

    const result = await prisma.order.deleteMany({
      where: { id: { in: orderIds } },
    });

    safeRevalidate("/admin/orders");
    return { ok: true, count: result.count };
  } catch (error: any) {
    console.error("bulkDeleteOrdersAction error:", error);
    return { ok: false, error: error?.message || "Failed to bulk delete orders." };
  }
}

/**
 * Server Action: Bulk updates status for multiple orders (Admin only).
 */
export async function bulkUpdateOrderStatusAction(
  orderIds: string[],
  status: OrderStatus,
  note?: string,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const admin = await auth.admin.requireUser();

    if (!orderIds || orderIds.length === 0) {
      return { ok: true, count: 0 };
    }

    const now = new Date();
    const updates: Prisma.OrderUpdateManyMutationInput = { status };

    if (status === "CONFIRMED") updates.confirmedAt = now;
    if (status === "SHIPPED") updates.shippedAt = now;
    if (status === "DELIVERED") {
      updates.deliveredAt = now;
      updates.paymentStatus = "PAID";
    }
    if (status === "CANCELLED") updates.cancelledAt = now;

    await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { id: { in: orderIds } },
        data: updates,
      });

      await tx.orderTimeline.createMany({
        data: orderIds.map((id) => ({
          orderId: id,
          status,
          title: `Bulk status update to ${status}`,
          note: note || null,
          actorType: "admin",
          actorId: admin.id,
        })),
      });
    });

    safeRevalidate("/admin/orders");
    return { ok: true, count: orderIds.length };
  } catch (error: any) {
    console.error("bulkUpdateOrderStatusAction error:", error);
    return { ok: false, error: error?.message || "Failed to bulk update orders." };
  }
}
