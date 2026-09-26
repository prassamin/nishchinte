"use client";

import {
  Search,
  Trash2,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
} from "lucide-react";
import type { OrderStatus } from "@nishchinte/server/actions";

const STATUS_FILTERS: Array<{
  value: OrderStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "All Orders" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" },
];

interface OrdersToolbarProps {
  searchInput: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedStatus: OrderStatus | "ALL";
  onStatusChange: (status: OrderStatus | "ALL") => void;
  statusCounts: Record<string, number>;
  selectedCount: number;
  onBulkDelete?: () => void;
  onBulkUpdateStatus?: (status: OrderStatus) => void;
  isBulkUpdating?: boolean;
}

export function OrdersToolbar({
  searchInput,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  statusCounts,
  selectedCount,
  onBulkDelete,
  onBulkUpdateStatus,
  isBulkUpdating,
}: OrdersToolbarProps) {
  return (
    <div className="mb-4 space-y-3">
      {/* Top search and filter pills */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ap-muted"
          />
          <input
            type="text"
            value={searchInput}
            onChange={onSearchChange}
            placeholder="Search by order #, phone, customer, address..."
            className="h-10 w-full rounded-xl border border-ap-border bg-ap-surface pl-10 pr-4 text-xs text-ap-foreground placeholder:text-ap-muted outline-none transition focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
          />
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {STATUS_FILTERS.map((opt) => {
            const count = statusCounts[opt.value] || 0;
            const isSelected = selectedStatus === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onStatusChange(opt.value)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  isSelected
                    ? "bg-ap-accent text-ap-accent-foreground font-semibold shadow-xs"
                    : "border border-ap-border bg-ap-surface text-ap-muted hover:bg-ap-field-background hover:text-ap-foreground"
                }`}
              >
                <span>{opt.label}</span>
                {count > 0 && (
                  <span className={`rounded-full text-[10px] font-bold`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ap-accent/30 bg-ap-accent/5 px-4 py-2.5 animate-in fade-in duration-150">
          <span className="text-xs font-semibold text-ap-foreground">
            {selectedCount} {selectedCount === 1 ? "order" : "orders"} selected
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {onBulkUpdateStatus && (
              <>
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => onBulkUpdateStatus("CONFIRMED")}
                  className="inline-flex items-center gap-1 rounded-xl border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-500 hover:bg-blue-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                  <CheckCircle2 size={13} />
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => onBulkUpdateStatus("PROCESSING")}
                  className="inline-flex items-center gap-1 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-500 hover:bg-indigo-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                  <Package size={13} />
                  Processing
                </button>
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => onBulkUpdateStatus("SHIPPED")}
                  className="inline-flex items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-500 hover:bg-purple-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                  <Truck size={13} />
                  Shipped
                </button>
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => onBulkUpdateStatus("DELIVERED")}
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                  <CheckCircle2 size={13} />
                  Delivered
                </button>
                <button
                  type="button"
                  disabled={isBulkUpdating}
                  onClick={() => onBulkUpdateStatus("CANCELLED")}
                  className="inline-flex items-center gap-1 rounded-xl border border-neutral-500/30 bg-neutral-500/10 px-2.5 py-1 text-xs font-semibold text-neutral-400 hover:bg-neutral-500/20 disabled:opacity-50 transition cursor-pointer"
                >
                  <XCircle size={13} />
                  Cancel
                </button>
              </>
            )}

            {onBulkDelete && (
              <button
                type="button"
                disabled={isBulkUpdating}
                onClick={onBulkDelete}
                className="inline-flex items-center gap-1 rounded-xl border border-ap-danger/30 bg-ap-danger/10 px-2.5 py-1 text-xs font-semibold text-ap-danger hover:bg-ap-danger/20 disabled:opacity-50 transition cursor-pointer"
              >
                <Trash2 size={13} />
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
