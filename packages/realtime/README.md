# @nishchinte/realtime

High-performance Realtime event broadcasting, Prisma Change Data Capture (CDC), Server-Sent Events (SSE), and outgoing Webhook dispatching system for the **Nishchinte** e-commerce platform.

---

## Features

- **Prisma CDC Extension**: Transparently captures database mutations (`create`, `update`, `delete`, `upsert`) directly inside Prisma queries with zero external triggers.
- **Server-Sent Events (SSE)**: Built-in HTTP SSE endpoint streaming live database events to browsers and client apps.
- **Pluggable Event Bus**: In-memory event bus with pub/sub architecture (extendable to Redis).
- **React Hooks & Provider**: `<RealtimeProvider>` and `useRealtimeSubscription()` for live UI synchronization.
- **HMAC Signed Webhooks**: Dispatches secure, retryable webhook payloads with HMAC SHA-256 signatures to third-party endpoints.
- **Table & Operation Filters**: Subscribe specifically to `INSERT`, `UPDATE`, `DELETE`, or `*` on specific tables or column conditions.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/realtime": "workspace:*",
    "@nishchinte/config": "workspace:*"
  }
}
```

---

## Configuration (`nishchinte.config.ts`)

Enable realtime CDC and webhooks in your root configuration:

```typescript
import { defineConfig } from "@nishchinte/config";
import { realtime, webhooks } from "@nishchinte/realtime";

export default defineConfig({
  // Realtime SSE Configuration
  realtime: realtime({
    enabled: true,
    tables: ["Order", "Product", "Customer"],
  }),

  // Outbound Webhooks Configuration
  webhooks: webhooks({
    enabled: true,
    endpoints: [
      {
        id: "warehouse-sync",
        url: "https://warehouse.example.com/api/orders",
        secret: process.env.WEBHOOK_SECRET!,
        tables: ["Order"],
        events: ["INSERT", "UPDATE"],
      },
    ],
  }),
});
```

---

## Usage

### 1. Server-Side SSE Route (`app/api/realtime/sse/route.ts`)

Create a standard Next.js route handler streaming events via SSE:

```typescript
import { createRealtimeSSEResponse } from "@nishchinte/realtime/server";

export async function GET(request: Request) {
  return createRealtimeSSEResponse(request);
}
```

### 2. Client-Side React Integration (`@nishchinte/realtime/react`)

Wrap your application in `<RealtimeProvider>`:

```tsx
// app/providers.tsx
"use client";

import { RealtimeProvider } from "@nishchinte/realtime/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider ssePath="/api/realtime/sse">
      {children}
    </RealtimeProvider>
  );
}
```

Subscribe to real-time mutations in components:

```tsx
"use client";

import { useRealtimeSubscription } from "@nishchinte/realtime/react";

export function LiveOrderTracker({ onOrderCreated }: { onOrderCreated: () => void }) {
  // Listen for new orders inserted in the database
  useRealtimeSubscription("Order", "INSERT", (payload) => {
    console.log("New order placed:", payload.record);
    onOrderCreated();
  });

  // Listen for specific order updates
  useRealtimeSubscription(
    "Order",
    "UPDATE",
    (payload) => {
      console.log("Order status changed:", payload.record);
    },
    { column: "id", operator: "eq", value: "order_123" }
  );

  return <div>Listening for live updates...</div>;
}
```

### 3. Webhook Dispatching & Verification (`@nishchinte/realtime`)

Verify incoming signatures on webhook recipient servers:

```typescript
import { verifyWebhookSignature } from "@nishchinte/realtime";

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("x-signature-256") || "";
  const secret = process.env.WEBHOOK_SECRET!;

  const isValid = verifyWebhookSignature(payload, signature, secret);

  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const data = JSON.parse(payload);
  console.log("Verified webhook received:", data.event, data.record);

  return new Response("OK", { status: 200 });
}
```

---

## Subpath Exports

| Export Subpath | Import Target | Description |
| :--- | :--- | :--- |
| `@nishchinte/realtime` | `dist/index.mjs` | Core event bus, config definitions, Prisma CDC extension, webhook dispatcher. |
| `@nishchinte/realtime/server` | `dist/server/index.mjs` | Server-Sent Events (SSE) route creators (`createRealtimeSSEResponse`). |
| `@nishchinte/realtime/client` | `dist/client/index.mjs` | Vanilla JS / TS SSE client and channel multiplexer. |
| `@nishchinte/realtime/react` | `dist/react/index.mjs` | React Provider (`RealtimeProvider`) and hooks (`useRealtimeSubscription`). |

---

## Related Packages

- [`@nishchinte/db`](file:///mnt/workspace/Git/ecom/packages/db/README.md) - Attaches the Prisma CDC extension during database client initialization.
- [`@nishchinte/config`](file:///mnt/workspace/Git/ecom/packages/config/README.md) - Defines types and schemas for realtime and webhook options.
