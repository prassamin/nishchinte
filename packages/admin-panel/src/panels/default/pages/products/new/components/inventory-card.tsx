"use client";

import { ProductFormData } from "../types";
import { QuantityModeInput } from "./quantity-mode-input";

export function InventoryCard({
  formData,
  updateFormData,
}: {
  formData: ProductFormData;
  updateFormData: (updates: Partial<ProductFormData>) => void;
}) {
  const hasVariants = formData.variants.length > 0;

  const hasUnlimitedVariant = formData.variants.some(
    (variant) => variant.inventoryQuantity === -1,
  );

  const totalVariantInventory = hasUnlimitedVariant
    ? -1
    : formData.variants.reduce(
        (sum, variant) => sum + Math.max(0, variant.inventoryQuantity || 0),
        0,
      );

  return (
    <section className="rounded-2xl border border-ap-border bg-ap-surface p-5 shadow-sm flex flex-col gap-6">
      <div>
        <h2 className="text-[15px] font-bold text-ap-foreground mb-4">
          Inventory
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[13px] font-medium text-ap-foreground mb-1.5 block">
              SKU (Stock Keeping Unit)
            </label>
            <input
              type="text"
              value={formData.sku || ""}
              onChange={(e) => updateFormData({ sku: e.target.value })}
              placeholder="e.g. TSHIRT-BLK-M"
              className="w-full px-3 py-2 border border-ap-border rounded-xl text-[14px] focus:ring-2 focus:ring-ap-accent-soft focus:border-ap-accent outline-none transition-all shadow-sm text-ap-foreground placeholder:text-ap-muted/60"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-ap-foreground mb-1.5 block">
              Barcode (ISBN, UPC, GTIN, etc.)
            </label>
            <input
              type="text"
              value={formData.barcode || ""}
              onChange={(e) => updateFormData({ barcode: e.target.value })}
              placeholder="e.g. 123456789012"
              className="w-full px-3 py-2 border border-ap-border rounded-xl text-[14px] focus:ring-2 focus:ring-ap-accent-soft focus:border-ap-accent outline-none transition-all shadow-sm text-ap-foreground placeholder:text-ap-muted/60"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-ap-border">
        {hasVariants ? (
          <div className="rounded-xl border border-ap-border p-4 bg-ap-field-background/50 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-[14px] font-semibold text-ap-foreground">
                  Inventory managed by variants
                </h3>
                <p className="text-[13px] text-ap-muted">
                  Total inventory stock is automatically calculated across all
                  active variants.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-ap-muted">Total Available</p>
                <p className="text-[15px] font-bold text-ap-foreground">
                  {totalVariantInventory === -1
                    ? "Unlimited"
                    : `${totalVariantInventory} units in stock`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-ap-border p-4 bg-ap-field-background/50 shadow-sm space-y-3">
            <div>
              <h3 className="text-[14px] font-semibold text-ap-foreground">
                Stock Quantity
              </h3>
              <p className="text-[13px] text-ap-muted mt-1">
                Enter available stock or set inventory mode to unlimited.
              </p>
            </div>

            <div>
              <label className="text-[13px] font-medium text-ap-foreground mb-1.5 block">
                Total Quantity
              </label>
              <QuantityModeInput
                value={formData.inventoryQuantity}
                onChange={(inventoryQuantity) =>
                  updateFormData({ inventoryQuantity })
                }
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
