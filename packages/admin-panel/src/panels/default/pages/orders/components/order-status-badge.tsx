"use client";

import {
  Clock,
  CheckCircle2,
  Truck,
  Package,
  RotateCcw,
  XCircle,
} from "lucide-react";
import type { OrderStatus, PaymentStatus } from "@nishchinte/server/actions";

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  switch (status) {
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
          <Clock size={12} /> Pending
        </span>
      );
    case "CONFIRMED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-500">
          <CheckCircle2 size={12} /> Confirmed
        </span>
      );
    case "PROCESSING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-500">
          <Package size={12} /> Processing
        </span>
      );
    case "SHIPPED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-500">
          <Truck size={12} /> Shipped
        </span>
      );
    case "DELIVERED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
          <CheckCircle2 size={12} /> Delivered
        </span>
      );
    case "RETURNED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-500">
          <RotateCcw size={12} /> Returned
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-500/20 bg-neutral-500/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-400">
          <XCircle size={12} /> Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-ap-border bg-ap-surface px-2.5 py-0.5 text-xs font-semibold text-ap-muted">
          {status}
        </span>
      );
  }
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus | string;
  method?: string;
}

export function PaymentStatusBadge({
  status,
  method = "COD",
}: PaymentStatusBadgeProps) {
  const isPaid = status === "PAID";
  const isCancelled = status === "CANCELLED";

  return (
    <div className="flex flex-col">
      <span
        className={`text-xs font-semibold ${
          isPaid
            ? "text-emerald-500"
            : isCancelled
              ? "text-rose-500"
              : "text-amber-500"
        }`}
      >
        {isPaid ? "Paid" : isCancelled ? "Cancelled" : "Pending (Unpaid)"}
      </span>
      <span className="text-[11px] text-ap-muted">
        {method === "CASH_ON_DELIVERY" ? "Cash on Delivery" : method}
      </span>
    </div>
  );
}
