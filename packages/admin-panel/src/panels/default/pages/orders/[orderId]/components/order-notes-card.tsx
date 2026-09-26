"use client";

import { FileText } from "lucide-react";
import type { OrderSummaryItem } from "@nishchinte/server/actions";

interface OrderNotesCardProps {
  order: OrderSummaryItem;
  adminNotes: string;
  onAdminNotesChange: (val: string) => void;
}

export function OrderNotesCard({
  order,
  adminNotes,
  onAdminNotesChange,
}: OrderNotesCardProps) {
  return (
    <div className="rounded-2xl border border-ap-border bg-ap-surface p-5 space-y-4">
      <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
        <FileText size={18} className="text-ap-accent" />
        <span>Notes & Instructions</span>
      </h2>

      {order.customerNotes && (
        <div className="rounded-xl border border-ap-border bg-ap-field-background/50 p-3">
          <p className="text-[11px] font-semibold text-ap-muted uppercase">
            Customer Order Note
          </p>
          <p className="text-xs text-ap-foreground mt-1 whitespace-pre-wrap">
            {order.customerNotes}
          </p>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-ap-foreground block mb-1.5">
          Internal Admin Note (Staff Only)
        </label>
        <textarea
          value={adminNotes}
          onChange={(e) => onAdminNotesChange(e.target.value)}
          placeholder="Add private staff notes, customer verification status, delivery notes..."
          rows={3}
          className="w-full rounded-xl border border-ap-border bg-ap-field-background p-3 text-xs text-ap-foreground placeholder:text-ap-muted outline-none transition focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft resize-none"
        />
      </div>
    </div>
  );
}
