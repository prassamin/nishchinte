"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Drawer, Spinner, toast } from "@heroui/react";
import { Tag } from "lucide-react";
import { useIsMobile } from "@nishchinte/hooks";
import { actions } from "@nishchinte/server/actions";
import type {
  CouponUpsertDrawerProps,
  CouponUpsertFormData,
} from "../../types";
import { CouponBasicInfoSection } from "./coupon-basic-info-section";
import { CouponDiscountSection } from "./coupon-discount-section";
import { CouponApplicabilitySection } from "./coupon-applicability-section";
import { CouponRestrictionsSection } from "./coupon-restrictions-section";
import { useShortcuts } from "@keybindy/react";

export function CouponUpsertDrawer({
  isOpen,
  onOpenChange,
  mode = "create",
  coupon,
  onSuccess,
}: CouponUpsertDrawerProps) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [form, setForm] = useState<CouponUpsertFormData>({
    name: "",
    code: "",
    type: "PERCENTAGE",
    discountValue: "",
    minPurchase: "",
    maxDiscountAmount: "",
    maxUses: "",
    maxUsesPerUser: "1",
    target: "ALL",
    productIds: [],
    categoryIds: [],
    isLimitedTime: false,
    startDate: new Date().toISOString(),
    endDate: "",
    isActive: true,
  });

  // Populate data on open / change
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && coupon) {
      setForm({
        name: coupon.name || "",
        code: coupon.code || "",
        type: coupon.type || "PERCENTAGE",
        discountValue: coupon.discountValue || "",
        minPurchase: coupon.minPurchase || "",
        maxDiscountAmount: coupon.maxDiscountAmount || "",
        maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
        maxUsesPerUser:
          coupon.maxUsesPerUser != null ? String(coupon.maxUsesPerUser) : "1",
        target: coupon.target || "ALL",
        productIds: coupon.productIds || [],
        categoryIds: coupon.categoryIds || [],
        isLimitedTime: Boolean(coupon.isLimitedTime),
        startDate: coupon.startDate
          ? new Date(coupon.startDate).toISOString()
          : coupon.createdAt
            ? new Date(coupon.createdAt).toISOString()
            : new Date().toISOString(),
        endDate: coupon.endDate ? new Date(coupon.endDate).toISOString() : "",
        isActive: Boolean(coupon.isActive),
      });
    } else {
      setForm({
        name: "",
        code: "",
        type: "PERCENTAGE",
        discountValue: "",
        minPurchase: "",
        maxDiscountAmount: "",
        maxUses: "",
        maxUsesPerUser: "1",
        target: "ALL",
        productIds: [],
        categoryIds: [],
        isLimitedTime: false,
        startDate: new Date().toISOString(),
        endDate: "",
        isActive: true,
      });
    }
  }, [isOpen, mode, coupon]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const discountVal = parseFloat(form.discountValue);
      if (isNaN(discountVal) || discountVal <= 0) {
        throw new Error("Please provide a valid discount value greater than 0");
      }
      if (form.type === "PERCENTAGE" && discountVal > 100) {
        throw new Error("Percentage discount cannot exceed 100%");
      }

      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        discountValue: discountVal,
        minPurchase: form.minPurchase.trim()
          ? parseFloat(form.minPurchase)
          : null,
        maxDiscountAmount:
          form.type === "PERCENTAGE" && form.maxDiscountAmount.trim()
            ? parseFloat(form.maxDiscountAmount)
            : null,
        maxUses: form.maxUses.trim() ? parseInt(form.maxUses, 10) : null,
        maxUsesPerUser: form.maxUsesPerUser.trim()
          ? parseInt(form.maxUsesPerUser, 10)
          : 1,
        target: form.target,
        productIds:
          form.target === "SPECIFIC_PRODUCTS" && form.productIds.length > 0
            ? form.productIds
            : null,
        categoryIds:
          form.target === "SPECIFIC_CATEGORIES" && form.categoryIds.length > 0
            ? form.categoryIds
            : null,
        isLimitedTime: Boolean(form.startDate || form.endDate),
        startDate: form.startDate
          ? new Date(form.startDate).toISOString()
          : new Date().toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        isActive: form.isActive,
      };

      if (mode === "edit" && coupon) {
        const res = await actions.coupon.update(coupon.id, payload);
        if (!res.ok) throw new Error(res.error || "Failed to update coupon");
        return res.coupon;
      } else {
        const res = await actions.coupon.create(payload);
        if (!res.ok) throw new Error(res.error || "Failed to create coupon");
        return res.coupon;
      }
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast("Success", {
        description:
          mode === "edit"
            ? "Coupon updated successfully"
            : "Coupon created successfully",
        variant: "success",
      });
      onSuccess?.(saved);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast("Error", {
        description: err?.message || "Failed to save coupon",
        variant: "danger",
      });
    },
  });

  useShortcuts(
    [
      {
        keys: ["Enter"],
        handler: () => {
          if (isFormValid) {
            upsertMutation.mutate();
          }
        },
        options: {
          ignoreInputs: true,
        },
      },
    ],
    {
      disabled: !isOpen,
    },
  );

  const isFormValid =
    Boolean(form.name.trim()) &&
    Boolean(form.code.trim()) &&
    Boolean(form.discountValue.trim());

  return (
    <Drawer>
      <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Drawer.Content placement={isMobile ? "bottom" : "right"}>
          <Drawer.Dialog className="w-[calc(100vw-20px)] max-w-xl rounded-2xl sm:w-[calc(100vw-24px)]">
            <Drawer.Header className="border-b border-ap-border/50 pb-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ap-accent/10 text-ap-accent">
                  <Tag size={16} />
                </span>
                <div>
                  <Drawer.Heading>
                    {mode === "edit" ? "Edit Coupon" : "Create New Coupon"}
                  </Drawer.Heading>
                  <p className="mt-1 text-xs text-ap-muted">
                    Configure discount rules, targeting, usage limits, and
                    validity schedules.
                  </p>
                </div>
              </div>
            </Drawer.Header>

            <Drawer.Body className="space-y-6 py-5 overflow-y-auto scrollbar-hidden flex-1">
              <CouponBasicInfoSection form={form} setForm={setForm} />
              <CouponDiscountSection form={form} setForm={setForm} />
              <CouponApplicabilitySection
                form={form}
                setForm={setForm}
                isOpen={isOpen}
              />
              <CouponRestrictionsSection form={form} setForm={setForm} />
            </Drawer.Body>

            <Drawer.Footer className="border-t border-ap-border/50 pt-4">
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl border border-ap-border px-4 py-2 text-sm font-medium text-ap-foreground transition-colors hover:bg-ap-field-background"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  isDisabled={upsertMutation.isPending || !isFormValid}
                  isPending={upsertMutation.isPending}
                  onClick={() => upsertMutation.mutate()}
                  className="rounded-xl w-full sm:w-auto bg-ap-accent px-5 py-2 text-sm font-semibold text-ap-accent-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {upsertMutation.isPending ? (
                    <Spinner size="sm" color="current" />
                  ) : null}
                  {upsertMutation.isPending
                    ? mode === "edit"
                      ? "Saving..."
                      : "Creating..."
                    : mode === "edit"
                      ? "Save"
                      : "Create"}
                </Button>
              </div>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
