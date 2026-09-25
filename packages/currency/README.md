# @nishchinte/currency

Lightweight, zero-dependency ISO currency and country lookup with high-performance financial formatting for the **Nishchinte** e-commerce platform.

---

## Features

- **Complete ISO Currency Database**: Comprehensive database covering ISO 4217 currency codes, symbols, localized names, and country mappings.
- **Fast Lookups**: Case-insensitive $O(1)$ lookups by country name (`getCurrencyByCountry`) or ISO code (`getCurrencyByCode`).
- **Flexible Financial Formatter**: `formatMoney()` handles numbers, strings, BigInts, and Prisma `Decimal` instances with grouping, customizable decimals, symbol positioning, and zero trimming.
- **Curried Formatters**: Create pre-configured formatters via `createCurrencyFormatter()`.
- **Zero Runtime Dependencies**: Works identically across Node.js, Bun, Edge runtime, and browser environments.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/currency": "workspace:*"
  }
}
```

---

## Usage

### 1. Formatting Money (`formatMoney` / `formatCurrency`)

```typescript
import { formatMoney, formatCurrency } from "@nishchinte/currency";

// Basic formatting with currency codes
formatMoney(1250.5, "BDT"); // "৳1,250.50"
formatMoney(100, "USD");    // "$100.00"
formatMoney(99.9, "EUR");   // "€99.90"
formatMoney(5000, "INR");   // "₹5,000.00"

// Custom options
formatMoney(1200, "BDT", { trimZeros: true }); // "৳1,200"
formatMoney(1500.75, "USD", {
  display: "code",        // "USD 1,500.75"
  symbolPosition: "suffix" // "1,500.75 USD"
});

// Negative sign formatting
formatMoney(-45.5, "USD");                          // "-$45.50"
formatMoney(-45.5, "USD", { signDisplay: "parentheses" }); // "($45.50)"
```

### 2. Creating Reusable Formatters (`createCurrencyFormatter`)

```typescript
import { createCurrencyFormatter } from "@nishchinte/currency";

const formatBDT = createCurrencyFormatter("BDT", { trimZeros: true });
const formatUSD = createCurrencyFormatter({ currency: "USD", decimals: 2 });

console.log(formatBDT(2500)); // "৳2,500"
console.log(formatUSD(19.99)); // "$19.99"
```

### 3. Country & Currency Lookups

```typescript
import {
  getCurrencyByCountry,
  getCurrencyByCode,
  hasCountry,
  currencies
} from "@nishchinte/currency";

// Lookup by country
const bdCurrency = getCurrencyByCountry("Bangladesh");
// { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" }

const usCurrency = getCurrencyByCountry("United States");
// { code: "USD", name: "US Dollar", symbol: "$" }

// Lookup by currency code
const inr = getCurrencyByCode("INR");
// { code: "INR", name: "Indian Rupee", symbol: "₹" }

// Country check
hasCountry("Canada"); // true
hasCountry("Atlantis"); // false
```

---

## API Reference

### Functions

| Function | Signature | Description |
| :--- | :--- | :--- |
| `formatMoney` / `formatCurrency` | `(amount: NumericAmount, currency: CurrencyInput, options?: FormatCurrencyCustomOptions) => string` | Formats numeric amount into localized currency string. |
| `createCurrencyFormatter` | `(currency: CurrencyInput, defaultOptions?: FormatCurrencyCustomOptions) => (amount, overrides?) => string` | Creates a pre-configured, reusable formatter. |
| `getCurrencyByCountry` | `(countryName: string) => CurrencyInfo \| null` | Case-insensitive lookup of currency by country name. |
| `getCurrencyByCode` | `(code: string) => CurrencyInfo \| null` | Case-insensitive lookup of currency metadata by ISO code. |
| `hasCountry` | `(countryName: string) => boolean` | Checks whether a country name is supported in the dataset. |
| `parseAmount` | `(amount: NumericAmount) => number` | Safely parses strings, BigInts, and Decimals to finite numbers. |

---

## Related Packages

- [`@nishchinte/config`](file:///mnt/workspace/Git/ecom/packages/config/README.md) - Uses `@nishchinte/currency` to configure store-wide currency settings.
- [`@nishchinte/admin-panel`](file:///mnt/workspace/Git/ecom/packages/admin-panel/README.md) - Formats order totals, pricing, and revenues in dashboard tables.
