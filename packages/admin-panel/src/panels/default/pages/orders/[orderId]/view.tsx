"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Spinner, toast } from "@heroui/react";
import {
  ArrowLeft,
  Calendar,
  FileText,
  MapPin,
  Package,
  Phone,
  Printer,
  Save,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import Content from "../../../components/content";
import { useConfirm } from "@nishchinte/confirm";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COURIER_PROCESSING", label: "Courier Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIAL_PAID", label: "Partial Paid" },
  { value: "PAID", label: "Paid" },
  { value: "REFUNDED", label: "Refunded" },
];

function formatMoney(amount: number) {
  return `৳${Number(amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 0 })}`;
}

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

export function OrderDetailView({ orderId }: { orderId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const { data: order, isLoading } = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => {
      return {
        status: "PENDING",
        paymentStatus: "UNPAID",
        adminNotes: "",
        advanceAmount: 0,
        total: 0,
        orderNumber: "ORD-0000",
        createdAt: new Date(),
        orderItems: [],
        subtotal: 0,
        discountAmount: 0,
        deliveryFee: 0,
        customerNotes: "",
        paymentMethod: "Cash",
        paymentTrxId: "",
        customer: {
          name: "",
          mobile: "",
          totalOrders: 0,
          email: "",
          address: "",
        },
        address: {
          name: "",
          phone: "",
          street: "",
          upazila: "",
          district: "",
        },
      };
    },
  });

  const [status, setStatus] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setPaymentStatus(order.paymentStatus);
      setAdminNotes(order.adminNotes || "");
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<any>[] = [];

      if (
        status !== order?.status ||
        adminNotes !== (order?.adminNotes || "")
      ) {
        promises
          .push
          // TODO: update order status logic
          ();
      }

      if (paymentStatus !== order?.paymentStatus) {
        promises
          .push
          // TODO: update order payment status
          ();
      }

      const results = await Promise.all(promises);
      for (const res of results) {
        if (!res.ok) throw new Error(res.error || "Failed to update order");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast("Success", {
        description: "Order updated successfully",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to update order",
        variant: "danger",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return {};
    },
    onSuccess: () => {
      toast("Success", {
        description: "Order deleted successfully",
        variant: "success",
      });
      router.push("/admin/orders");
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to delete order",
        variant: "danger",
      });
    },
  });

  if (isLoading) {
    return (
      <Content>
        <div className="flex h-64 items-center justify-center rounded-2xl border border-ap-border bg-ap-surface">
          <div className="flex items-center gap-2 text-sm text-ap-muted">
            <Spinner size="sm" className="text-ap-accent" />
            Loading order details...
          </div>
        </div>
      </Content>
    );
  }

  if (!order) {
    return (
      <Content>
        <div className="rounded-2xl border border-ap-border bg-ap-surface p-8 text-center">
          <h2 className="text-lg font-bold text-ap-foreground">
            Order Not Found
          </h2>
          <p className="mt-1 text-sm text-ap-muted">
            The requested order does not exist or has been removed.
          </p>
          <Link
            href="/admin/orders"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ap-accent px-4 py-2 text-sm font-semibold text-ap-accent-foreground"
          >
            <ArrowLeft size={16} /> Back to Orders
          </Link>
        </div>
      </Content>
    );
  }

  const hasUnsavedChanges =
    status !== order.status ||
    paymentStatus !== order.paymentStatus ||
    adminNotes !== (order.adminNotes || "");

  const payableDue = Math.max(0, order.total - (order.advanceAmount || 0));

  return (
    <Content>
      {/* Header bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ap-border bg-ap-surface text-ap-muted transition hover:text-ap-foreground"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-ap-foreground">
                Order {order.orderNumber}
              </h1>
              <span className="rounded-full bg-ap-accent/10 px-2.5 py-0.5 text-xs font-semibold text-ap-accent">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-ap-muted flex items-center gap-2 mt-0.5">
              <Calendar size={12} /> Placed on {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ap-border bg-ap-surface px-3 py-2 text-xs font-semibold text-ap-foreground hover:bg-ap-surface-secondary transition"
          >
            <Printer size={14} /> Print Invoice
          </button>

          <button
            type="button"
            disabled={!hasUnsavedChanges || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ap-accent px-4 py-2 text-xs font-semibold text-ap-accent-foreground disabled:opacity-50 transition shadow-sm hover:opacity-95"
          >
            {updateMutation.isPending ? (
              <Spinner size="sm" className="text-ap-accent-foreground" />
            ) : (
              <Save size={14} />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Order Items & Pricing Breakdown */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items Card */}
          <div className="rounded-2xl border border-ap-border bg-ap-surface p-5">
            <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2 mb-4">
              <Package size={18} className="text-ap-accent" />
              <span>Order Items ({order.orderItems?.length || 0})</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ap-border bg-ap-field-background/40 text-ap-muted">
                    <th className="px-3 py-2.5 font-semibold">Item</th>
                    <th className="px-3 py-2.5 font-semibold">Unit Price</th>
                    <th className="px-3 py-2.5 font-semibold">Qty</th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y border-ap-border/60">
                  {order.orderItems?.map((item: any) => {
                    const img =
                      item.productImage ||
                      (Array.isArray(item.product?.images)
                        ? item.product.images[0]
                        : null);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-ap-field-background/20"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-ap-border bg-ap-field-background">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={img}
                                  alt={item.productName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="grid h-full w-full place-content-center text-ap-muted">
                                  <Package size={16} />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-ap-foreground">
                                {item.productName}
                              </p>
                              {item.variantTitle && (
                                <p className="text-[11px] text-ap-accent">
                                  Variant: {item.variantTitle}
                                </p>
                              )}
                              {item.sku && (
                                <p className="text-[10px] text-ap-muted">
                                  SKU: {item.sku}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-ap-foreground font-medium">
                          {formatMoney(item.price)}
                        </td>
                        <td className="px-3 py-3 text-ap-foreground font-semibold">
                          x{item.quantity}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-ap-foreground">
                          {formatMoney(item.totalPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="mt-6 border-t border-ap-border pt-4">
              <div className="ml-auto max-w-xs space-y-2 text-xs">
                <div className="flex justify-between text-ap-muted">
                  <span>Subtotal</span>
                  <span className="font-medium text-ap-foreground">
                    {formatMoney(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-ap-muted">
                  <span>Delivery Charge</span>
                  <span className="font-medium text-ap-foreground">
                    {formatMoney(order.deliveryFee)}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-ap-success">
                    <span>Discount</span>
                    <span className="font-medium">
                      -{formatMoney(order.discountAmount)}
                    </span>
                  </div>
                )}
                {order.advanceAmount > 0 && (
                  <div className="flex justify-between text-amber-500">
                    <span>Advance Paid</span>
                    <span className="font-medium">
                      -{formatMoney(order.advanceAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-ap-border pt-2 text-sm font-bold text-ap-foreground">
                  <span>Payable / COD Due</span>
                  <span className="text-ap-accent">
                    {formatMoney(payableDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="rounded-2xl border border-ap-border bg-ap-surface p-5 space-y-4">
            <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
              <FileText size={18} className="text-ap-accent" />
              <span>Notes & Instructions</span>
            </h2>

            {order.customerNotes && (
              <div className="rounded-xl border border-ap-border/80 bg-ap-field-background/50 p-3">
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
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add private staff notes, customer call logs, or verification details..."
                rows={3}
                className="w-full rounded-xl border border-ap-border bg-ap-background p-3 text-xs text-ap-foreground placeholder:text-ap-muted outline-none transition focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Status management & Customer Info */}
        <div className="space-y-6">
          {/* Status Management */}
          <div className="rounded-2xl border border-ap-border bg-ap-surface p-5 space-y-4">
            <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
              <Truck size={18} className="text-ap-accent" />
              <span>Order & Payment Status</span>
            </h2>

            <div>
              <label className="text-xs font-medium text-ap-muted block mb-1">
                Fulfillment Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-ap-border bg-ap-background px-3 py-2 text-xs font-semibold text-ap-foreground outline-none transition focus:border-ap-accent"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-ap-muted block mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-xl border border-ap-border bg-ap-background px-3 py-2 text-xs font-semibold text-ap-foreground outline-none transition focus:border-ap-accent"
              >
                {PAYMENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-ap-border bg-ap-field-background/50 p-3 text-xs space-y-1">
              <div className="flex justify-between text-ap-muted">
                <span>Method:</span>
                <span className="font-semibold text-ap-foreground">
                  {order.paymentMethod}
                </span>
              </div>
              {order.paymentTrxId && (
                <div className="flex justify-between text-ap-muted">
                  <span>TrxID:</span>
                  <span className="font-mono text-ap-accent">
                    {order.paymentTrxId}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!hasUnsavedChanges || updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-ap-accent px-4 py-2.5 text-xs font-semibold text-ap-accent-foreground disabled:opacity-50 transition shadow-sm hover:opacity-95"
            >
              {updateMutation.isPending ? (
                <Spinner size="sm" className="text-ap-accent-foreground" />
              ) : (
                <Save size={14} />
              )}
              Update Order Status
            </button>
          </div>

          {/* Customer Card */}
          <div className="rounded-2xl border border-ap-border bg-ap-surface p-5 space-y-3">
            <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
              <User size={18} className="text-ap-accent" />
              <span>Customer Information</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div>
                <p className="text-ap-muted">Name</p>
                <p className="font-semibold text-ap-foreground">
                  {order.customer?.name ||
                    order.address?.name ||
                    "Anonymous Customer"}
                </p>
              </div>

              <div>
                <p className="text-ap-muted">Mobile Number</p>
                <a
                  href={`tel:${order.customer?.mobile || order.address?.phone}`}
                  className="font-semibold text-ap-accent hover:underline inline-flex items-center gap-1"
                >
                  <Phone size={12} />
                  {order.customer?.mobile || order.address?.phone || "—"}
                </a>
              </div>

              {order.customer?.email && (
                <div>
                  <p className="text-ap-muted">Email</p>
                  <p className="text-ap-foreground">{order.customer.email}</p>
                </div>
              )}

              <div className="border-t border-ap-border pt-2 flex justify-between text-ap-muted">
                <span>Previous Orders:</span>
                <span className="font-bold text-ap-foreground">
                  {order.customer?.totalOrders ?? 1}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="rounded-2xl border border-ap-border bg-ap-surface p-5 space-y-3">
            <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
              <MapPin size={18} className="text-ap-accent" />
              <span>Shipping Address</span>
            </h2>

            <div className="space-y-1.5 text-xs">
              <p className="font-semibold text-ap-foreground">
                {order.address?.name || "Recipient"}
              </p>
              <p className="text-ap-muted flex items-center gap-1">
                <Phone size={12} /> {order.address?.phone || "—"}
              </p>
              <p className="text-ap-foreground mt-2 font-medium">
                {order.address?.street}
              </p>
              <p className="text-ap-muted">
                {[order.address?.upazila, order.address?.district]
                  .filter(Boolean)
                  .join(", ") || "Dhaka, Bangladesh"}
              </p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-ap-danger/20 bg-ap-danger/5 p-4">
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                await confirm({
                  title: "Delete Order",
                  description: `Are you sure you want to delete order ${order.orderNumber}? This action cannot be undone.`,
                  isDanger: true,
                  onConfirm: async () => {
                    await deleteMutation.mutateAsync();
                  },
                });
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-ap-danger/30 bg-ap-danger/10 px-3 py-2 text-xs font-semibold text-ap-danger hover:bg-ap-danger/20 transition disabled:opacity-50"
            >
              <Trash2 size={14} /> Delete Order
            </button>
          </div>
        </div>
      </div>
    </Content>
  );
}
