"use client";

import Link from "next/link";
import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Spinner, toast } from "@heroui/react";
import {
  ClipboardList,
  Search,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Phone,
  MapPin,
} from "lucide-react";
import Content from "../../components/content";
import { useConfirm } from "@nishchinte/confirm";

const PAGE_SIZE = 15;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Orders" },
  {
    value: "PENDING",
    label: "Pending",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  {
    value: "CONFIRMED",
    label: "Confirmed",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    value: "COURIER_PROCESSING",
    label: "Processing",
    color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  },
  {
    value: "SHIPPED",
    label: "Shipped",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  {
    value: "DELIVERED",
    label: "Delivered",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  {
    value: "RETURNED",
    label: "Returned",
    color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    color: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Clock size={12} /> Pending
        </span>
      );
    case "CONFIRMED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
          <CheckCircle2 size={12} /> Confirmed
        </span>
      );
    case "COURIER_PROCESSING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
          <Truck size={12} /> Processing
        </span>
      );
    case "SHIPPED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">
          <Truck size={12} /> Shipped
        </span>
      );
    case "DELIVERED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <CheckCircle2 size={12} /> Delivered
        </span>
      );
    case "RETURNED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
          <XCircle size={12} /> Returned
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
          <XCircle size={12} /> Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-ap-surface border border-ap-border text-ap-muted">
          {status}
        </span>
      );
  }
}

function getPaymentBadge(status: string, method: string) {
  const isPaid = status === "PAID";
  const isPartial = status === "PARTIAL_PAID";

  return (
    <div className="flex flex-col">
      <span
        className={`text-xs font-semibold ${
          isPaid
            ? "text-emerald-500"
            : isPartial
              ? "text-amber-500"
              : "text-ap-muted"
        }`}
      >
        {isPaid ? "Paid" : isPartial ? "Partial Paid" : "Unpaid"}
      </span>
      <span className="text-[11px] text-ap-muted">{method || "COD"}</span>
    </div>
  );
}

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

export function OrdersView() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-orders", page, PAGE_SIZE, search, selectedStatus],
    queryFn: async () => {
      return {
        orders: [],
        pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
        statusCounts: {
          ALL: 0,
          CONFIRMED: 0,
          COURIER_PROCESSING: 0,
          SHIPPED: 0,
          DELIVERED: 0,
          RETURNED: 0,
          CANCELLED: 0,
        },
      };
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast("Success", {
        description: "Order deleted successfully",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Could not delete order",
        variant: "danger",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: any;
    }) => {
      return {};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast("Success", {
        description: "Order status updated",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to update status",
        variant: "danger",
      });
    },
  });

  const orders = data?.orders || [];
  const totalOrders = data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, data?.pagination?.totalPages ?? 1);
  const safePage = Math.min(page, totalPages);
  const statusCounts = data?.statusCounts || {};

  return (
    <Content>
      {/* Header */}
      <div className="mb-6 rounded-2xl border border-ap-border bg-ap-surface px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2.5 text-ap-foreground">
            <ClipboardList size={18} className="text-ap-muted" />
            <h1 className="text-[22px] leading-none font-bold">Products</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-ap-border bg-ap-field-background px-3 py-1.5 text-xs font-semibold text-ap-foreground">
              Total: {totalOrders}
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ap-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order #, phone, customer name..."
            className="h-10 w-full rounded-xl border border-ap-border bg-ap-surface pl-10 pr-4 text-xs text-ap-foreground placeholder:text-ap-muted outline-none transition focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
          />
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {STATUS_OPTIONS.map((opt) => {
            const count =
              opt.value === "ALL"
                ? totalOrders
                : (statusCounts as any)[opt.value] || 0;
            const isSelected = selectedStatus === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedStatus(opt.value);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? "bg-ap-accent text-ap-accent-foreground font-semibold shadow-sm"
                    : "border border-ap-border bg-ap-surface text-ap-muted hover:bg-ap-surface-secondary hover:text-ap-foreground"
                }`}
              >
                <span>{opt.label}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isSelected
                        ? "bg-ap-accent-foreground/20 text-ap-accent-foreground"
                        : "bg-ap-surface-secondary text-ap-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-ap-border bg-ap-surface">
          <div className="flex items-center gap-2 text-sm text-ap-muted">
            <Spinner size="sm" className="text-ap-accent" />
            Loading orders...
          </div>
        </div>
      ) : totalOrders === 0 ? (
        <div className="rounded-3xl border border-ap-border bg-ap-surface p-8 text-center sm:p-12">
          <div className="mx-auto mb-4 grid h-14 w-14 place-content-center rounded-2xl bg-ap-accent/10 text-ap-accent">
            <Package size={26} />
          </div>
          <h2 className="text-base font-semibold text-ap-foreground">
            No orders found
          </h2>
          <p className="mt-1 text-xs text-ap-muted max-w-sm mx-auto">
            {search || selectedStatus !== "ALL"
              ? "No orders matched your current filters. Try changing search keywords or status."
              : "When customers place orders from your store, they will appear here."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ap-border bg-ap-surface">
          {isFetching && (
            <div className="flex items-center gap-2 border-b border-ap-border bg-ap-field-background/60 px-4 py-2 text-xs text-ap-muted">
              <Spinner size="sm" className="text-ap-accent" />
              Updating list...
            </div>
          )}
          <div className="overflow-x-auto scrollbar-styled">
            <table className="w-full min-w-230 border-collapse">
              <thead>
                <tr className="border-b border-ap-border bg-ap-field-background/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Destination
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className={isFetching ? "opacity-75" : "opacity-100"}>
                {orders.map((order: any) => {
                  const itemCount =
                    order.orderItems?.reduce(
                      (acc: number, item: any) => acc + (item.quantity || 1),
                      0,
                    ) || 0;

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-ap-border/60 hover:bg-ap-field-background/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-semibold text-ap-accent hover:underline text-xs sm:text-sm"
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="text-[11px] text-ap-muted">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-xs text-ap-muted whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-ap-foreground truncate max-w-45">
                          {order.address?.name ||
                            order.customer?.name ||
                            "Customer"}
                        </p>
                        <p className="text-[11px] text-ap-muted flex items-center gap-1">
                          <Phone size={10} />
                          {order.customer?.mobile ||
                            order.address?.phone ||
                            "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-xs text-ap-foreground truncate max-w-40 flex items-center gap-1">
                          <MapPin
                            size={11}
                            className="text-ap-muted shrink-0"
                          />
                          <span>{order.address?.district || "Dhaka"}</span>
                        </p>
                        {order.address?.street && (
                          <p className="text-[11px] text-ap-muted truncate max-w-40">
                            {order.address.street}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-xs sm:text-sm font-semibold text-ap-foreground">
                          {formatMoney(order.total)}
                        </p>
                        {order.deliveryFee > 0 && (
                          <p className="text-[10px] text-ap-muted">
                            Delivery: {formatMoney(order.deliveryFee)}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {getPaymentBadge(
                          order.paymentStatus,
                          order.paymentMethod,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            title="View Order Details"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ap-border bg-ap-field-background text-ap-muted transition hover:border-ap-accent/40 hover:bg-ap-accent/10 hover:text-ap-accent"
                          >
                            <Eye size={14} />
                          </Link>

                          <button
                            type="button"
                            title="Delete Order"
                            disabled={deleteMutation.isPending}
                            onClick={async () => {
                              await confirm({
                                title: "Delete Order",
                                description: `Are you sure you want to permanently delete order ${order.orderNumber}?`,
                                isDanger: true,
                                onConfirm: async () => {
                                  await deleteMutation.mutateAsync(order.id);
                                },
                              });
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ap-border bg-ap-field-background text-ap-muted transition hover:border-ap-danger/40 hover:bg-ap-danger/10 hover:text-ap-danger disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ap-border p-3 px-4">
            <span className="text-xs text-ap-muted">
              Showing {(safePage - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(safePage * PAGE_SIZE, totalOrders)} of {totalOrders}{" "}
              orders
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1 || isFetching}
                className="inline-flex items-center gap-1 rounded-lg border border-ap-border px-2.5 py-1.5 text-xs font-medium text-ap-foreground disabled:cursor-not-allowed disabled:opacity-50 hover:bg-ap-field-background transition"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="text-xs text-ap-muted">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={
                  safePage >= totalPages ||
                  orders.length < PAGE_SIZE ||
                  isFetching
                }
                className="inline-flex items-center gap-1 rounded-lg border border-ap-border px-2.5 py-1.5 text-xs font-medium text-ap-foreground disabled:cursor-not-allowed disabled:opacity-50 hover:bg-ap-field-background transition"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </Content>
  );
}
