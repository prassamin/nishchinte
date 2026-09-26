"use client";

import { useMemo, useState } from "react";
import {
  Checkbox,
  cn,
  EmptyState,
  Spinner,
  Table,
  type Selection,
  type SortDescriptor,
} from "@heroui/react";
import { ClipboardList, MapPin, Phone } from "lucide-react";
import { useRouter } from "@bprogress/next";
import { useNishchinte } from "@nishchinte/hooks";
import type { OrderStatus, OrderSummaryItem } from "@nishchinte/server/actions";
import { OrdersPagination } from "./orders-pagination";
import { OrderStatusBadge, PaymentStatusBadge } from "./order-status-badge";
import { OrderActionsDropdown } from "./order-actions-dropdown";

const TABLE_COLUMNS = [
  { name: "Order #", id: "orderNumber", allowsSorting: true },
  { name: "Date", id: "placedAt", allowsSorting: true },
  { name: "Customer", id: "customerName", allowsSorting: true },
  {
    name: "Destination",
    id: "destination",
    allowsSorting: false,
    className: "hidden md:table-cell",
  },
  { name: "Total", id: "totalAmount", allowsSorting: true },
  { name: "Payment", id: "paymentStatus", allowsSorting: true },
  { name: "Status", id: "status", allowsSorting: true },
  { name: "", id: "actions", allowsSorting: false },
];

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

interface OrdersTableProps {
  orders: OrderSummaryItem[];
  totalOrders: number;
  totalPages: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  debouncedSearch: string;
  selectedKeys: Selection;
  onSelectionChange: (keys: Selection) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder?: (order: OrderSummaryItem) => void;
}

export function OrdersTable({
  orders,
  totalOrders,
  totalPages,
  page,
  pageSize,
  isLoading,
  debouncedSearch,
  selectedKeys,
  onSelectionChange,
  onPageChange,
  onPageSizeChange,
  onUpdateStatus,
  onDeleteOrder,
}: OrdersTableProps) {
  const router = useRouter();
  const { formatMoney } = useNishchinte();

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "placedAt",
    direction: "descending",
  });

  const sortedOrders = useMemo(() => {
    if (!sortDescriptor?.column) return orders;

    return [...orders].sort((a, b) => {
      let first: any;
      let second: any;

      switch (sortDescriptor.column) {
        case "orderNumber":
          first = a.orderNumber;
          second = b.orderNumber;
          break;
        case "customerName":
          first = a.customerName.toLowerCase();
          second = b.customerName.toLowerCase();
          break;
        case "totalAmount":
          first = a.totalAmount;
          second = b.totalAmount;
          break;
        case "status":
          first = a.status;
          second = b.status;
          break;
        case "paymentStatus":
          first = a.paymentStatus;
          second = b.paymentStatus;
          break;
        case "placedAt":
        default:
          first = new Date(a.placedAt).getTime();
          second = new Date(b.placedAt).getTime();
          break;
      }

      let cmp = 0;
      if (typeof first === "string" && typeof second === "string") {
        cmp = first.localeCompare(second);
      } else if (first < second) {
        cmp = -1;
      } else if (first > second) {
        cmp = 1;
      }

      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [orders, sortDescriptor]);

  return (
    <Table>
      <Table.ScrollContainer
        className={cn(totalOrders !== 0 ? "h-[calc(100dvh-270px)]" : "h-[50dvh]")}
      >
        <Table.Content
          aria-label="Orders table"
          className={cn("min-w-220", totalOrders === 0 && "h-full")}
          selectedKeys={selectedKeys}
          selectionMode="multiple"
          onSelectionChange={onSelectionChange}
          onRowAction={() => {}}
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        >
          <Table.Header className="sticky top-0 z-10">
            <Table.Column className="pe-0 w-8">
              <Checkbox aria-label="Select all" slot="selection">
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
            </Table.Column>
            {TABLE_COLUMNS.map((column) => (
              <Table.Column
                className={cn("after:hidden", column.className)}
                key={column.id}
                id={column.id}
                isRowHeader={column.id === "orderNumber"}
                allowsSorting={column.allowsSorting}
              >
                {column.allowsSorting
                  ? ({ sortDirection }) => (
                      <Table.SortableColumnHeader sortDirection={sortDirection}>
                        {column.name}
                      </Table.SortableColumnHeader>
                    )
                  : column.name}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => (
              <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                {isLoading ? (
                  <Spinner />
                ) : (
                  <>
                    <ClipboardList className="size-6 text-ap-muted" />
                    <h2 className="text-ap-foreground">
                      {debouncedSearch
                        ? "No matching orders found"
                        : "No orders placed yet"}
                    </h2>
                  </>
                )}
              </EmptyState>
            )}
          >
            {totalOrders === 0
              ? []
              : sortedOrders.map((order) => {
                  const itemCount =
                    order.itemCount ??
                    order.items?.reduce(
                      (acc, it) => acc + (it.quantity || 1),
                      0,
                    ) ??
                    0;

                  return (
                    <Table.Row
                      key={order.id}
                      id={order.id}
                      className="cursor-pointer hover:bg-ap-field-background/40 transition-colors group data-[selected=true]:bg-ap-accent/10"
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <Table.Cell className="pe-0 w-8">
                        <Checkbox
                          aria-label={`Select order ${order.orderNumber}`}
                          slot="selection"
                          variant="secondary"
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      </Table.Cell>

                      {/* Column 1: Order # */}
                      <Table.Cell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-ap-accent group-hover:underline text-xs sm:text-sm">
                            {order.orderNumber}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-ap-muted">
                              {itemCount} {itemCount === 1 ? "item" : "items"}
                            </span>
                            {order.deliveryType === "EXPRESS" && (
                              <span className="rounded-md bg-amber-500/10 px-1 py-0.2 text-[10px] font-bold text-amber-500">
                                Express
                              </span>
                            )}
                          </div>
                        </div>
                      </Table.Cell>

                      {/* Column 2: Date */}
                      <Table.Cell className="text-xs text-ap-muted whitespace-nowrap">
                        {formatDate(order.placedAt)}
                      </Table.Cell>

                      {/* Column 3: Customer */}
                      <Table.Cell>
                        <div className="flex flex-col max-w-44">
                          <p className="text-xs font-semibold text-ap-foreground truncate">
                            {order.customerName || "Customer"}
                          </p>
                          <a
                            href={`tel:${order.customerPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-ap-muted hover:text-ap-accent flex items-center gap-1 truncate"
                          >
                            <Phone size={10} />
                            {order.customerPhone || "—"}
                          </a>
                        </div>
                      </Table.Cell>

                      {/* Column 4: Destination */}
                      <Table.Cell className="hidden md:table-cell">
                        <div className="flex flex-col max-w-40">
                          <p className="text-xs text-ap-foreground truncate flex items-center gap-1">
                            <MapPin size={11} className="text-ap-muted shrink-0" />
                            <span>
                              {order.shippingAddress?.district || "Dhaka"}
                            </span>
                          </p>
                          {order.shippingAddress?.streetAddress && (
                            <p className="text-[11px] text-ap-muted truncate">
                              {order.shippingAddress.streetAddress}
                            </p>
                          )}
                        </div>
                      </Table.Cell>

                      {/* Column 5: Total */}
                      <Table.Cell>
                        <div className="flex flex-col">
                          <p className="text-xs sm:text-sm font-semibold text-ap-foreground">
                            {formatMoney(order.totalAmount)}
                          </p>
                          {order.shippingFee > 0 && (
                            <p className="text-[10px] text-ap-muted">
                              Delivery: {formatMoney(order.shippingFee)}
                            </p>
                          )}
                          {order.discountAmount > 0 && (
                            <p className="text-[10px] text-emerald-500 font-medium">
                              Saved: {formatMoney(order.discountAmount)}
                            </p>
                          )}
                        </div>
                      </Table.Cell>

                      {/* Column 6: Payment */}
                      <Table.Cell>
                        <PaymentStatusBadge
                          status={order.paymentStatus}
                          method={order.paymentMethod}
                        />
                      </Table.Cell>

                      {/* Column 7: Status */}
                      <Table.Cell>
                        <OrderStatusBadge status={order.status} />
                      </Table.Cell>

                      {/* Column 8: Actions */}
                      <Table.Cell className="w-0 ring-0!">
                        <OrderActionsDropdown
                          order={order}
                          onViewDetails={(id) => router.push(`/admin/orders/${id}`)}
                          onUpdateStatus={onUpdateStatus}
                          onDelete={onDeleteOrder}
                        />
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      <Table.Footer className="border-t border-ap-border/60 p-3">
        <OrdersPagination
          page={page}
          totalPages={totalPages}
          totalOrders={totalOrders}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </Table.Footer>
    </Table>
  );
}
