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
import { actions, type CouponItem } from "@nishchinte/server/actions";
import { debounce } from "@nishchinte/utils";
import {
  CouponsHeader,
  CouponsToolbar,
  CouponsTable,
  CouponUpsertDrawer,
} from "./components";

const DEFAULT_PAGE_SIZE = 10;

export function CouponsView() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  // Search and Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Drawer and Selection State
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponItem | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [togglingId, setTogglingId] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());

  // Coupons Query
  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons", page, pageSize, debouncedSearch],
    queryFn: async () => {
      const res = await actions.coupon.list({
        page,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
      });

      if (!res.ok) {
        return {
          coupons: [],
          pagination: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
        };
      }
      return res;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const coupons = data?.coupons ?? [];
  const totalCoupons = data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, data?.pagination?.totalPages ?? 1);

  // Reset page when out of range
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Reset selected keys on page, page size, or search change
  useEffect(() => {
    setSelectedKeys(new Set());
  }, [page, pageSize, debouncedSearch]);

  const selectedIds: string[] =
    selectedKeys === "all"
      ? coupons.map((c) => c.id)
      : Array.from(selectedKeys as Set<string>);

  const selectedCount = selectedIds.length;

  // Single Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await actions.coupon.delete(id);
      if (!res.ok) throw new Error(res.error || "Failed to delete coupon");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast("Success", {
        description: "Coupon deleted successfully",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to delete coupon",
        variant: "danger",
      });
    },
  });

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(
        ids.map((id) => actions.coupon.delete(id)),
      );
      const failed = results.find((r) => !r.ok);
      if (failed)
        throw new Error(failed.error || "Failed to delete some coupons");
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setSelectedKeys(new Set());
      toast("Success", {
        description: `Successfully deleted ${ids.length} coupon${ids.length > 1 ? "s" : ""}`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to delete selected coupons",
        variant: "danger",
      });
    },
  });

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await actions.coupon.toggleStatus(id, isActive);
      if (!res.ok) throw new Error(res.error || "Failed to toggle status");
      return res;
    },
    onMutate: async () => {
      const toastId = toast("Updating status...", { isLoading: true });
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      if (context?.toastId) {
        toast.update(context.toastId, "Success", {
          description: "Status updated successfully",
          variant: "success",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (err: any, _variables, context) => {
      if (context?.toastId) {
        toast.update(context.toastId, "Error", {
          description: err.message || "Failed to toggle status",
          variant: "danger",
        });
      } else {
        toast("Error", {
          description: err.message || "Failed to toggle status",
          variant: "danger",
        });
      }
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.id) {
        setTogglingId((prev) => prev.filter((id) => id !== variables.id));
      }
    },
  });

  // Action Handlers
  const handleOpenCreate = () => {
    setSelectedCoupon(null);
    setDrawerMode("create");
    setDrawerOpen(true);
  };

  const handleOpenEdit = (coupon: CouponItem) => {
    setSelectedCoupon(coupon);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast("Copied", {
      description: `Coupon code '${code}' copied to clipboard`,
      variant: "success",
    });
  };

  const handleOpenDelete = async (coupon: CouponItem) => {
    await confirm({
      title: "Delete Coupon",
      description: `Are you sure you want to permanently delete coupon "${coupon.name}" (${coupon.code})?`,
      isDanger: true,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(coupon.id);
      },
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await confirm({
      title: "Delete Selected Coupons",
      description: `Are you sure you want to permanently delete ${selectedIds.length} selected coupon${selectedIds.length > 1 ? "s" : ""}? This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        await bulkDeleteMutation.mutateAsync(selectedIds);
      },
    });
  };

  const handleToggleStatus = (id: string, isActive: boolean) => {
    setTogglingId((prev) => (prev.includes(id) ? prev : [...prev, id]));
    toggleStatusMutation.mutate({ id, isActive });
  };

  return (
    <Content>
      {/* Page Header */}
      <CouponsHeader onNewCoupon={handleOpenCreate} />

      {/* Toolbar / Search & Actions */}
      <CouponsToolbar
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
        selectedCount={selectedCount}
        isDeleting={bulkDeleteMutation.isPending}
        onBulkDelete={handleBulkDelete}
      />

      {/* Table & Pagination */}
      <CouponsTable
        coupons={coupons}
        totalCoupons={totalCoupons}
        totalPages={totalPages}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
        debouncedSearch={debouncedSearch}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        togglingId={togglingId}
        onToggleStatus={handleToggleStatus}
        onEditCoupon={handleOpenEdit}
        onDeleteCoupon={handleOpenDelete}
        onCopyCode={handleCopyCode}
      />

      {/* Upsert Drawer */}
      <CouponUpsertDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        coupon={selectedCoupon}
      />
    </Content>
  );
}
