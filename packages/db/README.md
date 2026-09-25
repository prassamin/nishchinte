# @nishchinte/db

Canonical database layer and Prisma ORM client for the **Nishchinte** e-commerce platform. Built with MySQL / MariaDB driver adapter support (`@prisma/adapter-mariadb`), hot-reload connection pooling, realtime Change Data Capture (CDC) extensions, and TypeScript model registries.

---

## Features

- **Singleton Client Proxy**: `prisma` / `db` proxy maintains a single database pool across Next.js dev server hot-reloads and production serverless runs.
- **Driver Adapter Architecture**: Native Prisma ORM 7 adapter integration via `@prisma/adapter-mariadb`.
- **Automatic Config Resolution**: Reads connection settings automatically from `nishchinte.config.ts`.
- **Built-in Realtime CDC**: Transparently streams database mutations to `@nishchinte/realtime` SSE channels and webhooks.
- **Comprehensive E-Commerce Schema**: Production-ready schema for Admin users, Customers (GoTrue-compatible identities), Products, Nested Categories, Variants, Options, Tags, Coupons, Orders, Order Items, Addresses, Order Timelines, and OtpVerifications.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/db": "workspace:*"
  }
}
```

---

## Quick Start

Import `prisma` (or `db`) directly in server files, Server Actions, or API handlers:

```typescript
import { prisma, db } from "@nishchinte/db";

// Query products with active variants
const products = await prisma.product.findMany({
  where: { isActive: true },
  include: {
    category: true,
    variants: true,
    options: {
      include: { values: true },
    },
  },
  orderBy: { createdAt: "desc" },
});

// Create a new order within a transaction
const newOrder = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({
    data: {
      orderNumber: "ORD-2026-0001",
      customerName: "Rahim Ahmed",
      customerPhone: "01712345678",
      subtotal: 1200.0,
      totalAmount: 1260.0,
      shippingFee: 60.0,
      status: "PENDING",
      items: {
        create: [
          {
            productName: "Classic Oxford Shirt",
            unitPrice: 1200.0,
            quantity: 1,
            subtotal: 1200.0,
            total: 1200.0,
          },
        ],
      },
    },
  });

  return order;
});
```

---

## Schema Models Overview

| Model | Table Name | Purpose |
| :--- | :--- | :--- |
| `InternalUser` | `internal_users` | Backoffice admins and staff members with role permissions (`OWNER`, `ADMIN`, `STAFF`). |
| `Customer` | `customers` | Storefront buyers supporting phone/email login, guest accounts, and verification timestamps. |
| `CustomerIdentity` | `customer_identities` | Supabase GoTrue-compatible identities (`phone`, `email`, OAuth). |
| `CustomerAddress` | `customer_addresses` | Saved customer delivery addresses across Bangladesh divisions/districts/upazilas. |
| `AuthSession` & `AuthRefreshToken` | `auth_sessions`, `auth_refresh_tokens` | Anti-theft refresh token rotation family tracking. |
| `OtpVerification` | `otp_verifications` | Salted SHA-256 OTP tokens for SMS/Email verification. |
| `Product` | `products` | Base product catalog records with inventory, price, cost price, and discount rules. |
| `ProductCategory` | `product_categories` | Hierarchical self-referencing category tree. |
| `ProductOption` & `ProductOptionValue` | `product_options`, `product_option_values` | Product attributes (e.g. Size, Color, Material). |
| `ProductVariant` | `product_variants` | Combinations of option values with individual SKU, price, and stock levels. |
| `ProductTag` & `ProductTagAssignment` | `product_tags`, `product_tag_assignments` | Dynamic product tagging system. |
| `SeoEntry` | `seo_entries` | Localized slugs and meta tags for products and categories. |
| `Coupon` | `coupons` | Percentage and flat promotions targeted to products or categories. |
| `Order` | `orders` | Customer purchases with financial breakdowns, status pipelines, and courier metadata. |
| `OrderItem` | `order_items` | Immutable snapshots of ordered items at purchase time. |
| `OrderAddress` | `order_addresses` | Shipping delivery address attached to an order. |
| `OrderTimeline` | `order_timelines` | Audit history of status changes and administrative notes. |

---

## Export Reference

| Export | Type | Description |
| :--- | :--- | :--- |
| `prisma` / `db` | `PrismaClient` (Proxy) | Lazily initialized singleton Prisma client instance. |
| `getDb()` | `() => PrismaClient` | Returns the active singleton client. |
| `createDbClient()` | `(options?) => PrismaClient` | Creates a new isolated `PrismaClient` with adapters. |
| `* from "@prisma/client"` | Types / Enums | Re-exports all generated Prisma types, models, and enums. |

---

## Related Packages

- [`@nishchinte/cli`](file:///mnt/workspace/Git/ecom/packages/cli/README.md) - CLI runner for migrations, pushes, and Prisma Studio.
- [`@nishchinte/config`](file:///mnt/workspace/Git/ecom/packages/config/README.md) - Supplies database URLs and driver configuration.
- [`@nishchinte/realtime`](file:///mnt/workspace/Git/ecom/packages/realtime/README.md) - Extends Prisma client with mutation listeners.
- [`@nishchinte/server`](file:///mnt/workspace/Git/ecom/packages/server/README.md) - High-level server actions utilizing `@nishchinte/db`.
