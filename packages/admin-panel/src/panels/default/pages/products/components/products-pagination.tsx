"use client";

import { Button, Dropdown, Label, Pagination } from "@heroui/react";
import { ChevronDown } from "lucide-react";

interface ProductsPaginationProps {
  page: number;
  totalPages: number;
  totalProducts: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function ProductsPagination({
  page,
  totalPages,
  totalProducts,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: ProductsPaginationProps) {
  const safePage = Math.min(page, totalPages);
  const startItem = totalProducts === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalProducts);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (safePage > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safePage < totalPages - 2) {
        pages.push("ellipsis");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <Pagination size="sm" className="w-full flex-wrap justify-between gap-3">
      <div className="flex items-center gap-3">
        <Pagination.Summary>
          Showing {startItem}–{endItem} of {totalProducts} results
        </Pagination.Summary>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-ap-muted">
            <span>Rows:</span>
            <Dropdown>
              <Button
                size="sm"
                variant="outline"
                className="h-7 min-w-14 gap-1 rounded-lg border-ap-border px-2 text-xs font-medium text-ap-foreground hover:bg-ap-field-background"
              >
                <span>{pageSize}</span>
                <ChevronDown size={12} className="text-ap-muted" />
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  selectedKeys={new Set([String(pageSize)])}
                  selectionMode="single"
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    if (selected) {
                      onPageSizeChange(Number(selected));
                    }
                  }}
                >
                  {pageSizeOptions.map((size) => (
                    <Dropdown.Item
                      key={size}
                      id={String(size)}
                      textValue={`${size} per page`}
                    >
                      <Label>{size} per page</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        )}
      </div>

      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={safePage <= 1}
            onPress={() => onPageChange(Math.max(1, page - 1))}
          >
            <Pagination.PreviousIcon />
            <span>Previous</span>
          </Pagination.Previous>
        </Pagination.Item>
        {getPageNumbers().map((p, i) =>
          p === "ellipsis" ? (
            <Pagination.Item key={`ellipsis-${i}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={p}>
              <Pagination.Link
                isActive={p === safePage}
                onPress={() => onPageChange(p)}
              >
                {p}
              </Pagination.Link>
            </Pagination.Item>
          ),
        )}
        <Pagination.Item>
          <Pagination.Next
            isDisabled={safePage >= totalPages}
            onPress={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            <span>Next</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}
