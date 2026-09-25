# @nishchinte/hooks

Collection of specialized React hooks for the **Nishchinte** e-commerce platform. Provides unified access to client configuration, localized currency formatting, debounced input states, and responsive media query breakpoint detection.

---

## Features

- **Storefront Context Hook (`useNishchinte`)**: Combines client configuration access (`useConfig`) with pre-configured store currency formatting (`formatMoney`).
- **Debounced Values (`useDebounce`)**: Smooth input debouncing for search bars, filters, and autosave forms.
- **Responsive Detection (`useIsMobile`)**: Real-time responsive layout listener based on `window.matchMedia`.
- **Client-Side Optimized**: Lightweight, tree-shakeable, and fully compatible with React 19 / Next.js App Router client components.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/hooks": "workspace:*",
    "@nishchinte/config": "workspace:*",
    "@nishchinte/currency": "workspace:*"
  }
}
```

---

## Quick Start & Usage

### 1. `useNishchinte()`

The primary storefront hook. Must be used within a `<ConfigProvider>`.

```tsx
"use client";

import { useNishchinte } from "@nishchinte/hooks";

export function ProductPriceDisplay({ price }: { price: number }) {
  const { config, formatMoney } = useNishchinte();

  return (
    <div className="product-meta">
      <span className="price">{formatMoney(price)}</span>
      <span className="store-name">{config.storeName as string}</span>
    </div>
  );
}
```

### 2. `useDebounce(value, delay)`

Debounces any reactive state value across user inputs.

```tsx
"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "@nishchinte/hooks";

export function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  return (
    <input
      type="text"
      placeholder="Search products..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  );
}
```

### 3. `useIsMobile(options?)`

Listens to viewport changes with `matchMedia` for clean conditional rendering.

```tsx
"use client";

import { useIsMobile } from "@nishchinte/hooks";

export function Navigation() {
  const isMobile = useIsMobile({ mobileBreakpoint: 768 });

  return isMobile ? <MobileDrawerMenu /> : <DesktopNavbar />;
}
```

---

## API Reference

| Hook | Parameters | Returns | Description |
| :--- | :--- | :--- | :--- |
| `useNishchinte()` | None | `{ config: ClientConfig, formatMoney: (amount, options?) => string }` | Accesses active store config and currency formatter. |
| `useDebounce<T>()` | `value: T, delay: number = 300` | `T` | Returns debounced state value after delay milliseconds. |
| `useIsMobile()` | `{ mobileBreakpoint?: number }` | `boolean` | `true` when viewport width is below breakpoint (default `768px`). |

---

## Related Packages

- [`@nishchinte/config`](file:///mnt/workspace/Git/ecom/packages/config/README.md) - Supplies the underlying `<ConfigProvider>`.
- [`@nishchinte/currency`](file:///mnt/workspace/Git/ecom/packages/currency/README.md) - Powers the `formatMoney` utility.
