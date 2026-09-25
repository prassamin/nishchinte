"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Spinner, toast } from "@heroui/react";
import {
  Box,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Content from "../../components/content";
import { useConfirm } from "@nishchinte/confirm";
import { actions } from "@nishchinte/server/actions";
import { useNishchinte } from "@nishchinte/hooks";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  costPrice?: number | null;
  images: string[];
  inStock: boolean;
  isActive: boolean;
  inventoryQty: number;
  categoryId?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
};

const PAGE_SIZE = 12;

function formatDate(value?: Date | string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInventoryLabel(product: Product) {
  if (product.inventoryQty === -1) {
    return { text: "Unlimited", tone: "text-ap-success" };
  }

  if (product.inventoryQty <= 0 || !product.inStock) {
    return { text: "Out of Stock", tone: "text-ap-danger" };
  }

  if (product.inventoryQty <= 5) {
    return {
      text: `Low Stock (${product.inventoryQty})`,
      tone: "text-ap-warning",
    };
  }

  return {
    text: `In Stock (${product.inventoryQty})`,
    tone: "text-ap-foreground",
  };
}

export function ProductsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const { formatMoney } = useNishchinte();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await actions.product.delete(productId);
      if (!res.ok) throw new Error(res.error || "Failed to delete product");
      return productId;
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
        description: err.message || "Could not delete product",
        variant: "danger",
      });
    },
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-products", page, PAGE_SIZE, search],
    queryFn: async () => {
      const res = await actions.product.list({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
      });
      if (!res.ok) {
        return {
          products: [],
          pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
        };
      }
      return {
        products: res.products.map((p) => ({
          ...p,
          images: p.media.map((m) => m.url),
          inventoryQty: p.inventoryQuantity,
        })),
        pagination: res.pagination,
      };
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const products = (data?.products ?? []) as unknown as Product[];
  const totalProducts = data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, data?.pagination?.totalPages ?? 1);
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <Content>
      <div className="mb-6 rounded-2xl border border-ap-border bg-ap-surface px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2.5 text-ap-foreground">
            <Boxes size={18} className="text-ap-muted" />
            <h1 className="text-[22px] leading-none font-bold">Products</h1>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-ap-accent px-3 py-1.5 text-xs font-semibold text-ap-accent-foreground hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Add Product
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-44 items-center justify-center rounded-2xl border border-ap-border bg-ap-surface">
          <div className="flex items-center gap-2 text-sm text-ap-muted">
            <Spinner size="sm" className="text-ap-accent" />
            Loading products...
          </div>
        </div>
      ) : totalProducts === 0 ? (
        <div className="rounded-3xl border border-ap-border bg-ap-surface p-6 sm:p-8">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-content-center rounded-2xl bg-ap-accent/10 text-ap-accent">
              <Package size={26} />
            </div>

            <h2 className="text-lg font-semibold text-ap-foreground">
              No products found
            </h2>
            <p className="mt-2 text-sm text-ap-muted">
              Get started by adding your first product to your catalog. You can
              manage prices, inventory, variations, and categories right here.
            </p>

            <div className="mt-5 flex justify-center">
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-2 rounded-xl bg-ap-accent px-4 py-2.5 text-sm font-semibold text-ap-accent-foreground transition-opacity hover:opacity-90"
              >
                <Plus size={15} />
                Add First Product
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ap-border bg-ap-surface">
          {isFetching && (
            <div className="flex items-center gap-2 border-b border-ap-border bg-ap-field-background/60 px-4 py-2 text-xs text-ap-muted">
              <Spinner size="sm" className="text-ap-accent" />
              Refreshing...
            </div>
          )}
          <div className="overflow-x-auto scrollbar-styled">
            <table className="w-full min-w-245 border-collapse">
              <thead>
                <tr className="border-b border-ap-border bg-ap-field-background/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Cost & Margin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className={isFetching ? "opacity-70" : "opacity-100"}>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center">
                      <p className="text-sm font-medium text-ap-foreground">
                        No products on this page
                      </p>
                      <button
                        type="button"
                        onClick={() => setPage(1)}
                        className="mt-3 inline-flex items-center rounded-lg border border-ap-border px-3 py-1.5 text-xs font-semibold text-ap-foreground transition-colors hover:bg-ap-field-background"
                      >
                        Go to First Page
                      </button>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const image = product.images?.[0];
                    const inventory = getInventoryLabel(product);
                    const hasCost = product.costPrice != null;
                    const marginAmount = hasCost
                      ? product.price - Number(product.costPrice)
                      : null;
                    const marginPercent =
                      hasCost && product.price > 0
                        ? (marginAmount! / product.price) * 100
                        : null;

                    return (
                      <tr
                        key={product.id}
                        className="border-b border-ap-border/60 hover:bg-ap-field-background/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 overflow-hidden rounded-xl border border-ap-border bg-ap-field-background">
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
                            <div>
                              <p className="max-w-70 truncate text-sm font-semibold text-ap-foreground">
                                {product.name}
                              </p>
                              <p className="max-w-70 truncate text-xs text-ap-muted">
                                {product.category?.name || "Uncategorized"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              product.inStock
                                ? "bg-ap-success/10 text-ap-success"
                                : "bg-ap-muted/15 text-ap-muted"
                            }`}
                          >
                            {product.inStock ? "Active" : "Draft"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-sm">
                          <span className={inventory.tone}>
                            {inventory.text}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-sm font-semibold text-ap-foreground">
                          {formatMoney(product.price)}
                        </td>

                        <td className="px-4 py-3 text-sm">
                          <p className="text-ap-foreground">
                            {hasCost ? formatMoney(product.costPrice) : "—"}
                          </p>
                          <p className="text-xs text-ap-muted">
                            {marginAmount == null || marginPercent == null
                              ? "No cost"
                              : `${formatMoney(marginAmount)} (${marginPercent.toFixed(1)}%)`}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-sm text-ap-foreground">
                          {product.category?.name || "—"}
                        </td>

                        <td className="px-4 py-3 text-sm text-ap-muted">
                          {formatDate(product.updatedAt || product.createdAt)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/admin/products/new?edit=${product.id}`,
                                )
                              }
                              aria-label="Edit product"
                              title="Edit"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ap-border/80 bg-ap-field-background text-ap-muted transition-all hover:border-ap-accent/50 hover:bg-ap-accent/10 hover:text-ap-accent focus:outline-none focus:ring-2 focus:ring-ap-accent-soft"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                await confirm({
                                  title: "Delete Product",
                                  description: `Are you sure you want to permanently delete "${product.name}"?`,
                                  isDanger: true,
                                  onConfirm: async () => {
                                    await deleteMutation.mutateAsync(
                                      product.id,
                                    );
                                  },
                                });
                              }}
                              aria-label="Delete product"
                              title="Delete"
                              disabled={deleteMutation.isPending}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ap-border/80 bg-ap-field-background text-ap-muted transition-all hover:border-ap-danger/40 hover:bg-ap-danger/10 hover:text-ap-danger focus:outline-none focus:ring-2 focus:ring-ap-danger-soft-hover disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ap-border p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1 || isFetching}
                className="inline-flex items-center gap-1 rounded-lg border border-ap-border px-2.5 py-1.5 text-xs font-medium text-ap-foreground disabled:cursor-not-allowed disabled:opacity-50 hover:bg-ap-field-background transition-colors"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="text-xs text-ap-muted">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={
                  safePage >= totalPages ||
                  products.length < PAGE_SIZE ||
                  isFetching
                }
                className="inline-flex items-center gap-1 rounded-lg border border-ap-border px-2.5 py-1.5 text-xs font-medium text-ap-foreground disabled:cursor-not-allowed disabled:opacity-50 hover:bg-ap-field-background transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </Content>
  );
}
