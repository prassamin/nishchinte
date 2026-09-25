"use server";

import { prisma, type OrderStatus, type PaymentStatus, type DeliveryType } from "@nishchinte/db";
import { auth } from "@nishchinte/auth/server";
import { getConfig } from "@nishchinte/config";
import { validateCouponForCheckoutAction } from "./coupons";
import { safeRevalidate } from "./utils";

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
  shippingAddress?: CreateOrderAddressInput & { id: string } | null;
  timeline?: Array<{
    id: string;
    status: OrderStatus | null;
    title: string;
    note: string | null;
    actorType: string;
    createdAt: Date;
  }>;
}

export interface ListOrdersInput {
  page?: number;
  limit?: number;
  q?: string;
  status?: OrderStatus | "ALL";
  paymentStatus?: PaymentStatus | "ALL";
  customerId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  sortBy?: "placedAt" | "totalAmount" | "orderNumber";
  sortOrder?: "asc" | "desc";
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

    return {
      ok: true,
      order: {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        invoiceNumber: createdOrder.invoiceNumber,
        customerId: createdOrder.customerId,
        customerName: createdOrder.customerName,
        customerPhone: createdOrder.customerPhone,
        customerEmail: createdOrder.customerEmail,
        customerNotes: createdOrder.customerNotes,
        adminNotes: createdOrder.adminNotes,
        status: createdOrder.status,
        paymentStatus: createdOrder.paymentStatus,
        paymentMethod: "CASH_ON_DELIVERY",
        deliveryType: createdOrder.deliveryType,
        currency: createdOrder.currency,
        subtotal: Number(createdOrder.subtotal),
        shippingFee: Number(createdOrder.shippingFee),
        discountAmount: Number(createdOrder.discountAmount),
        totalAmount: Number(createdOrder.totalAmount),
        couponCode: createdOrder.couponCode,
        courierName: createdOrder.courierName,
        trackingNumber: createdOrder.trackingNumber,
        consignmentId: createdOrder.consignmentId,
        placedAt: createdOrder.placedAt,
        confirmedAt: createdOrder.confirmedAt,
        shippedAt: createdOrder.shippedAt,
        deliveredAt: createdOrder.deliveredAt,
        cancelledAt: createdOrder.cancelledAt,
        createdAt: createdOrder.createdAt,
        updatedAt: createdOrder.updatedAt,
        items: createdOrder.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName,
          variantTitle: i.variantTitle,
          sku: i.sku,
          imageUrl: i.imageUrl,
          unitPrice: Number(i.unitPrice),
          costPrice: i.costPrice ? Number(i.costPrice) : null,
          quantity: i.quantity,
          subtotal: Number(i.subtotal),
          discount: Number(i.discount),
          total: Number(i.total),
          metadata: (i.metadata as Record<string, unknown>) || null,
        })),
        shippingAddress: createdOrder.shippingAddress
          ? {
              id: createdOrder.shippingAddress.id,
              name: createdOrder.shippingAddress.name,
              phone: createdOrder.shippingAddress.phone,
              alternativePhone: createdOrder.shippingAddress.alternativePhone,
              email: createdOrder.shippingAddress.email,
              division: createdOrder.shippingAddress.division,
              district: createdOrder.shippingAddress.district,
              upazila: createdOrder.shippingAddress.upazila,
              streetAddress: createdOrder.shippingAddress.streetAddress,
              postalCode: createdOrder.shippingAddress.postalCode,
            }
          : null,
        timeline: createdOrder.timeline.map((t) => ({
          id: t.id,
          status: t.status,
          title: t.title,
          note: t.note,
          actorType: t.actorType,
          createdAt: t.createdAt,
        })),
      },
    };
  } catch (error: any) {
    console.error("createOrderAction error:", error);
    return { ok: false, error: error?.message || "Failed to place order. Please try again." };
  }
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
      order: {
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
        paymentMethod: "CASH_ON_DELIVERY",
        deliveryType: order.deliveryType,
        currency: order.currency,
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
        couponCode: order.couponCode,
        courierName: order.courierName,
        trackingNumber: order.trackingNumber,
        consignmentId: order.consignmentId,
        placedAt: order.placedAt,
        confirmedAt: order.confirmedAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName,
          variantTitle: i.variantTitle,
          sku: i.sku,
          imageUrl: i.imageUrl,
          unitPrice: Number(i.unitPrice),
          costPrice: i.costPrice ? Number(i.costPrice) : null,
          quantity: i.quantity,
          subtotal: Number(i.subtotal),
          discount: Number(i.discount),
          total: Number(i.total),
          metadata: (i.metadata as Record<string, unknown>) || null,
        })),
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
        timeline: order.timeline.map((t) => ({
          id: t.id,
          status: t.status,
          title: t.title,
          note: t.note,
          actorType: t.actorType,
          createdAt: t.createdAt,
        })),
      },
    };
  } catch (error: any) {
    console.error("getOrderByIdAction error:", error);
    return { ok: false, error: error?.message || "Failed to retrieve order." };
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
      },
      orderBy: { placedAt: "desc" },
    });

    return {
      ok: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        invoiceNumber: o.invoiceNumber,
        customerId: o.customerId,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        customerNotes: o.customerNotes,
        adminNotes: o.adminNotes,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: "CASH_ON_DELIVERY",
        deliveryType: o.deliveryType,
        currency: o.currency,
        subtotal: Number(o.subtotal),
        shippingFee: Number(o.shippingFee),
        discountAmount: Number(o.discountAmount),
        totalAmount: Number(o.totalAmount),
        couponCode: o.couponCode,
        courierName: o.courierName,
        trackingNumber: o.trackingNumber,
        consignmentId: o.consignmentId,
        placedAt: o.placedAt,
        confirmedAt: o.confirmedAt,
        shippedAt: o.shippedAt,
        deliveredAt: o.deliveredAt,
        cancelledAt: o.cancelledAt,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        items: o.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName,
          variantTitle: i.variantTitle,
          sku: i.sku,
          imageUrl: i.imageUrl,
          unitPrice: Number(i.unitPrice),
          costPrice: i.costPrice ? Number(i.costPrice) : null,
          quantity: i.quantity,
          subtotal: Number(i.subtotal),
          discount: Number(i.discount),
          total: Number(i.total),
          metadata: (i.metadata as Record<string, unknown>) || null,
        })),
        shippingAddress: o.shippingAddress,
      })),
    };
  } catch (error: any) {
    console.error("listCustomerOrdersAction error:", error);
    return { ok: false, orders: [], error: error?.message || "Failed to load orders." };
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
  try {
    const admin = await auth.admin.requireUser();

    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
    });

    if (!order) {
      return { ok: false, error: "Order not found." };
    }

    const updates: Record<string, unknown> = {
      status: input.status,
    };

    const now = new Date();
    if (input.status === "CONFIRMED" && !order.confirmedAt) updates.confirmedAt = now;
    if (input.status === "SHIPPED" && !order.shippedAt) updates.shippedAt = now;
    if (input.status === "DELIVERED" && !order.deliveredAt) {
      updates.deliveredAt = now;
      updates.paymentStatus = "PAID";
    }
    if (input.status === "CANCELLED" && !order.cancelledAt) updates.cancelledAt = now;

    await prisma.$transaction([
      prisma.order.update({
        where: { id: input.orderId },
        data: updates,
      }),
      prisma.orderTimeline.create({
        data: {
          orderId: input.orderId,
          status: input.status,
          title: `Status changed to ${input.status}`,
          note: input.note || null,
          actorType: "admin",
          actorId: admin.id,
        },
      }),
    ]);

    safeRevalidate("/admin/orders");
    safeRevalidate(`/orders/${order.orderNumber}`);

    return { ok: true };
  } catch (error: any) {
    console.error("updateOrderStatusAction error:", error);
    return { ok: false, error: error?.message || "Failed to update order status." };
  }
}
