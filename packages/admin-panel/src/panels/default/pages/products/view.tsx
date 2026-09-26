"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast, type Selection } from "@heroui/react";
import Content from "../../components/content";
import { useConfirm } from "@nishchinte/confirm";
import { actions, type ProductItem } from "@nishchinte/server/actions";
import { debounce } from "@nishchinte/utils";
import {
  ProductsHeader,
  ProductsToolbar,
  ProductsTable,
} from "./components";

const DEFAULT_PAGE_SIZE = 10;

export function ProductsView() {
  const router = useRouter();
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

  // Selection and Status Toggling State
  const [togglingId, setTogglingId] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());

  // Products Query
  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", page, pageSize, debouncedSearch],
    queryFn: async () => {
      const res = await actions.product.list({
        page,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
      });

      if (!res.ok) {
        return {
          products: [],
          pagination: { page: 1, limit: pageSize, total: 0, totalPages: 1 },
        };
      }
      return res;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const products = (data?.products ?? []) as ProductItem[];
  const totalProducts = data?.pagination?.total ?? 0;
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
      ? products.map((p) => p.id)
      : Array.from(selectedKeys as Set<string>);

  const selectedCount = selectedIds.length;

  // Single Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await actions.product.delete(id);
      if (!res.ok) throw new Error(res.error || "Failed to delete product");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast("Success", {
        description: "Product deleted successfully",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to delete product",
        variant: "danger",
      });
    },
  });

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await actions.product.bulkDelete(ids);
      if (!res.ok) throw new Error(res.error || "Failed to delete products");
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setSelectedKeys(new Set());
      toast("Success", {
        description: `Successfully deleted ${ids.length} product${ids.length > 1 ? "s" : ""}`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err.message || "Failed to delete selected products",
        variant: "danger",
      });
    },
  });

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await actions.product.toggleStatus(id, "isActive");
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
          description: "Product status updated successfully",
          variant: "success",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
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
  const handleOpenEdit = (product: ProductItem) => {
    router.push(`/admin/products/new?edit=${product.id}`);
  };

  const handleCopyLink = (product: ProductItem) => {
    const url = `${window.location.origin}/products/${product.slug}`;
    navigator.clipboard.writeText(url);
    toast("Copied", {
      description: `Product link copied to clipboard`,
      variant: "success",
    });
  };

  const handleOpenDelete = async (product: ProductItem) => {
    await confirm({
      title: "Delete Product",
      description: `Are you sure you want to permanently delete "${product.name}"? This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(product.id);
      },
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await confirm({
      title: "Delete Selected Products",
      description: `Are you sure you want to permanently delete ${selectedIds.length} selected product${selectedIds.length > 1 ? "s" : ""}? This action cannot be undone.`,
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
      <ProductsHeader />

      {/* Toolbar / Search & Actions */}
      <ProductsToolbar
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
        selectedCount={selectedCount}
        isDeleting={bulkDeleteMutation.isPending}
        onBulkDelete={handleBulkDelete}
      />

      {/* HeroUI Table & Pagination */}
      <ProductsTable
        products={products}
        totalProducts={totalProducts}
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
        onEditProduct={handleOpenEdit}
        onDeleteProduct={handleOpenDelete}
        onCopyLink={handleCopyLink}
      />
    </Content>
  );
}
