"use client";

import { TicketPercent, Plus } from "lucide-react";

interface CouponsHeaderProps {
  onNewCoupon: () => void;
}

export function CouponsHeader({ onNewCoupon }: CouponsHeaderProps) {
  return (
    <div className="mb-6 rounded-2xl border border-ap-border bg-ap-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2.5 text-ap-foreground">
          <TicketPercent size={18} className="text-ap-muted" />
          <h1 className="text-[22px] leading-none font-bold">Coupons</h1>
        </div>

        <button
          type="button"
          onClick={onNewCoupon}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ap-accent px-3 py-1.5 text-xs font-semibold text-ap-accent-foreground transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          New Coupon
        </button>
      </div>
    </div>
  );
}
