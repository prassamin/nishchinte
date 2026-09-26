"use client";

import Link from "next/link";
import { useRouter } from "@bprogress/next";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Spinner, toast } from "@heroui/react";
import { ArrowLeft, Trash2 } from "lucide-react";
import Content from "../../../components/content";
import { useConfirm } from "@nishchinte/confirm";
import {
  actions,
  type OrderStatus,
  type PaymentStatus,
} from "@nishchinte/server/actions";
import {
  OrderDetailHeader,
  OrderItemsCard,
  OrderStatusCard,
  OrderCustomerCard,
  OrderAddressCard,
  OrderNotesCard,
  OrderTimelineCard,
} from "./components";

export function OrderDetailView({ orderId }: { orderId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const {
    data: orderResult,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: async () => {
      const res = await actions.order.getById(orderId);
      if (!res.ok) {
        throw new Error(res.error || "Failed to load order details");
      }
      return res.order;
    },
  });

  const order = orderResult;

  // Local Form state
  const [status, setStatus] = useState<OrderStatus>("PENDING");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("PENDING");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [courierName, setCourierName] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [consignmentId, setConsignmentId] = useState<string>("");

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setPaymentStatus(order.paymentStatus);
      setAdminNotes(order.adminNotes || "");
      setCourierName(order.courierName || "");
      setTrackingNumber(order.trackingNumber || "");
      setConsignmentId(order.consignmentId || "");
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await actions.order.update({
        orderId,
        status,
        paymentStatus,
        adminNotes,
        courierName,
        trackingNumber,
        consignmentId,
      });

      if (!res.ok) {
        throw new Error(res.error || "Failed to update order");
      }
      return res.order;
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
      const res = await actions.order.delete(orderId);
      if (!res.ok) throw new Error(res.error || "Failed to delete order");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
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

  if (isError || !order) {
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
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ap-accent px-4 py-2 text-sm font-semibold text-ap-accent-foreground cursor-pointer hover:opacity-90"
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
    adminNotes !== (order.adminNotes || "") ||
    courierName !== (order.courierName || "") ||
    trackingNumber !== (order.trackingNumber || "") ||
    consignmentId !== (order.consignmentId || "");

  const handleDelete = () => {
    confirm({
      title: "Delete Order",
      description: `Are you sure you want to permanently delete order "${order.orderNumber}"? This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        await deleteMutation.mutateAsync();
      },
    });
  };

  return (
    <Content>
      {/* Header bar */}
      <OrderDetailHeader
        order={order}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={updateMutation.isPending}
        onSave={() => updateMutation.mutate()}
      />

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Order Items, Financial Breakdown & Notes */}
        <div className="space-y-6 lg:col-span-2">
          <OrderItemsCard order={order} />

          <OrderNotesCard
            order={order}
            adminNotes={adminNotes}
            onAdminNotesChange={setAdminNotes}
          />

          <OrderTimelineCard order={order} />
        </div>

        {/* Right 1 Col: Status, Logistics, Customer & Address */}
        <div className="space-y-6">
          <OrderStatusCard
            status={status}
            onStatusChange={setStatus}
            paymentStatus={paymentStatus}
            onPaymentStatusChange={setPaymentStatus}
            courierName={courierName}
            onCourierNameChange={setCourierName}
            trackingNumber={trackingNumber}
            onTrackingNumberChange={setTrackingNumber}
            consignmentId={consignmentId}
            onConsignmentIdChange={setConsignmentId}
            isSaving={updateMutation.isPending}
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={() => updateMutation.mutate()}
          />

          <OrderCustomerCard order={order} />

          <OrderAddressCard order={order} />

          {/* Danger Zone */}
          <div className="rounded-2xl border border-ap-danger/20 bg-ap-danger/5 p-4">
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-ap-danger/30 bg-ap-danger/10 px-3 py-2 text-xs font-semibold text-ap-danger hover:bg-ap-danger/20 transition disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={14} /> Delete Order
            </button>
          </div>
        </div>
      </div>
    </Content>
  );
}
