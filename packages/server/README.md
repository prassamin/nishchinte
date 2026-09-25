# @nishchinte/server

Core backend orchestrator and Server Action registry for the **Nishchinte** e-commerce platform. Exports namespaced Server Actions (`actions.product.*`, `actions.order.*`, `actions.coupon.*`, `actions.customer.*`, `actions.admin.*`, `actions.storage.*`), client singleton accessors (`email`, `sms`, `storage`, `auth`), and Hono/Cifer API route bindings.

---

## Features

- **Domain-Driven Action Namespaces**: Single access point (`import { actions } from "@nishchinte/server/actions"`) for all backend actions.
- **Transactional Consistency**: Automatic database transactions with Prisma ORM 7 (`@nishchinte/db`) for multi-step order placement and coupon validation.
- **Pluggable Client Singletons**: Access pre-configured instances of `email`, `sms`, `storage`, and `auth` bound to the active request context.
- **Next.js & React 19 Server Actions**: Native compatibility with Next.js App Router `"use server"` conventions and form actions.
- **RESTful API App**: Includes a pluggable Cifer/Hono web app (`app`, `createApp`) for standalone deployments and microservice routes.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/server": "workspace:*"
  }
}
```

---

## Usage

### 1. Server Actions (`@nishchinte/server/actions`)

Import domain actions directly into React Server Components or client event handlers:

```typescript
import { actions } from "@nishchinte/server/actions";

// Product Catalog
const productList = await actions.product.list({
  page: 1,
  limit: 20,
  search: "Shirt",
});

// Category Management
const categoryTree = await actions.product.category.list();

// Coupon Checkout Validation
const couponCheck = await actions.coupon.validate({
  code: "SUMMER20",
  customerPhone: "01712345678",
  cartItems: [
    { productId: "prod_1", price: 1200, quantity: 2 },
  ],
});

// Order Placement (Cash on Delivery)
const newOrder = await actions.order.create({
  customerName: "Rahim Ahmed",
  customerPhone: "01712345678",
  shippingAddress: {
    district: "Dhaka",
    streetAddress: "House 12, Road 4, Banani",
  },
  items: [
    {
      productId: "prod_1",
      quantity: 2,
      unitPrice: 1200,
    },
  ],
  couponCode: "SUMMER20",
});
```

---

### 2. Client Singletons (`@nishchinte/server`)

Access configured email, SMS, storage, and authentication drivers:

```typescript
import { email, sms, storage, auth } from "@nishchinte/server";

// Send transactional SMS
await sms.send({
  to: "01712345678",
  message: "Your OTP is 482910.",
});

// Send transactional Email
await email.send({
  to: "customer@example.com",
  subject: "Order Confirmation",
  html: "<h1>Thank you for your order!</h1>",
});

// Upload media file
const upload = await storage.upload({
  file: imageBuffer,
  filename: "banner.png",
  path: "/banners",
});
```

---

## Action Namespaces Reference

### `actions.product`
- `list(input)`: Search and paginate catalog products.
- `getById(id)` / `getBySlug(slug)`: Fetch detailed product with variants and options.
- `create(input)` / `update(id, input)` / `delete(id)`: Manage product entities.
- `bulkDelete(ids)` / `toggleStatus(id, status)`: Batch and state operations.
- `category.list()` / `category.create()` / `category.update()` / `category.delete()`: Category tree actions.
- `tag.list()` / `tag.create()` / `tag.delete()`: Tag taxonomy actions.

### `actions.coupon`
- `list(input)`: Filter and paginate promotional coupons.
- `create(input)` / `update(id, input)` / `delete(id)`: Coupon lifecycle actions.
- `validate(params)`: Cart discount evaluation during checkout.

### `actions.order`
- `create(input)`: Place orders with inventory deduction and address snapshots.
- `getById(id)`: Order lookup by CUID or readable order number.
- `listMyOrders()`: Customer order history.
- `updateStatus(orderId, status, note)`: Admin status transitions and timeline notes.

### `actions.customer`
- `sendOtp(phone)` / `verifyOtp(phone, code)`: Phone-first passwordless auth.
- `signUp(data)` / `signInPassword(data)` / `signOut()`: Customer identity lifecycle.
- `getProfile()` / `updateProfile(data)`: Profile attributes.
- `addresses.*`: Delivery address CRUD and default designation.
- `identities.*`: Multi-provider account linking and unlinking.

### `actions.admin`
- `setupInitialAdmin(data)`: Initial bootstrap super-admin creation.
- `signIn(credentials)` / `signOut()`: Admin session management.
- `listUser()` / `createUser(data)` / `updateUser(id, data)` / `deleteUser(id)`: Staff and role management.

### `actions.storage`
- `list(input)` / `createFolder(name)` / `upload(formData)`: File management.
- `rename(oldPath, newName)` / `move(paths, target)` / `delete(paths)`: File system operations.

---

## Subpath Exports

| Export Subpath | Import Target | Description |
| :--- | :--- | :--- |
| `@nishchinte/server` | `dist/index.js` | Core server engine, singletons (`email`, `sms`, `storage`, `auth`), and Cifer app. |
| `@nishchinte/server/actions` | `dist/actions/index.js` | Complete Server Actions registry and input/output TypeScript types. |

---

## Related Packages

- [`@nishchinte/db`](file:///mnt/workspace/Git/ecom/packages/db/README.md) - Database schema and Prisma query engine.
- [`@nishchinte/auth`](file:///mnt/workspace/Git/ecom/packages/auth/README.md) - Identity authentication and token sessions.
- [`@nishchinte/storage`](file:///mnt/workspace/Git/ecom/packages/storage/README.md) - Storage drivers for S3, R2, Supabase, and local disk.
- [`@nishchinte/email`](file:///mnt/workspace/Git/ecom/packages/email/README.md) - Email dispatch providers.
- [`@nishchinte/sms`](file:///mnt/workspace/Git/ecom/packages/sms/README.md) - SMS delivery gateways.
