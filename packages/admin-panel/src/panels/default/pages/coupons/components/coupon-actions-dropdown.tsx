"use client";

import { Button, Dropdown, Label } from "@heroui/react";
import { EllipsisVertical } from "lucide-react";
import type { CouponItem } from "@nishchinte/server/actions";

interface CouponActionsDropdownProps {
  coupon: CouponItem;
  onEdit: (coupon: CouponItem) => void;
  onCopyCode: (code: string) => void;
  onDelete: (coupon: CouponItem) => void;
}

export function CouponActionsDropdown({
  coupon,
  onEdit,
  onCopyCode,
  onDelete,
}: CouponActionsDropdownProps) {
  return (
    <Dropdown>
      <Button isIconOnly variant="ghost" className="rounded-xl">
        <EllipsisVertical size={16} />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => console.log(`Selected: ${key}`)}>
          <Dropdown.Item
            onAction={() => onEdit(coupon)}
            id="edit"
            textValue="Edit Coupon"
          >
            <Label>Edit Coupon</Label>
          </Dropdown.Item>
          <Dropdown.Item
            onAction={() => onCopyCode(coupon.code)}
            id="copy"
            textValue="Copy Coupon Code"
          >
            <Label>Copy Coupon Code</Label>
          </Dropdown.Item>
          <Dropdown.Item
            onAction={() => onDelete(coupon)}
            id="delete"
            variant="danger"
            textValue="Delete"
          >
            <Label>Delete</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
