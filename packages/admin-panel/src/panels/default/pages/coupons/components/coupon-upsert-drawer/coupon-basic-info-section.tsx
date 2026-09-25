"use client";

import type { Dispatch, SetStateAction } from "react";
import { RefreshCcw } from "lucide-react";
import type { CouponUpsertFormData } from "../../types";

export function CouponBasicInfoSection({
  form,
  setForm,
}: {
  form: CouponUpsertFormData;
  setForm: Dispatch<SetStateAction<CouponUpsertFormData>>;
}) {
  function generateRandomCouponCode(length: number = 6): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let random = "";
    for (let i = 0; i < length; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return random;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-ap-foreground">
          Coupon Name <span className="text-ap-danger">*</span>
        </label>
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Summer Mega Sale 20% Off"
          className="w-full rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
        />
        <p className="mt-1 text-[13px] text-ap-muted">
          Campaign name or internal label for this discount.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[13px] font-medium text-ap-foreground">
            Coupon Code <span className="text-ap-danger">*</span>
          </label>
        </div>
        <div className="relative flex items-center">
          <input
            value={form.code}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                code: e.target.value.toUpperCase().replace(/\s+/g, ""),
              }))
            }
            placeholder="e.g. SUMMER20"
            className="w-full font-mono uppercase tracking-wider rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 pr-12 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
          />
          <button
            type="button"
            onClick={() =>
              setForm((p) => ({
                ...p,
                code: generateRandomCouponCode(8),
              }))
            }
            title="Generate random code"
            aria-label="Generate random code"
            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ap-border/60 bg-ap-muted/10 text-ap-muted transition-all hover:bg-ap-muted/20 hover:text-ap-foreground hover:border-ap-border active:scale-95 shadow-xs"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
        <p className="mt-1 text-[13px] text-ap-muted">
          The promo code customers will enter at checkout (e.g. SUMMER20).
        </p>
      </div>
    </div>
  );
}
