"use client";

import { Package, Tag } from "lucide-react";
import { useNishchinte } from "@nishchinte/hooks";
import type { OrderSummaryItem } from "@nishchinte/server/actions";

interface OrderItemsCardProps {
  order: OrderSummaryItem;
}

export function OrderItemsCard({ order }: OrderItemsCardProps) {
  const { formatMoney } = useNishchinte();
  const items = order.items ?? [];
  const totalItemQty = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

  return (
    <div className="rounded-2xl border border-ap-border bg-ap-surface p-5">
      <h2 className="text-base font-semibold text-ap-foreground flex items-center justify-between gap-2 mb-4">
        <span className="flex items-center gap-2">
          <Package size={18} className="text-ap-accent" />
          <span>Order Items ({items.length})</span>
        </span>
        <span className="text-xs text-ap-muted">
          {totalItemQty} total {totalItemQty === 1 ? "unit" : "units"}
        </span>
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-ap-border bg-ap-field-background/40 text-ap-muted">
              <th className="px-3 py-2.5 font-semibold">Item</th>
              <th className="px-3 py-2.5 font-semibold">Unit Price</th>
              <th className="px-3 py-2.5 font-semibold">Qty</th>
              <th className="px-3 py-2.5 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y border-ap-border/60">
            {items.map((item) => {
              return (
                <tr key={item.id} className="hover:bg-ap-field-background/20">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-ap-border bg-ap-field-background">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-content-center text-ap-muted">
                            <Package size={16} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ap-foreground truncate max-w-xs">
                          {item.productName}
                        </p>
                        {item.variantTitle && (
                          <p className="text-[11px] text-ap-accent font-medium">
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
                  <td className="px-3 py-3 text-ap-foreground font-medium whitespace-nowrap">
                    {formatMoney(item.unitPrice)}
                  </td>
                  <td className="px-3 py-3 text-ap-foreground font-semibold whitespace-nowrap">
                    x{item.quantity}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-ap-foreground whitespace-nowrap">
                    {formatMoney(item.total)}
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
            <span>Delivery Fee ({order.deliveryType})</span>
            <span className="font-medium text-ap-foreground">
              {formatMoney(order.shippingFee)}
            </span>
          </div>

          {order.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-500">
              <span className="inline-flex items-center gap-1">
                <Tag size={12} />
                <span>Coupon ({order.couponCode || "Discount"})</span>
              </span>
              <span className="font-medium">
                -{formatMoney(order.discountAmount)}
              </span>
            </div>
          )}

          <div className="flex justify-between border-t border-ap-border pt-2 text-sm font-bold text-ap-foreground">
            <span>Total Amount</span>
            <span className="text-ap-accent">
              {formatMoney(order.totalAmount)}
            </span>
          </div>

          <div className="flex justify-between text-[11px] text-ap-muted pt-1">
            <span>Payment Method</span>
            <span className="font-medium text-ap-foreground">
              Cash on Delivery (COD)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
