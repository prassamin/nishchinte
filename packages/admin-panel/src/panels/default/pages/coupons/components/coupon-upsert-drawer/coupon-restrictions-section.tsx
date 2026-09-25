"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  getLocalTimeZone,
  parseAbsoluteToLocal,
} from "@internationalized/date";
import type { CouponUpsertFormData } from "../../types";
import { CouponDatePicker } from "./coupon-date-picker";

export function CouponRestrictionsSection({
  form,
  setForm,
}: {
  form: CouponUpsertFormData;
  setForm: Dispatch<SetStateAction<CouponUpsertFormData>>;
}) {
  function parseDateValue(dateStr?: string | null) {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return parseAbsoluteToLocal(d.toISOString());
    } catch {
      return null;
    }
  }

  return (
    <div className="space-y-4 border-t border-ap-border/50 pt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ap-muted">
        Restrictions
      </h3>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ap-foreground">
            Total Usage Limit
          </label>
          <input
            type="number"
            min="1"
            value={form.maxUses}
            onChange={(e) =>
              setForm((p) => ({ ...p, maxUses: e.target.value }))
            }
            placeholder="e.g. 100 (Blank for unlimited)"
            className="w-full rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent number-arrow-none focus:ring-2 focus:ring-ap-accent-soft"
          />
          <p className="mt-1 text-[13px] text-ap-muted">
            Total redemptions allowed across all customers. Leave blank for
            unlimited.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ap-foreground">
            Limit Per Customer
          </label>
          <input
            type="number"
            min="1"
            value={form.maxUsesPerUser}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                maxUsesPerUser: e.target.value,
              }))
            }
            placeholder="e.g. 1"
            className="w-full rounded-xl border border-ap-border bg-ap-field-background/30 px-3 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus:border-ap-accent number-arrow-none focus:ring-2 focus:ring-ap-accent-soft"
          />
          <p className="mt-1 text-[13px] text-ap-muted">
            Maximum times an individual customer can redeem this coupon.
          </p>
        </div>

        <CouponDatePicker
          label="Start Date & Time"
          value={parseDateValue(form.startDate)}
          onChange={(v) => {
            if (v) {
              try {
                setForm((p) => ({
                  ...p,
                  startDate: v.toDate(getLocalTimeZone()).toISOString(),
                }));
              } catch {
                setForm((p) => ({ ...p, startDate: "" }));
              }
            } else {
              setForm((p) => ({ ...p, startDate: "" }));
            }
          }}
        />

        <CouponDatePicker
          label="End Date & Time"
          value={parseDateValue(form.endDate)}
          onChange={(v) => {
            if (v) {
              try {
                setForm((p) => ({
                  ...p,
                  endDate: v.toDate(getLocalTimeZone()).toISOString(),
                }));
              } catch {
                setForm((p) => ({ ...p, endDate: "" }));
              }
            } else {
              setForm((p) => ({ ...p, endDate: "" }));
            }
          }}
        />
      </div>
    </div>
  );
}
