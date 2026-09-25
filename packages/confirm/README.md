# @nishchinte/confirm

Promise-based confirmation modal dialog system for React and HeroUI in the **Nishchinte** e-commerce platform. It replaces imperative `window.confirm` alerts with accessible, smooth animated modals supporting async execution, loading states, and destructive danger styling.

---

## Features

- **Promise-Based API**: Call `const confirmed = await confirm({...})` imperatively from any React event handler.
- **HeroUI Integration**: Seamlessly matches HeroUI components, styles, and color themes.
- **Async Execution & Loading States**: Automatic loading spinner disabling buttons while an `onConfirm` promise resolves.
- **Danger & Destructive Modes**: Custom danger variants with warning iconography and red action buttons for deletions.
- **Standalone Styles**: Bundles self-contained CSS styles (`@nishchinte/confirm/dist/index.css`) compatible with Tailwind CSS v4.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/confirm": "workspace:*",
    "@heroui/react": "^3.2.5"
  }
}
```

---

## Quick Start

### 1. Setup `<ConfirmProvider>`

Wrap your application tree or layout with `<ConfirmProvider>`:

```tsx
// app/providers.tsx or app/layout.tsx
import { ConfirmProvider } from "@nishchinte/confirm";
import "@nishchinte/confirm/dist/index.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      {children}
    </ConfirmProvider>
  );
}
```

### 2. Trigger Confirmations via `useConfirm()`

Use the `useConfirm` hook in any client component:

```tsx
"use client";

import { useConfirm } from "@nishchinte/confirm";

export function DeleteProductButton({ productId }: { productId: string }) {
  const { confirm } = useConfirm();

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: "Delete Product?",
      description: "This action cannot be undone. All variants and images will be permanently removed.",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      isDanger: true,
      onConfirm: async () => {
        // Automatically manages loading spinner while running
        await deleteProductAction(productId);
      },
    });

    if (isConfirmed) {
      console.log("Product deleted successfully");
    }
  };

  return (
    <button onClick={handleDelete} className="text-danger">
      Delete Product
    </button>
  );
}
```

---

## Direct Component Usage (`<ConfirmModal>`)

For declarative controlled modal instances:

```tsx
import { ConfirmModal } from "@nishchinte/confirm";

export function ControlledDialog({ isOpen, onClose, onDelete }) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onDelete}
      title="Revoke API Key"
      description="Existing integrations using this key will immediately lose access."
      confirmText="Revoke"
      cancelText="Keep Key"
      isDanger={true}
    />
  );
}
```

---

## API Reference

### `useConfirm()` Hook

Returns an object with:
- `confirm(options: ConfirmOptions): Promise<boolean>`: Triggers the modal dialog and returns a Promise resolving `true` when confirmed or `false` when cancelled/closed.
- `isLoading: boolean`: Indicates whether the active confirmation callback is running.
- `setIsLoading(loading: boolean): void`: Manually update modal loading state.

### `ConfirmOptions`

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | **Required** | Modal dialog header text. |
| `description` | `string` | **Required** | Detailed explanation or body prompt. |
| `confirmText` | `string` | `"নিশ্চিত করুন"` | Confirmation button label. |
| `cancelText` | `string` | `"বাতিল"` | Cancellation button label. |
| `isDanger` | `boolean` | `false` | Sets destructive red theme and alert styling. |
| `onConfirm` | `() => Promise<void> \| void` | `undefined` | Async or sync callback executed upon user confirmation. |
| `onCancel` | `() => void` | `undefined` | Callback invoked when cancelled or dismissed. |

---

## Related Packages

- [`@nishchinte/admin-panel`](file:///mnt/workspace/Git/ecom/packages/admin-panel/README.md) - Admin UI with built-in delete and status confirmation modals.
