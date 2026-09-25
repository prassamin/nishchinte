# ciferjs

A fast, lightweight web framework built on top of [Hono](https://hono.dev/) featuring file-based routing, type-safe context dependency injection, and Next.js-style request/response primitives.

## Features

- ⚡ **Built on Hono**: Ultra-fast routing and middleware execution for Edge and Node.js runtimes.
- 📁 **File-Based Routing**: Auto-discovers and registers route handlers from directory structures using `jiti`.
- 🛠️ **Next.js-Style Primitives**: Provides `CiferRequest`, `CiferResponse`, and `CiferContext` for handling requests and JSON responses with ease.
- 🧩 **Type-Safe Context**: Inject dependencies, configs, and services with full TypeScript inference across handlers.
- ☁️ **Multi-Runtime Deployment**: Compatible with Node.js, Bun, Vercel Serverless (`vercelHandle`), Cloudflare Workers, and Docker.

## Installation

```bash
# In workspace
pnpm add ciferjs
```

## Quick Start

### 1. Basic Server

```typescript
import { createCifer } from "ciferjs";

const app = createCifer();

app.get("/health", (c) => {
  return c.json({ status: "ok", uptime: process.uptime() });
});

export default app;
```

### 2. Defining Routes with `defineRoute`

```typescript
import { defineRoute, CiferResponse } from "ciferjs";

export const GET = defineRoute(async (req, ctx) => {
  return CiferResponse.json({ message: "Hello from Cifer.js" });
});

export const POST = defineRoute(async (req, ctx) => {
  const body = await req.json();
  return CiferResponse.json({ created: true, data: body }, { status: 201 });
});
```

### 3. Vercel / Next.js Serverless Handler

```typescript
import { createCifer, vercelHandle } from "ciferjs";

const app = createCifer();

app.get("/api/hello", (c) => c.text("Hello World"));

export const GET = vercelHandle(app);
export const POST = vercelHandle(app);
```

## Exports

- **Factories**: `createCifer`, `createServer`, `Hono`, `vercelHandle`.
- **Primitives**: `CiferRequest`, `CiferResponse`, `CiferContext`.
- **Helpers**: `defineRoute`.
- **Types**: `CiferApp`, `CiferContextMap`, `CiferOptions`.
