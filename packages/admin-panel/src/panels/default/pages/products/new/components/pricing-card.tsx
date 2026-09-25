"use client";

import {
  parseAbsoluteToLocal,
  getLocalTimeZone,
} from "@internationalized/date";
import { ProductFormData, DiscountOption } from "../types";
import { TimeLimitedDatePicker } from "./time-picker";
import { useConfig } from "@nishchinte/config/client";
import { formatMoney } from "@nishchinte/currency";
import { CircleSlash, Percent, BadgeDollarSign, Clock3 } from "lucide-react";

const DISCOUNT_OPTIONS: DiscountOption[] = [
  {
    value: "NONE",
    title: "No Discount",
    description: "Keep original base price.",
    icon: CircleSlash,
  },
  {
    value: "PERCENTAGE",
    title: "Percentage Off",
    description: "Apply a percentage discount.",
    icon: Percent,
  },
  {
    value: "FLAT",
    title: "Flat Amount",
    description: "Deduct a fixed currency amount.",
    icon: BadgeDollarSign,
  },
  {
    value: "LIMITED_TIME_PERCENTAGE",
    title: "Limited Time %",
    description: "Timed percentage flash discount.",
    icon: Clock3,
  },
  {
    value: "LIMITED_TIME_FLAT",
    title: "Limited Time Flat",
    description: "Timed flat amount campaign.",
    icon: Clock3,
  },
];
export function PricingCard({
  formData,
  updateFormData,
}: {
  formData: ProductFormData;
  updateFormData: (updates: Partial<ProductFormData>) => void;
}) {
  const { currency } = useConfig();

  const priceNum = Number(formData.price) || 0;
  const costPriceNum = Number(formData.costPrice) || 0;
  const discountValNum = Number(formData.discountValue) || 0;

  const isPercentage =
    formData.discountType === "PERCENTAGE" ||
    formData.discountType === "LIMITED_TIME_PERCENTAGE";

  const isFlat =
    formData.discountType === "FLAT" ||
    formData.discountType === "LIMITED_TIME_FLAT";

  // Calculate savings and final discounted price
  let savings = 0;
  let finalPrice = priceNum;

  if (formData.discountType !== "NONE" && discountValNum > 0 && priceNum > 0) {
    if (isPercentage) {
      const clampedPct = Math.min(100, Math.max(0, discountValNum));
      savings = (priceNum * clampedPct) / 100;
      finalPrice = Math.max(0, priceNum - savings);
    } else if (isFlat) {
      savings = Math.min(priceNum, Math.max(0, discountValNum));
      finalPrice = Math.max(0, priceNum - savings);
    }
  }

  const handlePriceChange = (val: string) => {
    const nextPrice = val;
    const nextPriceNum = parseFloat(nextPrice);

    // If flat discount is active and current discount value exceeds new price, clamp it
    if (
      isFlat &&
      formData.discountValue &&
      !isNaN(nextPriceNum) &&
      nextPriceNum >= 0 &&
      Number(formData.discountValue) > nextPriceNum
    ) {
      updateFormData({
        price: nextPrice,
        discountValue: String(nextPriceNum),
      });
    } else {
      updateFormData({ price: nextPrice });
    }
  };

  const handleDiscountValueChange = (val: string) => {
    if (val === "") {
      updateFormData({ discountValue: "" });
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num)) {
      updateFormData({ discountValue: "" });
      return;
    }

    if (isPercentage) {
      if (num < 0) {
        updateFormData({ discountValue: "0" });
      } else if (num > 100) {
        updateFormData({ discountValue: "100" });
      } else {
        updateFormData({ discountValue: val });
      }
    } else if (isFlat) {
      const maxAllowed = Math.max(0, Number(formData.price) || 0);
      if (num < 0) {
        updateFormData({ discountValue: "0" });
      } else if (maxAllowed > 0 && num > maxAllowed) {
        // Flat discount cannot exceed selling price
        updateFormData({ discountValue: String(maxAllowed) });
      } else {
        updateFormData({ discountValue: val });
      }
    } else {
      updateFormData({ discountValue: val });
    }
  };

  return (
    <section className="rounded-2xl border border-ap-border bg-ap-surface">
      <div className="border-b border-ap-border/20 p-6">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-ap-foreground">
          <BadgeDollarSign size={18} className="text-ap-muted" />
          Pricing
        </h2>
      </div>
      <div className="space-y-6 bg-ap-surface p-6">
        {/* Base Price */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-ap-foreground">
            Selling Price <span className="text-ap-danger">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-medium text-ap-muted">
              {currency.symbol}
            </span>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0.00"
              min={0}
              step="any"
              className="w-full rounded-xl border border-ap-border py-2 pl-8 pr-4 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
              required
            />
          </div>
        </div>

        {/* Cost Price */}
        <div>
          <label className="mb-2 block text-[13px] font-medium text-ap-foreground">
            Cost Price{" "}
            <span className="text-ap-muted">
              (Customers won&apos;t see this)
            </span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-medium text-ap-muted">
              {currency.symbol}
            </span>
            <input
              type="number"
              value={formData.costPrice}
              onChange={(e) => updateFormData({ costPrice: e.target.value })}
              placeholder="0.00"
              min={0}
              step="any"
              className="w-full rounded-xl border border-ap-border py-2 pl-8 pr-4 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
            />
          </div>

          {formData.price &&
          formData.costPrice &&
          Number(formData.price) > 0 ? (
            <div className="mt-3 rounded-xl border border-ap-border bg-ap-field-background p-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-ap-muted">Gross Profit</span>
                <span className="font-semibold text-ap-foreground">
                  {formatMoney(Math.max(0, priceNum - costPriceNum), currency)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[13px]">
                <span className="text-ap-muted">Margin</span>
                <span className="font-semibold text-ap-foreground">
                  {(((priceNum - costPriceNum) / priceNum) * 100).toFixed(2)}%
                </span>
              </div>
              {costPriceNum > priceNum && (
                <p className="mt-2 text-[12px] text-ap-danger">
                  Warning: Cost price is higher than selling price.
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Discount */}
        <div className="border-t border-ap-border/30 pt-6">
          <label className="mb-3 block text-[13px] font-medium text-ap-foreground">
            Discount Settings
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DISCOUNT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                  formData.discountType === opt.value
                    ? "border-ap-accent bg-ap-accent/5 ring-1 ring-ap-accent-soft"
                    : "border-ap-border bg-ap-surface hover:border-ap-accent/40 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="discountType"
                  value={opt.value}
                  checked={formData.discountType === opt.value}
                  onChange={() =>
                    updateFormData({
                      discountType: opt.value,
                      discountValue: "",
                    })
                  }
                  className="sr-only"
                />
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                    formData.discountType === opt.value
                      ? "border-ap-accent bg-ap-accent"
                      : "border-ap-border bg-ap-surface group-hover:border-ap-accent/50"
                  }`}
                >
                  {formData.discountType === opt.value && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-[13px] font-semibold leading-none ${
                      formData.discountType === opt.value
                        ? "text-ap-accent"
                        : "text-ap-foreground group-hover:text-ap-foreground"
                    }`}
                  >
                    {opt.title}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-snug text-ap-muted">
                    {opt.description}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* Discount Value */}
          {formData.discountType !== "NONE" && (
            <div className="mt-4 space-y-3 border-t border-ap-border/30 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div
                className={
                  formData.discountType.includes("LIMITED_TIME") ? "mb-4" : ""
                }
              >
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-ap-foreground">
                    Discount Value
                  </label>
                  {isFlat && priceNum > 0 && (
                    <span className="text-[11px] font-medium text-ap-muted">
                      Max: {formatMoney(priceNum, currency)}
                    </span>
                  )}
                  {isPercentage && (
                    <span className="text-[11px] font-medium text-ap-muted">
                      Max: 100%
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-medium text-ap-muted">
                    {isPercentage ? "%" : currency.symbol}
                  </span>
                  <input
                    type="number"
                    value={formData.discountValue}
                    max={
                      isPercentage ? 100 : priceNum > 0 ? priceNum : undefined
                    }
                    min={0}
                    step="any"
                    onChange={(e) => handleDiscountValueChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-ap-border py-2 pl-8 pr-4 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
                  />
                </div>

                {/* Final discounted price preview */}
                {priceNum > 0 && discountValNum > 0 && (
                  <div className="mt-2.5 flex items-center justify-between rounded-xl border border-ap-border/60 bg-ap-field-background/50 p-2.5 text-[12px]">
                    <span className="text-ap-muted">Final Price:</span>
                    <span className="font-semibold text-ap-foreground">
                      {formatMoney(finalPrice, currency)}
                      <span className="ml-1.5 font-normal text-ap-success">
                        (Save {formatMoney(savings, currency)})
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Limited Time Fields */}
              {formData.discountType.includes("LIMITED_TIME") && (
                <div className="grid grid-cols-2 gap-3 border-t border-ap-border/20 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <TimeLimitedDatePicker
                    label="Start Date & Time"
                    value={
                      formData.discountStartAt
                        ? parseAbsoluteToLocal(
                            new Date(formData.discountStartAt).toISOString(),
                          )
                        : null
                    }
                    onChange={(v) => {
                      if (v) {
                        updateFormData({
                          discountStartAt: v
                            .toDate(getLocalTimeZone())
                            .toISOString(),
                        });
                      } else {
                        updateFormData({ discountStartAt: "" });
                      }
                    }}
                  />
                  <TimeLimitedDatePicker
                    label="End Date & Time"
                    value={
                      formData.discountEndAt
                        ? parseAbsoluteToLocal(
                            new Date(formData.discountEndAt).toISOString(),
                          )
                        : null
                    }
                    onChange={(v) => {
                      if (v) {
                        updateFormData({
                          discountEndAt: v
                            .toDate(getLocalTimeZone())
                            .toISOString(),
                        });
                      } else {
                        updateFormData({ discountEndAt: "" });
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
