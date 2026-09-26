"use client";

import { Button, Dropdown, Label } from "@heroui/react";
import {
  EllipsisVertical,
  Eye,
  Trash2,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
} from "lucide-react";
import type { OrderStatus, OrderSummaryItem } from "@nishchinte/server/actions";

interface OrderActionsDropdownProps {
  order: OrderSummaryItem;
  onViewDetails: (orderId: string) => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  onDelete?: (order: OrderSummaryItem) => void;
}

export function OrderActionsDropdown({
  order,
  onViewDetails,
  onUpdateStatus,
  onDelete,
}: OrderActionsDropdownProps) {
  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onViewDetails(order.id)}
        title="View Order Details"
        className="hidden sm:grid h-7 w-7 place-content-center rounded-lg border border-ap-border text-ap-muted transition-colors hover:bg-ap-field-background hover:text-ap-foreground cursor-pointer"
      >
        <Eye size={13} />
      </button>

      <Dropdown>
        <Button
          isIconOnly
          variant="ghost"
          className="rounded-xl h-7 w-7 min-w-7 cursor-pointer"
        >
          <EllipsisVertical size={14} />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={(key) => console.log(`Selected: ${key}`)}>
            <Dropdown.Item
              onAction={() => onViewDetails(order.id)}
              id="view-details"
              textValue="View Order Details"
            >
              <Label className="flex items-center gap-2">
                <Eye size={14} />
                View Order Details
              </Label>
            </Dropdown.Item>

            {onUpdateStatus && order.status !== "CONFIRMED" && (
              <Dropdown.Item
                onAction={() => onUpdateStatus(order.id, "CONFIRMED")}
                id="mark-confirmed"
                textValue="Mark as Confirmed"
              >
                <Label className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-500" />
                  Mark as Confirmed
                </Label>
              </Dropdown.Item>
            )}

            {onUpdateStatus && order.status !== "PROCESSING" && (
              <Dropdown.Item
                onAction={() => onUpdateStatus(order.id, "PROCESSING")}
                id="mark-processing"
                textValue="Mark as Processing"
              >
                <Label className="flex items-center gap-2">
                  <Package size={14} className="text-indigo-500" />
                  Mark as Processing
                </Label>
              </Dropdown.Item>
            )}

            {onUpdateStatus && order.status !== "SHIPPED" && (
              <Dropdown.Item
                onAction={() => onUpdateStatus(order.id, "SHIPPED")}
                id="mark-shipped"
                textValue="Mark as Shipped"
              >
                <Label className="flex items-center gap-2">
                  <Truck size={14} className="text-purple-500" />
                  Mark as Shipped
                </Label>
              </Dropdown.Item>
            )}

            {onUpdateStatus && order.status !== "DELIVERED" && (
              <Dropdown.Item
                onAction={() => onUpdateStatus(order.id, "DELIVERED")}
                id="mark-delivered"
                textValue="Mark as Delivered"
              >
                <Label className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  Mark as Delivered
                </Label>
              </Dropdown.Item>
            )}

            {onUpdateStatus && order.status !== "CANCELLED" && (
              <Dropdown.Item
                onAction={() => onUpdateStatus(order.id, "CANCELLED")}
                id="mark-cancelled"
                textValue="Cancel Order"
              >
                <Label className="flex items-center gap-2">
                  <XCircle size={14} className="text-neutral-400" />
                  Cancel Order
                </Label>
              </Dropdown.Item>
            )}

            {onDelete && (
              <Dropdown.Item
                onAction={() => onDelete(order)}
                id="delete"
                variant="danger"
                textValue="Delete Order"
              >
                <Label className="flex items-center gap-2">
                  <Trash2 size={14} />
                  Delete Order
                </Label>
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
