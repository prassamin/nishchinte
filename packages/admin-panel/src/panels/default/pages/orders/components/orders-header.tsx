"use client";

import { ClipboardList, RefreshCw } from "lucide-react";

interface OrdersHeaderProps {
  totalOrders: number;
  isFetching?: boolean;
  onRefresh?: () => void;
}

export function OrdersHeader({
  totalOrders,
  isFetching,
  onRefresh,
}: OrdersHeaderProps) {
  return (
    <div className="mb-6 rounded-2xl border border-ap-border bg-ap-surface px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2.5 text-ap-foreground">
          <ClipboardList size={18} className="text-ap-muted" />
          <h1 className="text-[22px] leading-none font-bold">Orders</h1>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh orders"
              disabled={isFetching}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-ap-border bg-ap-surface text-ap-muted transition hover:bg-ap-field-background hover:text-ap-foreground disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={isFetching ? "animate-spin text-ap-accent" : ""}
              />
            </button>
          )}

          <span className="rounded-xl border border-ap-border bg-ap-field-background px-3 py-1.5 text-xs font-semibold text-ap-foreground">
            Total: {totalOrders}
          </span>
        </div>
      </div>
    </div>
  );
}
