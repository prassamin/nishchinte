"use client";

import { Chip } from "@heroui/react";
import type { CouponItem } from "@nishchinte/server/actions";

function formatDate(date?: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface CouponValidityCellProps {
  coupon: CouponItem;
}

export function CouponValidityCell({ coupon }: CouponValidityCellProps) {
  if (!coupon.isLimitedTime) {
    return <span className="text-xs text-ap-muted">Never expires</span>;
  }

  const isQueued = coupon?.startDate && new Date(coupon.startDate) > new Date();
  const isExpired = coupon?.endDate && new Date(coupon.endDate) < new Date();

  return (
    <div className="flex flex-col gap-0.5 text-[11px] text-ap-muted">
      <span className="inline-flex items-center">
        From: {formatDate(coupon.startDate)}
        {isQueued && (
          <Chip
            color="accent"
            variant="soft"
            size="sm"
            className="text-[9px] ml-1"
          >
            Queued
          </Chip>
        )}
      </span>
      <span className="inline-flex items-center">
        To: {formatDate(coupon?.endDate)}
        {isExpired && (
          <Chip
            color="warning"
            variant="soft"
            size="sm"
            className="text-[9px] ml-1"
          >
            Expired
          </Chip>
        )}
      </span>
    </div>
  );
}
