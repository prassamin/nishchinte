# @nishchinte/middleware

Intelligent Next.js Edge / Proxy middleware pipeline for the **Nishchinte** e-commerce platform. Features dynamic plugin discovery, automatic cookie jar synchronization across redirects (solving Next.js lost cookie issues on 3xx responses), and unified header injection.

---

## Features

- **Automatic Plugin Discovery**: Discovers middleware hooks attached to registered plugins (e.g. `@nishchinte/auth`, `@nishchinte/admin-panel`) in `nishchinte.config.ts`.
- **Shared Cookie Jar**: Prevents cookie loss by automatically preserving all `Set-Cookie` headers during redirects (HTTP 301, 302, 307, 308).
- **Sequential Pipeline Composition**: Compose arbitrary middleware functions with `composeMiddlewares` and custom pre/post hooks.
- **Request Context Injection**: Injects origin (`x-origin`), current URL (`x-current-url`), and pathname (`x-current-path`) for instant access in downstream React Server Components.
- **Hot-Reload Aware**: Automatically invalidates and picks up configuration changes in development without restarting Next.js.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/middleware": "workspace:*",
    "@nishchinte/config": "workspace:*"
  },
  "peerDependencies": {
    "next": ">=14.0.0"
  }
}
```

---

## Quick Start

### 1. Root Next.js Middleware (`middleware.ts` or `src/middleware.ts`)

Create `middleware.ts` in your Next.js project root:

```typescript
import config from "./nishchinte.config";
import { createMiddleware } from "@nishchinte/middleware";

export default createMiddleware(config);

export const configMatcher = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, svgs, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---

## Pipeline Customization

You can inject custom pre- or post-middlewares, or customize header forwarding:

```typescript
import config from "./nishchinte.config";
import { createMiddleware } from "@nishchinte/middleware";
import { NextResponse } from "next/server";

export default createMiddleware({
  config,

  // Run before platform plugins
  before: async (req) => {
    console.log(`[Request] ${req.method} ${req.nextUrl.pathname}`);
  },

  // Run after platform plugins
  after: async (req, res) => {
    res.headers.set("x-custom-platform", "nishchinte");
    return res;
  },

  // Enable/disable base header injection (defaults to true)
  baseHeaders: true,
});
```

---

## Architecture & How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      Incoming Request                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Base Headers (x-origin, x-current-url, x-current-path)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Pre-Middlewares (`options.before`)                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Plugin Discovery (`auth.middleware`, `admin.middleware`) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Post-Middlewares (`options.after`)                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Cookie & Header Merger (Preserves Cookies on 3xx Redir)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Forwarded to Next.js App                  │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### `createMiddleware(optionsOrConfig?)`
Creates a Next.js middleware handler. Accepts a configuration object or `CreateMiddlewareOptions`:

| Option | Type | Description |
| :--- | :--- | :--- |
| `config` | `NishchinteConfig \| (() => NishchinteConfig)` | Platform configuration object. |
| `before` | `NishchinteMiddlewareFn \| NishchinteMiddlewareFn[]` | Middleware(s) executed before plugin handlers. |
| `after` | `NishchinteMiddlewareFn \| NishchinteMiddlewareFn[]` | Middleware(s) executed after plugin handlers. |
| `middlewares` | `NishchinteMiddlewareFn[]` | Additional arbitrary middleware handlers. |
| `baseHeaders` | `boolean` | Whether to automatically inject URL/origin headers (default: `true`). |

### `composeMiddlewares(...handlers)`
Low-level composer that sequentially executes an array of middleware functions while preserving headers and cookie jars across redirects.

---

## Related Packages

- [`@nishchinte/config`](file:///mnt/workspace/Git/ecom/packages/config/README.md) - Supplies platform config inspected by the middleware.
- [`@nishchinte/auth`](file:///mnt/workspace/Git/ecom/packages/auth/README.md) - Provides auth session verification middleware.
- [`@nishchinte/admin-panel`](file:///mnt/workspace/Git/ecom/packages/admin-panel/README.md) - Provides admin route protection middleware.
