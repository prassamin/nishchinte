# @nishchinte/utils

Universal utilities for URL slug generation, category hierarchy tree traversal, Markdown parsing, file size formatting, avatar hashing, and route matching across the **Nishchinte** e-commerce platform.

---

## Features

- **Category Hierarchy & Tree Algorithms**:
  - `buildCategoryTree`: $O(N)$ tree construction with cumulative product counts and depth levels.
  - `findCategoryPath`: Breadcrumb trail finder from root to any selected category.
  - `getDescendantCategoryIds`: BFS/DFS circular relationship prevention for parent selection dropdowns.
  - `flattenCategoryTree`: Flat indented representation for select options.
- **Hierarchical URL Slugs**:
  - `slugify`: Unicode accent normalization and character cleaning (`"Men's Casual Shirt"` -> `"mens-casual-shirt"`).
  - `slugifyPath`, `getLeafSegment`, `getParentPath`, `buildHierarchicalSlug`: Seamless multi-level slug construction (`"tshirt/men/summer"`).
- **Formatters**:
  - `toHumanSize`: Converts raw bytes into formatted strings (`"5 MB"`, `"1.25 GB"`).
  - `truncateText`: Smart string truncation with ellipsis.
  - `markdownToPlain`: GFM Markdown and HTML stripper for meta description generation and plain text search indexers.
- **Avatar & Identity Generation**:
  - `getAvatarSync` / `getAvatarSeed`: Deterministic SVG avatar placeholder generator URLs.
- **Routing & Execution**:
  - `createRouteMatcher`: Fast pattern matching for Next.js routes and edge middleware.
  - `debounce`: Type-safe standard function debouncer.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/utils": "workspace:*"
  }
}
```

---

## Usage

### 1. Category Tree Utilities

```typescript
import {
  buildCategoryTree,
  findCategoryPath,
  getDescendantCategoryIds,
  flattenCategoryTree
} from "@nishchinte/utils";

// Convert flat Prisma category records into a nested tree
const tree = buildCategoryTree(rawCategories);

// Get breadcrumb trail
const breadcrumbs = findCategoryPath(rawCategories, "category_id_123");
// Output: [{ name: "Clothing", slug: "clothing" }, { name: "Men", slug: "clothing/men" }]

// Prevent selecting own descendants when editing parent
const disabledCategoryIds = getDescendantCategoryIds(rawCategories, "selected_id");

// Flatten with visual indentation for select inputs
const selectOptions = flattenCategoryTree(tree, "— ");
```

---

### 2. URL & Slug Utilities

```typescript
import {
  slugify,
  slugifyPath,
  getLeafSegment,
  getParentPath,
  buildHierarchicalSlug
} from "@nishchinte/utils";

// Standard slug
slugify("Men's Polo T-Shirt - Blue"); // "mens-polo-t-shirt-blue"

// Multi-segment category paths
slugifyPath("Men's Wear / Summer Collection"); // "mens-wear/summer-collection"

// Extract segments
getLeafSegment("clothing/men/t-shirt"); // "t-shirt"
getParentPath("clothing/men/t-shirt");  // "clothing/men"

// Construct hierarchical path
buildHierarchicalSlug("clothing/men", "polo"); // "clothing/men/polo"
```

---

### 3. Formatting & Markdown Parsing

```typescript
import { toHumanSize, truncateText, markdownToPlain } from "@nishchinte/utils";

// Human-readable sizes
toHumanSize(5242880);     // "5 MB"
toHumanSize(1073741824);  // "1 GB"

// Truncate text
truncateText("This is a long product description for store catalog", 25);
// "This is a long prod..."

// Strip markdown for SEO meta description
const plain = markdownToPlain("# Title\n\n**Bold text** with [link](https://example.com)");
// "Title\n\nBold text with link"
```

---

### 4. Avatar & Identity Helpers

```typescript
import { getAvatarSync, getAvatarSeed } from "@nishchinte/utils";

const avatarUrl = getAvatarSync({
  id: "cust_123",
  name: "Rahim Ahmed",
  email: "rahim@example.com"
});
// "/api/v1/avatar?seed=cust_123-rahim%40example.com-Rahim%20Ahmed"
```

---

## API Reference

### Category Functions

| Function | Parameters | Returns | Description |
| :--- | :--- | :--- | :--- |
| `buildCategoryTree(categories)` | `T[]` | `CategoryTreeNode<T>[]` | Builds hierarchical category tree. |
| `findCategoryPath(categories, idOrSlug)` | `T[], string?` | `Array<{ id, name, slug }>` | Breadcrumb path finder. |
| `getDescendantCategoryIds(categories, id)` | `T[], string?` | `Set<string>` | Set of category ID and all its descendants. |
| `flattenCategoryTree(tree, indentChar)` | `CategoryTreeNode<T>[], string?` | `Array<{ id, name, displayName, depth }>` | Flattens tree with indentation. |

### Text & Slug Functions

| Function | Parameters | Returns | Description |
| :--- | :--- | :--- | :--- |
| `slugify(text, options?)` | `string, SlugifyOptions?` | `string` | Converts string to URL-safe slug. |
| `slugifyPath(path)` | `string` | `string` | Slugifies each segment in slash path. |
| `getLeafSegment(path)` | `string` | `string` | Extracts final leaf segment. |
| `getParentPath(path)` | `string` | `string` | Extracts parent path segments. |
| `buildHierarchicalSlug(parent, leaf)` | `string?, string?` | `string` | Combines parent and leaf into slug. |
| `toHumanSize(bytes, decimals?)` | `number, number?` | `string` | Formats byte count to KB, MB, GB. |
| `truncateText(str, max, suffix?)` | `string, number, string?` | `string` | Truncates text with ellipsis. |
| `markdownToPlain(md, options?)` | `string, MarkdownToPlainOptions?` | `string` | Strips Markdown/HTML tags. |
| `createRouteMatcher(patterns)` | `string[]` | `(pathname: string) => boolean` | Next.js route path matcher. |
| `debounce(fn, wait)` | `Function, number` | `Function` | Standard debounce wrapper. |

---

## Related Packages

- [`@nishchinte/admin-panel`](file:///mnt/workspace/Git/ecom/packages/admin-panel/README.md) - Uses category tree and slug helpers in category & product forms.
- [`@nishchinte/server`](file:///mnt/workspace/Git/ecom/packages/server/README.md) - Generates SEO entries and handles hierarchical category queries.
