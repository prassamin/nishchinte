"use client";

import type { Dispatch, SetStateAction } from "react";
import { Percent, DollarSign } from "lucide-react";
import { cn } from "@heroui/react";
import { useConfig } from "@nishchinte/config/client";
import type { CouponUpsertFormData } from "../../types";

export function CouponDiscountSection({
  form,
  setForm,
}: {
  form: CouponUpsertFormData;
  setForm: Dispatch<SetStateAction<CouponUpsertFormData>>;
}) {
  const config = useConfig();

  return (
    <div className="space-y-4 border-t border-ap-border/50 pt-5">
      <div>
        <label className="mb-2 block text-[13px] font-medium text-ap-foreground">
          Discount Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: "Percentage",
              value: "PERCENTAGE",
              icon: Percent,
            },
            {
              label: "Fixed Amount",
              value: "FLAT",
              icon: DollarSign,
            },
          ].map(({ label, value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((p) => ({ ...p, type: value as any }))}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                form.type === value
                  ? "border-ap-accent bg-ap-accent/10 text-ap-accent font-semibold shadow-xs"
                  : "border-ap-border bg-ap-field-background/20 text-ap-muted hover:text-ap-foreground hover:bg-ap-field-background/40",
              )}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ap-foreground">
            Discount Value <span className="text-ap-danger">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              max={form.type === "PERCENTAGE" ? "100" : undefined}
              value={form.discountValue}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  discountValue: e.target.value,
                }))
              }
              placeholder={form.type === "PERCENTAGE" ? "20" : "15.00"}
              className="w-full rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 pr-9 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft number-arrow-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ap-muted">
              {form.type === "PERCENTAGE" ? "%" : config.currency.symbol}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-ap-muted">
            {form.type === "PERCENTAGE"
              ? "Percentage off eligible items in the order."
              : "Fixed currency discount deducted from the subtotal."}
          </p>
        </div>

        {form.type === "PERCENTAGE" && (
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ap-foreground">
              Max Discount Cap
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={form.maxDiscountAmount}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  maxDiscountAmount: e.target.value,
                }))
              }
              placeholder="e.g. 50.00"
              className="w-full rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 number-arrow-none focus:ring-ap-accent-soft"
            />
            <p className="mt-1 text-[13px] text-ap-muted">
              Maximum discount amount allowed per order. Leave blank for no cap.
            </p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ap-foreground">
            Min Purchase Amount
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={form.minPurchase}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                minPurchase: e.target.value,
              }))
            }
            placeholder="e.g. 100.00"
            className="w-full rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent number-arrow-none focus:ring-2 focus:ring-ap-accent-soft"
          />
          <p className="mt-1 text-[13px] text-ap-muted">
            Minimum cart subtotal required to apply this coupon. Leave blank for
            no minimum.
          </p>
        </div>
      </div>
    </div>
  );
}
