"use client";

import { Button, Dropdown, Label } from "@heroui/react";
import { EllipsisVertical } from "lucide-react";
import type { ProductItem } from "../types";

interface ProductActionsDropdownProps {
  product: ProductItem;
  onEdit: (product: ProductItem) => void;
  onDelete: (product: ProductItem) => void;
}

export function ProductActionsDropdown({
  product,
  onEdit,
  onDelete,
}: ProductActionsDropdownProps) {
  return (
    <Dropdown>
      <Button isIconOnly variant="ghost" className="rounded-xl">
        <EllipsisVertical size={16} />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => console.log(`Selected: ${key}`)}>
          <Dropdown.Item
            onAction={() => onEdit(product)}
            id="edit"
            textValue="Edit Product"
          >
            <Label>Edit Product</Label>
          </Dropdown.Item>
          <Dropdown.Item
            onAction={() => onDelete(product)}
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
