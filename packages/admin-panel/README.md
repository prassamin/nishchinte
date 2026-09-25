# @nishchinte/admin-panel

Pluggable, modular, and extensible Admin Panel engine for the Nishchinte e-commerce platform.

## Features

- ⚡ **Pluggable Panels**: Switch or customize panels seamlessly via `nishchinte.config.ts` using `defaultAdminPanel()`.
- 🔀 **Next.js App Router Catch-All Integration**: Single dynamic route (`/admin/[[...slug]]/page.tsx`) handles routing, SSR metadata, layouts, and sub-pages.
- 📦 **Built-in Management Views**:
  - **Products & Variants**: Complex variation matrix, SKU management, pricing, inventory tracking, and rich media gallery.
  - **Hierarchical Categories**: Arbitrary depth subcategories, tree visualization, sibling uniqueness, and cascading slug updates.
  - **Orders & Fulfillment**: Order status pipelines, line items, customer details, and shipping address management.
  - **Discount Coupons**: Fixed/percentage discounts, minimum spend rules, date ranges, and customer usage limits.
  - **Content & Media Library**: Multi-file drag-and-drop upload, folder organization, image preview, and asset selection modals.
  - **Team & Permissions**: Role-based access control, team member invites, and security settings.
- 🎨 **HeroUI & Tailwind CSS v4**: Modern, responsive dashboard design with full light and dark mode theming support.
- 🔒 **Role-Based Protection**: Automatic server-side authentication and admin verification.

## Installation

```bash
# In workspace
pnpm add @nishchinte/admin-panel
```

## Quick Start

### 1. Enable in `nishchinte.config.ts`

```typescript
import { defineConfig } from "@nishchinte/config";
import { defaultAdminPanel } from "@nishchinte/admin-panel/plugins";

export default defineConfig({
  adminPanel: defaultAdminPanel(),
  // ...other configurations
});
```

### 2. Mount in Next.js App Router (`app/admin/[[...slug]]/page.tsx`)

```tsx
import { AdminPanel, resolveMetadata } from "@nishchinte/admin-panel";
import type { Metadata } from "next";

interface AdminPageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
  searchParams,
}: AdminPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return resolveMetadata({
    path: resolvedParams?.slug ?? "",
    searchParams: resolvedSearchParams,
    fallbackTitle: "Admin Panel",
  });
}

export default async function AdminPanelPage({
  params,
  searchParams,
}: AdminPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <AdminPanel
      path={resolvedParams?.slug ?? ""}
      searchParams={resolvedSearchParams}
    />
  );
}
```

### 3. Mount Admin Layout (`app/admin/layout.tsx`)

```tsx
import { AdminLayout } from "@nishchinte/admin-panel";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
```

### 4. Import Stylesheet in `globals.css`

```css
@import "tailwindcss";
@import "@heroui/styles";
@import "@nishchinte/admin-panel";
```

## Architecture & Exports

- **`AdminPanel`**: Server Component router that resolves paths and renders matching views.
- **`AdminLayout`**: Top-level layout container providing workspace sidebar, header, and user context.
- **`AdminPanelProvider`**: Client context provider wrapping admin queries, progress bars, and toast notifications.
- **`resolveMetadata`**: Helper function to dynamically generate page titles and SEO metadata.
- **`defaultAdminPanel()`**: Plugin definition exported from `@nishchinte/admin-panel/plugins`.
