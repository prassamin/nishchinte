# @nishchinte/auth

JWT-based authentication, password hashing, session management, and multi-channel OTP verification engine for the Nishchinte e-commerce platform.

## Features

- 🔐 **Dual Identity Architecture**: Dedicated, isolated auth tracks for **Admins** (role-based) and **Customers** (storefront).
- 📲 **Multi-Channel OTP Verification**: Universal passwordless authentication supporting SMS and Email OTP dispatch with automatic cooldowns.
- 🔄 **Sliding JWT Sessions**: Secure cookie-based access tokens with automatic rotation and refresh handling.
- 🌐 **Edge & Middleware Ready**: Zero-dependency middleware session extraction, route protection matchers, and header forwarding (`x-user-id`, `x-user-role`).
- ⚛️ **React SDK (`@nishchinte/auth/react`)**: Client-side `<AuthProvider />`, `useAdminAuth()`, and `useCustomerAuth()` hooks with automatic capability discovery.
- 🛡️ **Cryptographic Utilities**: Safe password hashing via `bcryptjs`, tamper-proof OTP HMAC tokens, and jose-based JWT signatures.

## Installation

```bash
# In workspace
pnpm add @nishchinte/auth
```

## Quick Start

### 1. Configuration in `nishchinte.config.ts`

```typescript
import { defineConfig } from "@nishchinte/config";
import { defineJwtAuthConfig } from "@nishchinte/auth";

export default defineConfig({
  auth: defineJwtAuthConfig({
    secret: process.env.AUTH_SECRET!,
    admin: {
      cookieName: "nishchinte_admin_token",
      maxAge: 86400 * 7, // 7 days
    },
    customer: {
      cookieName: "nishchinte_customer_token",
      verification: { required: ["phone"], enforceOnCheckout: true },
    },
    session: {
      accessTokenMaxAge: 900, // 15 mins
    },
  }),
});
```

### 2. Server-Side Authentication (`@nishchinte/auth/server`)

```typescript
import { auth } from "@nishchinte/auth/server";

// Require an authenticated admin in Server Actions or Route Handlers
const currentAdmin = await auth.admin.requireUser();

// Authenticate customer or retrieve current session
const session = await auth.customer.getSession();

// Dispatch OTP (SMS / Email)
const otpRes = await auth.customer.sendOtp({
  identifier: "+8801700000000",
  channel: "SMS",
});

// Verify OTP & issue session
const verifyRes = await auth.customer.verifyOtp({
  identifier: "+8801700000000",
  code: "123456",
});
```

### 3. Client-Side Authentication (`@nishchinte/auth/react`)

Wrap your storefront or admin app with `<AuthProvider>`:

```tsx
import { AuthProvider, useCustomerAuth, useAdminAuth } from "@nishchinte/auth/react";

export function CustomerHeader() {
  const { customer, isAuthenticated, signOut, canSendSmsOtp } = useCustomerAuth();

  if (!isAuthenticated) {
    return <a href="/login">Sign In</a>;
  }

  return (
    <div>
      <span>Welcome, {customer?.name || customer?.phone}</span>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### 4. Edge Middleware Protection (`proxy.ts` / `middleware.ts`)

```typescript
import { updateAuthSession } from "@nishchinte/auth/middleware";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  return await updateAuthSession(req);
}
```

## Subpath Exports

- **`@nishchinte/auth`**: Isomorphic types, JWT/crypto utilities, validation schemas, and cookie helpers.
- **`@nishchinte/auth/server`**: Server-side auth singleton (`auth.admin`, `auth.customer`), DB verification, and session managers.
- **`@nishchinte/auth/react`**: React context provider and client hooks (`useAdminAuth`, `useCustomerAuth`, `useAuth`).
- **`@nishchinte/auth/middleware`**: Edge-compatible route matchers and session cookie refreshers.
