"use client";

import { Truck, Save } from "lucide-react";
import { Spinner } from "@heroui/react";
import type { OrderStatus, PaymentStatus } from "@nishchinte/server/actions";

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS: Array<{ value: PaymentStatus; label: string }> = [
  { value: "PENDING", label: "Pending (Unpaid)" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled / Void" },
];

interface OrderStatusCardProps {
  status: OrderStatus;
  onStatusChange: (status: OrderStatus) => void;
  paymentStatus: PaymentStatus;
  onPaymentStatusChange: (status: PaymentStatus) => void;
  courierName: string;
  onCourierNameChange: (val: string) => void;
  trackingNumber: string;
  onTrackingNumberChange: (val: string) => void;
  consignmentId: string;
  onConsignmentIdChange: (val: string) => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => void;
}

export function OrderStatusCard({
  status,
  onStatusChange,
  paymentStatus,
  onPaymentStatusChange,
  courierName,
  onCourierNameChange,
  trackingNumber,
  onTrackingNumberChange,
  consignmentId,
  onConsignmentIdChange,
  isSaving,
  hasUnsavedChanges,
  onSave,
}: OrderStatusCardProps) {
  return (
    <div className="rounded-2xl border border-ap-border bg-ap-surface p-5 space-y-4">
      <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
        <Truck size={18} className="text-ap-accent" />
        <span>Status & Courier Logistics</span>
      </h2>

      {/* Fulfillment Status */}
      <div>
        <label className="text-xs font-medium text-ap-muted block mb-1">
          Fulfillment Status
        </label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
          className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3 py-2 text-xs font-semibold text-ap-foreground outline-none transition focus:border-ap-accent"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Payment Status */}
      <div>
        <label className="text-xs font-medium text-ap-muted block mb-1">
          Payment Status
        </label>
        <select
          value={paymentStatus}
          onChange={(e) =>
            onPaymentStatusChange(e.target.value as PaymentStatus)
          }
          className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3 py-2 text-xs font-semibold text-ap-foreground outline-none transition focus:border-ap-accent"
        >
          {PAYMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Courier Name */}
      <div>
        <label className="text-xs font-medium text-ap-muted block mb-1">
          Courier Service
        </label>
        <input
          type="text"
          value={courierName}
          onChange={(e) => onCourierNameChange(e.target.value)}
          placeholder="e.g. Steadfast, Pathao, RedX, Paperfly"
          className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3 py-2 text-xs text-ap-foreground placeholder:text-ap-muted outline-none transition focus:border-ap-accent"
        />
      </div>

      {/* Tracking Number / Consignment ID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-ap-muted block mb-1">
            Tracking #
          </label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => onTrackingNumberChange(e.target.value)}
            placeholder="Tracking ID"
            className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3 py-2 text-xs text-ap-foreground placeholder:text-ap-muted outline-none transition focus:border-ap-accent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ap-muted block mb-1">
            Consignment ID
          </label>
          <input
            type="text"
            value={consignmentId}
            onChange={(e) => onConsignmentIdChange(e.target.value)}
            placeholder="Consignment #"
            className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3 py-2 text-xs text-ap-foreground placeholder:text-ap-muted outline-none transition focus:border-ap-accent"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!hasUnsavedChanges || isSaving}
        onClick={onSave}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-ap-accent px-4 py-2.5 text-xs font-semibold text-ap-accent-foreground disabled:opacity-50 transition shadow-xs hover:opacity-95 cursor-pointer mt-2"
      >
        {isSaving ? (
          <Spinner size="sm" className="text-ap-accent-foreground" />
        ) : (
          <Save size={14} />
        )}
        Update Status & Logistics
      </button>
    </div>
  );
}
