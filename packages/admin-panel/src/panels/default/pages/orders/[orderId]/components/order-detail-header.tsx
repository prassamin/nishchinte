"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Printer, Save } from "lucide-react";
import { Spinner } from "@heroui/react";
import type { OrderSummaryItem } from "@nishchinte/server/actions";
import { OrderStatusBadge } from "../../components/order-status-badge";

function formatDate(value?: Date | string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface OrderDetailHeaderProps {
  order: OrderSummaryItem;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function OrderDetailHeader({
  order,
  hasUnsavedChanges,
  isSaving,
  onSave,
}: OrderDetailHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/orders"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ap-border bg-ap-surface text-ap-muted transition hover:text-ap-foreground"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-ap-foreground">
              Order {order.orderNumber}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-ap-muted flex items-center gap-1.5 mt-0.5">
            <Calendar size={12} /> Placed on {formatDate(order.placedAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ap-border bg-ap-surface px-3 py-2 text-xs font-semibold text-ap-foreground hover:bg-ap-field-background transition cursor-pointer"
        >
          <Printer size={14} /> Print Invoice
        </button>

        <button
          type="button"
          disabled={!hasUnsavedChanges || isSaving}
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ap-accent px-4 py-2 text-xs font-semibold text-ap-accent-foreground disabled:opacity-50 transition shadow-xs hover:opacity-95 cursor-pointer"
        >
          {isSaving ? (
            <Spinner size="sm" className="text-ap-accent-foreground" />
          ) : (
            <Save size={14} />
          )}
          Save Changes
        </button>
      </div>
    </div>
  );
}
