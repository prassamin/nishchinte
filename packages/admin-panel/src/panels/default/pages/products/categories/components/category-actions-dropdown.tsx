"use client";

import { Button, Dropdown, Label } from "@heroui/react";
import { EllipsisVertical, Blocks, ArrowUpRight, Trash2 } from "lucide-react";
import type { CategoryItem } from "@nishchinte/server/actions";
import type { CategoryTreeNode } from "@nishchinte/utils";

export interface DeleteTarget {
  id: string;
  name: string;
  slug: string;
  parentName?: string | null;
  productCount: number;
  childrenCount: number;
}

interface CategoryActionsDropdownProps {
  node: CategoryTreeNode<CategoryItem>;
  onAddSubcategory: (parentId: string, parentName: string) => void;
  onEditCategory: (slug: string) => void;
  onDeleteCategory: (target: DeleteTarget) => void;
}

export function CategoryActionsDropdown({
  node,
  onAddSubcategory,
  onEditCategory,
  onDeleteCategory,
}: CategoryActionsDropdownProps) {
  const deleteTarget: DeleteTarget = {
    id: node.id,
    name: node.name,
    slug: node.slug,
    parentName: node.data?.parent?.name ?? null,
    productCount: node.productCount,
    childrenCount: node.children.length,
  };

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => onAddSubcategory(node.id, node.name)}
        title={`Add subcategory under "${node.name}"`}
        className="hidden sm:grid h-7 w-7 place-content-center rounded-lg border border-ap-border text-ap-muted transition-colors hover:bg-ap-field-background hover:text-ap-foreground"
      >
        <Blocks size={13} />
      </button>

      <button
        type="button"
        onClick={() => onEditCategory(node.slug)}
        title="View / edit category details"
        className="hidden sm:grid h-7 w-7 place-content-center rounded-lg border border-ap-border text-ap-muted transition-colors hover:bg-ap-field-background hover:text-ap-foreground"
      >
        <ArrowUpRight size={13} />
      </button>

      <Dropdown>
        <Button isIconOnly variant="ghost" className="rounded-xl h-7 w-7 min-w-7">
          <EllipsisVertical size={14} />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={(key) => console.log(`Selected: ${key}`)}>
            <Dropdown.Item
              onAction={() => onAddSubcategory(node.id, node.name)}
              id="add-subcategory"
              textValue="Add Subcategory"
            >
              <Label className="flex items-center gap-2">
                <Blocks size={14} />
                Add Subcategory
              </Label>
            </Dropdown.Item>
            <Dropdown.Item
              onAction={() => onEditCategory(node.slug)}
              id="view-details"
              textValue="Edit Category Details"
            >
              <Label className="flex items-center gap-2">
                <ArrowUpRight size={14} />
                Edit Category Details
              </Label>
            </Dropdown.Item>
            <Dropdown.Item
              onAction={() => onDeleteCategory(deleteTarget)}
              id="delete"
              variant="danger"
              textValue="Delete Category"
            >
              <Label className="flex items-center gap-2">
                <Trash2 size={14} />
                Delete Category
              </Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
