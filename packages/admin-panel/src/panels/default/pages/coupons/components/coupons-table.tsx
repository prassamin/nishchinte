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
import { TicketPercent } from "lucide-react";
import { useNishchinte } from "@nishchinte/hooks";
import type { CouponItem } from "@nishchinte/server/actions";
import { CouponsPagination } from "./coupons-pagination";
import { CouponValidityCell } from "./coupon-validity-cell";
import { CouponStatusSwitch } from "./coupon-status-switch";
import { CouponActionsDropdown } from "./coupon-actions-dropdown";

const TABLE_COLUMNS = [
  { name: "Name", id: "name", allowsSorting: true },
  { name: "Code", id: "code", allowsSorting: true },
  { name: "Amount", id: "amount", allowsSorting: true },
  { name: "Redemptions", id: "redemptions", allowsSorting: true },
  { name: "Per Customer", id: "per_customer", allowsSorting: true },
  { name: "Validity", id: "validity", allowsSorting: true },
  { name: "Status", id: "status", allowsSorting: true },
  { name: "", id: "actions", allowsSorting: false },
];

interface CouponsTableProps {
  coupons: CouponItem[];
  totalCoupons: number;
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
  onEditCoupon: (coupon: CouponItem) => void;
  onDeleteCoupon: (coupon: CouponItem) => void;
  onCopyCode: (code: string) => void;
}

export function CouponsTable({
  coupons,
  totalCoupons,
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
  onEditCoupon,
  onDeleteCoupon,
  onCopyCode,
}: CouponsTableProps) {
  const { formatMoney } = useNishchinte();

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });

  const sortedCoupons = useMemo(() => {
    if (!sortDescriptor?.column) return coupons;
    return [...coupons].sort((a, b) => {
      let first: any;
      let second: any;

      switch (sortDescriptor.column) {
        case "name":
          first = a.name?.toLowerCase() ?? "";
          second = b.name?.toLowerCase() ?? "";
          break;
        case "code":
          first = a.code?.toLowerCase() ?? "";
          second = b.code?.toLowerCase() ?? "";
          break;
        case "amount":
          first = Number(a.discountValue || 0);
          second = Number(b.discountValue || 0);
          break;
        case "redemptions":
          first = a.currentUses || 0;
          second = b.currentUses || 0;
          break;
        case "per_customer":
          first = a.maxUsesPerUser || 0;
          second = b.maxUsesPerUser || 0;
          break;
        case "validity":
          first = a.startDate
            ? new Date(a.startDate).getTime()
            : a.isLimitedTime
              ? 1
              : 0;
          second = b.startDate
            ? new Date(b.startDate).getTime()
            : b.isLimitedTime
              ? 1
              : 0;
          break;
        case "status":
          first = a.isActive ? 1 : 0;
          second = b.isActive ? 1 : 0;
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
  }, [coupons, sortDescriptor]);

  return (
    <Table>
      <Table.ScrollContainer
        className={cn(
          totalCoupons !== 0 ? "h-[calc(100dvh-310px)]" : "h-[50dvh]",
        )}
      >
        <Table.Content
          aria-label="Coupons table"
          className={cn("min-w-150", totalCoupons === 0 && "h-full")}
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
                    <TicketPercent className="size-6 text-ap-muted" />
                    <h2 className="text-ap-foreground">
                      {debouncedSearch
                        ? "No matching coupons found"
                        : "No coupons created yet"}
                    </h2>
                  </>
                )}
              </EmptyState>
            )}
          >
            {totalCoupons === 0
              ? []
              : sortedCoupons.map((coupon) => {
                  const isPercentage = coupon.type === "PERCENTAGE";
                  const isToggling = togglingId.includes(coupon.id);

                  return (
                    <Table.Row key={coupon.id} id={coupon.id}>
                      <Table.Cell className="pe-0 w-8">
                        <Checkbox
                          aria-label={`Select ${coupon.name}`}
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
                      <Table.Cell>{coupon.name}</Table.Cell>
                      <Table.Cell>{coupon.code}</Table.Cell>
                      <Table.Cell>
                        {isPercentage
                          ? `${coupon.discountValue}%`
                          : `${formatMoney(coupon.discountValue)}`}
                      </Table.Cell>
                      <Table.Cell>
                        {coupon.currentUses}/{coupon.maxUses || "∞"}
                      </Table.Cell>
                      <Table.Cell>{coupon.maxUsesPerUser}</Table.Cell>
                      <Table.Cell>
                        <CouponValidityCell coupon={coupon} />
                      </Table.Cell>
                      <Table.Cell>
                        <CouponStatusSwitch
                          isActive={coupon.isActive}
                          isDisabled={isToggling}
                          onToggle={(selected) =>
                            onToggleStatus(coupon.id, selected)
                          }
                        />
                      </Table.Cell>
                      <Table.Cell className="w-0 ring-0!">
                        <CouponActionsDropdown
                          coupon={coupon}
                          onEdit={onEditCoupon}
                          onCopyCode={onCopyCode}
                          onDelete={onDeleteCoupon}
                        />
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      <Table.Footer>
        <CouponsPagination
          page={page}
          totalPages={totalPages}
          totalCoupons={totalCoupons}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </Table.Footer>
    </Table>
  );
}
