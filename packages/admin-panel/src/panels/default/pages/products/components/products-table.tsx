"use client";

import { useMemo, useState } from "react";
import {
  Checkbox,
  cn,
  EmptyState,
  Spinner,
  Table,
  type Selection,
  type SortDescriptor,
} from "@heroui/react";
import { Box, Package } from "lucide-react";
import { useNishchinte } from "@nishchinte/hooks";
import type { ProductItem } from "../types";
import { ProductsPagination } from "./products-pagination";
import { ProductStatusSwitch } from "./product-status-switch";
import { ProductActionsDropdown } from "./product-actions-dropdown";

const TABLE_COLUMNS = [
  { name: "Product", id: "name", allowsSorting: true },
  { name: "Status", id: "status", allowsSorting: true },
  { name: "Stock", id: "stock", allowsSorting: true },
  { name: "Price", id: "price", allowsSorting: true },
  { name: "Cost & Margin", id: "cost", allowsSorting: true },
  { name: "Category", id: "category", allowsSorting: true },
  { name: "Updated", id: "updatedAt", allowsSorting: true },
  { name: "", id: "actions", allowsSorting: false },
];

function formatDate(value?: Date | string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInventoryLabel(product: ProductItem) {
  if (product.inventoryQuantity === -1) {
    return { text: "Unlimited", tone: "text-ap-success" };
  }

  if (product.inventoryQuantity <= 0 || !product.inStock) {
    return { text: "Out of Stock", tone: "text-ap-danger" };
  }

  if (product.inventoryQuantity <= 5) {
    return {
      text: `Low Stock (${product.inventoryQuantity})`,
      tone: "text-ap-warning",
    };
  }

  return {
    text: `In Stock (${product.inventoryQuantity})`,
    tone: "text-ap-foreground",
  };
}

interface ProductsTableProps {
  products: ProductItem[];
  totalProducts: number;
  totalPages: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isLoading: boolean;
  debouncedSearch: string;
  selectedKeys: Selection;
  onSelectionChange: (keys: Selection) => void;
  togglingId: string[];
  onToggleStatus: (id: string, isActive: boolean) => void;
  onEditProduct: (product: ProductItem) => void;
  onDeleteProduct: (product: ProductItem) => void;
  onCopyLink?: (product: ProductItem) => void;
}

export function ProductsTable({
  products,
  totalProducts,
  totalPages,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  isLoading,
  debouncedSearch,
  selectedKeys,
  onSelectionChange,
  togglingId,
  onToggleStatus,
  onEditProduct,
  onDeleteProduct,
  onCopyLink,
}: ProductsTableProps) {
  const { formatMoney } = useNishchinte();

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });

  const sortedProducts = useMemo(() => {
    if (!sortDescriptor?.column) return products;
    return [...products].sort((a, b) => {
      let first: any;
      let second: any;

      switch (sortDescriptor.column) {
        case "name":
          first = a.name?.toLowerCase() ?? "";
          second = b.name?.toLowerCase() ?? "";
          break;
        case "status":
          first = a.isActive ? 1 : 0;
          second = b.isActive ? 1 : 0;
          break;
        case "stock":
          first = a.inventoryQuantity ?? 0;
          second = b.inventoryQuantity ?? 0;
          break;
        case "price":
          first = Number(a.price || 0);
          second = Number(b.price || 0);
          break;
        case "cost":
          first = Number(a.costPrice || 0);
          second = Number(b.costPrice || 0);
          break;
        case "category":
          first = a.category?.name?.toLowerCase() ?? "";
          second = b.category?.name?.toLowerCase() ?? "";
          break;
        case "updatedAt":
          first = new Date(a.updatedAt || a.createdAt).getTime();
          second = new Date(b.updatedAt || b.createdAt).getTime();
          break;
        default:
          first = (a as any)[sortDescriptor.column];
          second = (b as any)[sortDescriptor.column];
          break;
      }

      let cmp = 0;
      if (typeof first === "string" && typeof second === "string") {
        cmp = first.localeCompare(second);
      } else if (first < second) {
        cmp = -1;
      } else if (first > second) {
        cmp = 1;
      }

      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [products, sortDescriptor]);

  return (
    <Table>
      <Table.ScrollContainer
        className={cn(
          totalProducts !== 0 ? "h-[calc(100dvh-310px)]" : "h-[50dvh]",
        )}
      >
        <Table.Content
          aria-label="Products table"
          className={cn("min-w-220", totalProducts === 0 && "h-full")}
          selectedKeys={selectedKeys}
          selectionMode="multiple"
          onSelectionChange={onSelectionChange}
          onRowAction={() => {}}
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        >
          <Table.Header className="sticky top-0 z-10">
            <Table.Column className="pe-0 w-8">
              <Checkbox aria-label="Select all" slot="selection">
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
            </Table.Column>
            {TABLE_COLUMNS.map((column) => (
              <Table.Column
                className="after:hidden"
                key={column.id}
                id={column.id}
                isRowHeader={column.id === "name"}
                allowsSorting={column.allowsSorting}
              >
                {column.allowsSorting
                  ? ({ sortDirection }) => (
                      <Table.SortableColumnHeader sortDirection={sortDirection}>
                        {column.name}
                      </Table.SortableColumnHeader>
                    )
                  : column.name}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => (
              <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                {isLoading ? (
                  <Spinner />
                ) : (
                  <>
                    <Package className="size-6 text-ap-muted" />
                    <h2 className="text-ap-foreground">
                      {debouncedSearch
                        ? "No matching products found"
                        : "No products found in catalog"}
                    </h2>
                  </>
                )}
              </EmptyState>
            )}
          >
            {totalProducts === 0
              ? []
              : sortedProducts.map((product) => {
                  const image = product.media?.[0]?.url;
                  const inventory = getInventoryLabel(product);
                  const isToggling = togglingId.includes(product.id);
                  const hasCost = product.costPrice != null;
                  const marginAmount = hasCost
                    ? product.price - Number(product.costPrice)
                    : null;
                  const marginPercent =
                    hasCost && product.price > 0
                      ? (marginAmount! / product.price) * 100
                      : null;

                  return (
                    <Table.Row
                      key={product.id}
                      id={product.id}
                      className="data-[selected=true]:bg-ap-accent/10"
                    >
                      <Table.Cell className="pe-0 w-8">
                        <Checkbox
                          aria-label={`Select ${product.name}`}
                          slot="selection"
                          variant="secondary"
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      </Table.Cell>

                      <Table.Cell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-xl border border-ap-border bg-ap-field-background shrink-0">
                            {image ? (
                              <img
                                src={image}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-full w-full place-content-center text-ap-muted">
                                <Box size={16} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-64 truncate text-sm font-semibold text-ap-foreground">
                              {product.name}
                            </p>
                            <p className="max-w-64 truncate text-xs text-ap-muted">
                              {product.sku
                                ? `SKU: ${product.sku}`
                                : product.category?.name || "Uncategorized"}
                            </p>
                          </div>
                        </div>
                      </Table.Cell>

                      <Table.Cell>
                        <ProductStatusSwitch
                          isActive={product.isActive}
                          isDisabled={isToggling}
                          onToggle={(isActive) =>
                            onToggleStatus(product.id, isActive)
                          }
                        />
                      </Table.Cell>

                      <Table.Cell>
                        <span className={`text-xs font-semibold ${inventory.tone}`}>
                          {inventory.text}
                        </span>
                      </Table.Cell>

                      <Table.Cell>
                        <span className="font-semibold text-ap-foreground">
                          {formatMoney(product.price)}
                        </span>
                      </Table.Cell>

                      <Table.Cell>
                        <div>
                          <p className="text-ap-foreground text-xs">
                            {hasCost ? formatMoney(product.costPrice) : "—"}
                          </p>
                          <p className="text-[11px] text-ap-muted">
                            {marginAmount == null || marginPercent == null
                              ? "No cost"
                              : `${formatMoney(marginAmount)} (${marginPercent.toFixed(1)}%)`}
                          </p>
                        </div>
                      </Table.Cell>

                      <Table.Cell>
                        <span className="text-xs text-ap-muted">
                          {product.category?.name || "—"}
                        </span>
                      </Table.Cell>

                      <Table.Cell>
                        <span className="text-xs text-ap-muted">
                          {formatDate(product.updatedAt || product.createdAt)}
                        </span>
                      </Table.Cell>

                      <Table.Cell className="w-0 ring-0!">
                        <ProductActionsDropdown
                          product={product}
                          onEdit={onEditProduct}
                          onDelete={onDeleteProduct}
                        />
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      <Table.Footer>
        <ProductsPagination
          page={page}
          totalPages={totalPages}
          totalProducts={totalProducts}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </Table.Footer>
    </Table>
  );
}
