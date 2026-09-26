"use client";

import { User, Phone, Mail, ShoppingBag } from "lucide-react";
import type { OrderSummaryItem } from "@nishchinte/server/actions";

interface OrderCustomerCardProps {
  order: OrderSummaryItem;
}

export function OrderCustomerCard({ order }: OrderCustomerCardProps) {
  const customerName =
    order.customerName || order.shippingAddress?.name || "Customer";
  const customerPhone = order.customerPhone || order.shippingAddress?.phone;
  const customerEmail = order.customerEmail || order.shippingAddress?.email;
  const lifetimeOrders = order.customer?.totalOrders;

  return (
    <div className="rounded-2xl border border-ap-border bg-ap-surface p-5 space-y-3">
      <h2 className="text-base font-semibold text-ap-foreground flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <User size={18} className="text-ap-accent" />
          <span>Customer Information</span>
        </span>
        {order.customerId ? (
          <span className="rounded-full bg-ap-accent/10 px-2 py-0.5 text-[10px] font-bold text-ap-accent">
            Registered Member
          </span>
        ) : (
          <span className="rounded-full bg-ap-field-background px-2 py-0.5 text-[10px] font-medium text-ap-muted">
            Guest Checkout
          </span>
        )}
      </h2>

      <div className="space-y-2.5 text-xs">
        <div>
          <p className="text-ap-muted">Name</p>
          <p className="font-semibold text-ap-foreground">{customerName}</p>
        </div>

        <div>
          <p className="text-ap-muted">Phone Number</p>
          {customerPhone ? (
            <a
              href={`tel:${customerPhone}`}
              className="font-semibold text-ap-accent hover:underline inline-flex items-center gap-1.5"
            >
              <Phone size={12} />
              {customerPhone}
            </a>
          ) : (
            <span className="text-ap-muted">—</span>
          )}
        </div>

        {customerEmail && (
          <div>
            <p className="text-ap-muted">Email Address</p>
            <a
              href={`mailto:${customerEmail}`}
              className="text-ap-foreground hover:text-ap-accent hover:underline inline-flex items-center gap-1.5"
            >
              <Mail size={12} />
              {customerEmail}
            </a>
          </div>
        )}

        {lifetimeOrders !== undefined && (
          <div className="border-t border-ap-border pt-2.5 flex items-center justify-between text-ap-muted">
            <span className="flex items-center gap-1.5">
              <ShoppingBag size={12} />
              <span>Lifetime Orders:</span>
            </span>
            <span className="font-bold text-ap-foreground">
              {lifetimeOrders} {lifetimeOrders === 1 ? "order" : "orders"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
