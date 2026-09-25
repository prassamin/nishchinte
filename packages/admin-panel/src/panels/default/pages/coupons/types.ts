import type { CouponItem, CouponType, CouponTarget } from "@nishchinte/server/actions";

export type CouponUpsertFormData = {
  name: string;
  code: string;
  type: CouponType;
  discountValue: string;
  minPurchase: string;
  maxDiscountAmount: string;
  maxUses: string;
  maxUsesPerUser: string;
  target: CouponTarget;
  productIds: string[];
  categoryIds: string[];
  isLimitedTime: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type CouponUpsertDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  coupon?: CouponItem | null;
  onSuccess?: (coupon: CouponItem) => void;
};