"use client";

import { useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast, type Selection } from "@heroui/react";
import Content from "../../components/content";
import { useConfirm } from "@nishchinte/confirm";
import {
  actions,
  type OrderStatus,
  type OrderSummaryItem,
} from "@nishchinte/server/actions";
import { debounce } from "@nishchinte/utils";
import {
  OrdersHeader,
  OrdersToolbar,
  OrdersTable,
} from "./components";

const DEFAULT_PAGE_SIZE = 15;

export function OrdersView() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  // Search, Status and Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "ALL">("ALL");
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());

  const updateSearchDebounced = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedSearch(value);
        setPage(1);
      }, 300),
    [],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    updateSearchDebounced(value);
  };

  const handleStatusChange = (status: OrderStatus | "ALL") => {
    setSelectedStatus(status);
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Orders Query
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "admin-orders",
      page,
      pageSize,
      debouncedSearch,
      selectedStatus,
    ],
    queryFn: async () => {
      const res = await actions.order.list({
        page,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
        status: selectedStatus,
      });

      if (!res.ok) {
        return {
          orders: [],
          pagination: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
          statusCounts: {},
          paymentCounts: {},
        };
      }
      return res;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const orders = data?.orders ?? [];
  const totalOrders = data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, data?.pagination?.totalPages ?? 1);
  const statusCounts = data?.statusCounts ?? {};

  // Reset page when out of range
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Reset selection on filters or page change
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [page, pageSize, debouncedSearch, selectedStatus]);

  const selectedIds: string[] =
    selectedKeys === "all"
      ? orders.map((o) => o.id)
      : Array.from(selectedKeys as Set<string>);

  const selectedCount = selectedIds.length;

  // Single Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await actions.order.delete(id);
      if (!res.ok) throw new Error(res.error || "Failed to delete order");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast("Success", {
        description: "Order deleted successfully",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to delete order",
        variant: "danger",
      });
    },
  });

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await actions.order.bulkDelete(ids);
      if (!res.ok) throw new Error(res.error || "Failed to delete orders");
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedKeys(new Set());
      toast("Success", {
        description: `Deleted ${ids.length} order(s) successfully`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to delete selected orders",
        variant: "danger",
      });
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      const res = await actions.order.updateStatus({ orderId, status });
      if (!res.ok) throw new Error(res.error || "Failed to update order status");
      return { orderId, status };
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order", vars.orderId] });
      toast("Success", {
        description: `Order status updated to ${vars.status}`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to update status",
        variant: "danger",
      });
    },
  });

  // Bulk Update Status Mutation
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: OrderStatus;
    }) => {
      const res = await actions.order.bulkUpdateStatus(ids, status);
      if (!res.ok)
        throw new Error(res.error || "Failed to bulk update order statuses");
      return { ids, status };
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedKeys(new Set());
      toast("Success", {
        description: `Updated status to ${vars.status} for ${vars.ids.length} order(s)`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to bulk update status",
        variant: "danger",
      });
    },
  });

  const handleDeleteOrder = (order: OrderSummaryItem) => {
    confirm({
      title: "Delete Order",
      description: `Are you sure you want to permanently delete order "${order.orderNumber}"? This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(order.id);
      },
    });
  };

  const handleBulkDelete = () => {
    confirm({
      title: `Delete ${selectedCount} Orders`,
      description: `Are you sure you want to permanently delete ${selectedCount} selected order(s)? This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        await bulkDeleteMutation.mutateAsync(selectedIds);
      },
    });
  };

  const handleBulkUpdateStatus = (status: OrderStatus) => {
    confirm({
      title: `Update ${selectedCount} Orders to ${status}`,
      description: `Are you sure you want to set status to "${status}" for ${selectedCount} selected order(s)?`,
      isDanger: status === "CANCELLED",
      onConfirm: async () => {
        await bulkUpdateStatusMutation.mutateAsync({
          ids: selectedIds,
          status,
        });
      },
    });
  };

  return (
    <Content>
      <OrdersHeader
        totalOrders={totalOrders}
        isFetching={isFetching}
        onRefresh={() => refetch()}
      />

      <OrdersToolbar
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusChange}
        statusCounts={statusCounts}
        selectedCount={selectedCount}
        onBulkDelete={handleBulkDelete}
        onBulkUpdateStatus={handleBulkUpdateStatus}
        isBulkUpdating={
          bulkUpdateStatusMutation.isPending || bulkDeleteMutation.isPending
        }
      />

      <OrdersTable
        orders={orders}
        totalOrders={totalOrders}
        totalPages={totalPages}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        debouncedSearch={debouncedSearch}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onUpdateStatus={(orderId, status) =>
          updateStatusMutation.mutate({ orderId, status })
        }
        onDeleteOrder={handleDeleteOrder}
      />
    </Content>
  );
}
