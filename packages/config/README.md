# @nishchinte/config

Central configuration system and runtime loader for the **Nishchinte** e-commerce platform. It powers type-safe schema definitions via `defineConfig()`, synchronous/asynchronous server runtime access via `getConfig()`, and React client context hydration via `<ConfigProvider>` and `useConfig()`.

---

## Features

- **Strict Type Safety**: Fully typed configuration schema with IDE autocomplete and JSDoc annotations via `defineConfig()`.
- **Zero-Config Discovery**: Automatic multi-directory file search (`nishchinte.config.ts`, `nishchinte.config.mjs`, `nishchinte.config.js`).
- **Server/Client Boundary Separation**: Automatic filtering and sanitization through `getClientConfig()` so sensitive server secrets are never leaked to the client bundle.
- **React Hydration**: React 19 / Next.js ready `<ConfigProvider>` and `useConfig()` hook for instant client-side access to store currency, URLs, upload limits, and feature flags.
- **Pluggable Architecture**: Native integration with `@nishchinte/auth`, `@nishchinte/storage`, `@nishchinte/email`, `@nishchinte/sms`, `@nishchinte/realtime`, and `@nishchinte/currency`.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/config": "workspace:*"
  }
}
```

---

## Configuration File Example

Create `nishchinte.config.ts` in your project root:

```typescript
import { defineConfig } from "@nishchinte/config";
import { resendEmail } from "@nishchinte/email";
import { zendSms } from "@nishchinte/sms";
import { localStorage } from "@nishchinte/storage";
import { defaultAdminPanel } from "@nishchinte/admin-panel";

export default defineConfig({
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  currency: "BDT",
  fileSizeLimit: "10MB",
  videoAllowed: true,

  database: {
    url: process.env.DATABASE_URL,
  },

  auth: {
    secret: process.env.AUTH_SECRET,
    customer: {
      mode: "hybrid", // "authless" | "auth" | "hybrid"
      verification: {
        required: ["phone"],
        enforceOnCheckout: true,
      },
    },
  },

  email: resendEmail({
    apiKey: process.env.RESEND_API_KEY!,
    from: "Store <noreply@example.com>",
  }),

  sms: zendSms({
    apiKey: process.env.SMS_API_KEY!,
    senderId: process.env.SMS_SENDER_ID!,
  }),

  storage: localStorage({
    basePath: "./public/uploads",
    publicPath: "/uploads",
  }),

  adminPanel: defaultAdminPanel({
    basePath: "/admin",
  }),

  // Custom client-accessible variables
  client: {
    storeName: "Nishchinte Store",
    supportEmail: "support@nishchinte.local",
  },
});
```

---

## Usage

### 1. Server-Side Usage (`@nishchinte/config`)

Import `getConfig()` or `getClientConfig()` in Server Components, API routes, or Server Actions:

```typescript
import { getConfig, getClientConfig } from "@nishchinte/config";

// Read complete server configuration (including database, secrets, and plugins)
const config = getConfig();
console.log("Database URL:", config.database?.url);
console.log("Base URL:", config.baseUrl);
console.log("Currency:", config.currency.symbol);

// Generate sanitized client-safe configuration
const clientSafeConfig = getClientConfig();
```

### 2. Client-Side React Hydration (`@nishchinte/config/client` or `@nishchinte/config/react`)

Pass the client config from your Root Layout to client components:

```tsx
// app/layout.tsx (Server Component)
import { getClientConfig } from "@nishchinte/config";
import { ConfigProvider } from "@nishchinte/config/client";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clientConfig = getClientConfig();

  return (
    <html lang="en">
      <body>
        <ConfigProvider value={clientConfig}>
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
```

Access store config anywhere in Client Components:

```tsx
"use client";

import { useConfig } from "@nishchinte/config/client";

export function StoreBadge() {
  const config = useConfig();

  return (
    <div>
      <span>Currency: {config.currency.code} ({config.currency.symbol})</span>
      <span>Max Upload: {(config.fileSizeLimit / (1024 * 1024)).toFixed(0)} MB</span>
    </div>
  );
}
```

---

## Exports

| Subpath | Target | Description |
| :--- | :--- | :--- |
| `@nishchinte/config` | `dist/index.js` | Server configuration tools (`defineConfig`, `getConfig`, `getClientConfig`, `loadConfig`). |
| `@nishchinte/config/client` | `dist/client.js` | Client React components and hooks (`ConfigProvider`, `useConfig`). |
| `@nishchinte/config/react` | `dist/client.js` | Alias for `@nishchinte/config/client`. |

---

## Related Packages

- [`@nishchinte/auth`](file:///mnt/workspace/Git/ecom/packages/auth/README.md) - Authentication plugins and sessions.
- [`@nishchinte/currency`](file:///mnt/workspace/Git/ecom/packages/currency/README.md) - ISO currency definitions and formatting utilities.
- [`@nishchinte/storage`](file:///mnt/workspace/Git/ecom/packages/storage/README.md) - File and cloud storage driver plugins.
- [`@nishchinte/email`](file:///mnt/workspace/Git/ecom/packages/email/README.md) - Email transport plugins.
- [`@nishchinte/sms`](file:///mnt/workspace/Git/ecom/packages/sms/README.md) - SMS gateway plugins.
- [`@nishchinte/admin-panel`](file:///mnt/workspace/Git/ecom/packages/admin-panel/README.md) - Turnkey admin panel and CMS views.
