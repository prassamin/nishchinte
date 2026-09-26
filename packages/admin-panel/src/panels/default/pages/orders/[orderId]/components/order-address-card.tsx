"use client";

import { MapPin, Phone } from "lucide-react";
import type { OrderSummaryItem } from "@nishchinte/server/actions";

interface OrderAddressCardProps {
  order: OrderSummaryItem;
}

export function OrderAddressCard({ order }: OrderAddressCardProps) {
  const address = order.shippingAddress;

  if (!address) {
    return (
      <div className="rounded-2xl border border-ap-border bg-ap-surface p-5 space-y-2">
        <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
          <MapPin size={18} className="text-ap-accent" />
          <span>Shipping Address</span>
        </h2>
        <p className="text-xs text-ap-muted">No address provided.</p>
      </div>
    );
  }

  const regionDetails = [
    address.upazila,
    address.district,
    address.division,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-2xl border border-ap-border bg-ap-surface p-5 space-y-3">
      <h2 className="text-base font-semibold text-ap-foreground flex items-center gap-2">
        <MapPin size={18} className="text-ap-accent" />
        <span>Shipping Address</span>
      </h2>

      <div className="space-y-1.5 text-xs">
        <p className="font-semibold text-ap-foreground">{address.name}</p>

        <p className="text-ap-muted flex items-center gap-1.5">
          <Phone size={12} />
          <span>{address.phone}</span>
          {address.alternativePhone && (
            <span className="text-ap-muted/70">
              (Alt: {address.alternativePhone})
            </span>
          )}
        </p>

        <p className="text-ap-foreground mt-2 font-medium">
          {address.streetAddress}
        </p>

        {regionDetails && <p className="text-ap-muted">{regionDetails}</p>}
      </div>
    </div>
  );
}
