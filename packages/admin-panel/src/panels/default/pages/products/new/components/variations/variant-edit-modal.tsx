"use client";

import { useEffect, useState } from "react";
import { Modal } from "@heroui/react";
import { ProductVariant } from "../../types";
import { QuantityModeInput } from "../quantity-mode-input";
import { useConfig } from "@nishchinte/config/client";

interface VariantEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: ProductVariant | null;
  onSave: (updatedVariant: ProductVariant) => void;
}

export function VariantEditModal({
  isOpen,
  onClose,
  variant,
  onSave,
}: VariantEditModalProps) {
  const { currency } = useConfig();
  const [localVariant, setLocalVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    if (variant) {
      setLocalVariant({
        ...variant,
      });
    }
  }, [variant]);

  if (!localVariant) return null;

  const handleSave = () => {
    onSave(localVariant);
    onClose();
  };

  const optionValues = Object.entries(localVariant.optionValues || {}).map(
    ([name, value]) => `${name}: ${value}`,
  );

  const sellingPrice = Number(localVariant.price || 0);
  const costPrice = Number(localVariant.costPrice || 0);
  const hasValidPricing =
    sellingPrice > 0 &&
    localVariant.costPrice !== undefined &&
    localVariant.costPrice !== "";

  const grossProfit = sellingPrice - costPrice;
  const marginPercent =
    sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => !open && onClose()}
      >
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger />

            <Modal.Header className="mb-1">
              <div className="flex flex-col gap-1">
                <Modal.Heading>Edit Variant</Modal.Heading>
                <p className="text-sm text-ap-muted">
                  {optionValues.length > 0
                    ? optionValues.join(" • ")
                    : localVariant.title}
                </p>
              </div>
            </Modal.Header>

            <Modal.Body>
              <div className="space-y-5">
                {/* Pricing */}
                <section className="rounded-2xl border border-ap-border bg-ap-surface p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ap-foreground">
                      Pricing
                    </h3>
                    <p className="text-xs text-ap-muted mt-1">
                      Set selling price and cost price to track profitability.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-ap-muted">
                        Selling Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ap-muted font-medium text-[13px]">
                          {currency.symbol}
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={localVariant.price}
                          onChange={(e) =>
                            setLocalVariant({
                              ...localVariant,
                              price: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 rounded-xl border border-ap-border bg-ap-field-background text-sm text-ap-foreground placeholder:text-ap-muted/60 outline-none transition focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-ap-muted">
                        Cost Price{" "}
                        <span className="text-ap-muted">
                          (Customers won&apos;t see this)
                        </span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ap-muted font-medium text-[13px]">
                          {currency.symbol}
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={localVariant.costPrice || ""}
                          onChange={(e) =>
                            setLocalVariant({
                              ...localVariant,
                              costPrice: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 rounded-xl border border-ap-border bg-ap-field-background text-sm text-ap-foreground placeholder:text-ap-muted/60 outline-none transition focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-ap-border bg-ap-field-background p-3">
                    <div className="grid grid-cols-2 gap-2 text-[13px]">
                      <div>
                        <p className="text-ap-muted">Selling Price</p>
                        <p className="font-semibold text-ap-foreground">
                          {currency.symbol}
                          {sellingPrice.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-ap-muted">Cost Price</p>
                        <p className="font-semibold text-ap-foreground">
                          {currency.symbol}
                          {costPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {hasValidPricing ? (
                      <div className="mt-3 border-t border-ap-border pt-3 grid grid-cols-2 gap-2 text-[13px]">
                        <div>
                          <p className="text-ap-muted">Gross Profit</p>
                          <p
                            className={`font-semibold ${grossProfit >= 0 ? "text-ap-success" : "text-ap-danger"}`}
                          >
                            {currency.symbol}
                            {grossProfit.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-ap-muted">Margin</p>
                          <p
                            className={`font-semibold ${marginPercent >= 0 ? "text-ap-success" : "text-ap-danger"}`}
                          >
                            {marginPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-ap-muted">
                        Enter both selling price and cost price to see profit
                        margin.
                      </p>
                    )}

                    {hasValidPricing && grossProfit < 0 ? (
                      <p className="mt-2 text-xs text-ap-danger">
                        Warning: This variant is priced below cost.
                      </p>
                    ) : null}
                  </div>
                </section>

                {/* Inventory */}
                <section className="rounded-2xl border border-ap-border bg-ap-surface p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-ap-foreground">
                      Inventory
                    </h3>
                    <p className="text-xs text-ap-muted mt-1">
                      Manage SKU, barcode, and variant stock.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-ap-muted">
                        SKU (Stock Keeping Unit)
                      </label>
                      <input
                        type="text"
                        value={localVariant.sku || ""}
                        onChange={(e) =>
                          setLocalVariant({
                            ...localVariant,
                            sku: e.target.value,
                          })
                        }
                        placeholder="e.g. VAR-001"
                        className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3 py-2 font-mono text-sm text-ap-foreground placeholder:text-ap-muted/60 outline-none transition focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-ap-muted">
                        Barcode (ISBN, UPC, GTIN, etc.)
                      </label>
                      <input
                        type="text"
                        value={localVariant.barcode || ""}
                        onChange={(e) =>
                          setLocalVariant({
                            ...localVariant,
                            barcode: e.target.value,
                          })
                        }
                        placeholder="e.g. 123456789"
                        className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3 py-2 font-mono text-sm text-ap-foreground placeholder:text-ap-muted/60 outline-none transition focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-ap-border space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-ap-foreground">
                        Stock Quantity
                      </h4>
                      <p className="text-xs text-ap-muted mt-1">
                        Enter a quantity number or set variant to unlimited
                        stock.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-ap-muted mb-1.5 block">
                        Total Quantity
                      </label>
                      <QuantityModeInput
                        value={localVariant.inventoryQuantity}
                        onChange={(inventoryQuantity) =>
                          setLocalVariant({
                            ...localVariant,
                            inventoryQuantity,
                          })
                        }
                      />
                    </div>
                  </div>
                </section>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-ap-border bg-ap-surface px-4 py-2 text-sm font-medium text-ap-foreground transition-colors hover:bg-ap-field-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-ap-accent px-4 py-2 text-sm font-semibold text-ap-accent-foreground transition-opacity hover:opacity-90"
              >
                Done
              </button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
