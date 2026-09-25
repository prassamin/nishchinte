"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, Spinner, toast } from "@heroui/react";
import {
  FolderTree,
  Plus,
  Image as ImageIcon,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  Search,
  FolderPlus,
  ArrowUpRight,
  Trash2,
  AlertTriangle,
  Blocks,
} from "lucide-react";
import Content from "../../../components/content";
import { useRouter } from "@bprogress/next";
import {
  CategoryUpsertDrawer,
  type CategoryUpsertInput,
} from "../components/category-upsert-drawer";
import { actions, type CategoryItem } from "@nishchinte/server/actions";
import { buildCategoryTree, type CategoryTreeNode } from "@nishchinte/utils";

interface DeleteTarget {
  id: string;
  name: string;
  slug: string;
  parentName?: string | null;
  productCount: number;
  childrenCount: number;
}

interface CategoryRowItemProps {
  node: CategoryTreeNode<CategoryItem>;
  onAddSubcategory: (parentId: string, parentName: string) => void;
  onDeleteCategory: (target: DeleteTarget) => void;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
}

function CategoryTreeRow({
  node,
  onAddSubcategory,
  onDeleteCategory,
  collapsedIds,
  onToggleCollapse,
}: CategoryRowItemProps) {
  const router = useRouter();
  const hasChildren = node.children.length > 0;
  const isExpanded = !collapsedIds.has(node.id);

  return (
    <>
      <tr
        onClick={() => router.push(`/admin/products/categories/${node.slug}`)}
        className="group cursor-pointer border-b border-ap-border/50 transition-colors hover:bg-ap-field-background/40 last:border-0"
      >
        {/* Category Name & Hierarchy Indentation */}
        <td className="px-4 py-3">
          <div
            className="flex items-center gap-2.5"
            style={{ paddingLeft: `${node.depth * 24}px` }}
          >
            {/* Expand/Collapse or Branch indicator */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse(node.id);
                }}
                className="grid h-6 w-6 place-content-center rounded-md text-ap-muted transition-colors hover:bg-ap-field-background hover:text-ap-foreground"
                aria-label={
                  isExpanded ? "Collapse subcategories" : "Expand subcategories"
                }
              >
                {isExpanded ? (
                  <ChevronDown size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
              </button>
            ) : node.depth > 0 ? (
              <span className="grid h-6 w-6 place-content-center text-ap-muted/70">
                <CornerDownRight size={14} />
              </span>
            ) : (
              <span className="h-6 w-6" />
            )}

            {/* Thumbnail */}
            {node.data?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={node.data.imageUrl}
                alt={node.name}
                className="h-9 w-9 shrink-0 rounded-lg border border-ap-border object-cover"
              />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-content-center rounded-lg border border-ap-border bg-ap-field-background/60 text-ap-muted">
                <ImageIcon size={14} />
              </span>
            )}

            {/* Name and Slug */}
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-ap-foreground group-hover:text-ap-accent transition-colors">
                {node.name}
              </span>
              <p className="text-[12px] text-ap-muted">/{node.slug}</p>
            </div>
          </div>
        </td>

        {/* Parent Category Info */}
        <td className="hidden px-4 py-3 md:table-cell">
          {node.data?.parent ? (
            <span className="inline-flex items-center gap-1 text-xs text-ap-muted">
              <CornerDownRight size={12} className="text-ap-muted/60" />
              <span className="max-w-35 truncate font-medium text-ap-foreground">
                {node.data.parent.name}
              </span>
            </span>
          ) : (
            <span className="text-xs text-ap-muted/60">—</span>
          )}
        </td>

        {/* Subcategories Count */}
        <td className="px-4 py-3 text-sm text-ap-muted">
          {hasChildren ? (
            <span className="inline-flex items-center rounded-lg bg-ap-field-background px-2 py-0.5 text-xs font-medium text-ap-foreground">
              {node.children.length}{" "}
              {node.children.length === 1 ? "child" : "children"}
            </span>
          ) : (
            <span className="text-xs text-ap-muted/50">0</span>
          )}
        </td>

        {/* Products Count */}
        <td className="px-4 py-3 text-sm text-ap-foreground">
          <span className="font-medium">{node.productCount}</span>{" "}
          <span className="text-xs text-ap-muted">
            {node.productCount === 1 ? "product" : "products"}
          </span>
        </td>

        {/* Quick Actions */}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddSubcategory(node.id, node.name);
              }}
              title={`Add subcategory under ${node.name}`}
              className="grid h-7 w-7 place-content-center rounded-lg border border-ap-border text-ap-muted transition-colors hover:border-ap-border hover:bg-ap-field-background hover:text-ap-foreground"
            >
              <Blocks size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/admin/products/categories/${node.slug}`);
              }}
              title="Edit category details"
              className="grid h-7 w-7 place-content-center rounded-lg border border-ap-border text-ap-muted transition-colors hover:border-ap-border hover:bg-ap-field-background hover:text-ap-foreground"
            >
              <ArrowUpRight size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCategory({
                  id: node.id,
                  name: node.name,
                  slug: node.slug,
                  parentName: node.data?.parent?.name ?? null,
                  productCount: node.productCount,
                  childrenCount: node.children.length,
                });
              }}
              title={`Delete "${node.name}"`}
              className="grid h-7 w-7 place-content-center rounded-lg border border-ap-border text-ap-muted transition-colors hover:border-ap-danger/40 hover:bg-ap-danger/10 hover:text-ap-danger"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <CategoryTreeRow
              key={child.id}
              node={child}
              onAddSubcategory={onAddSubcategory}
              onDeleteCategory={onDeleteCategory}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </>
      )}
    </>
  );
}

export function CategoriesManagementView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [drawerConfig, setDrawerConfig] = useState<{
    isOpen: boolean;
    initialValues?: Partial<CategoryUpsertInput>;
    title?: string;
  }>({
    isOpen: false,
  });

  const { data: categories = [], isPending } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const data = await actions.product.category.list();
      if (!data.ok) {
        throw new Error(data.error || "Failed to fetch categories");
      }
      return data.categories;
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await actions.product.category.delete(id);
      if (!res.ok) {
        throw new Error(res.error || "Failed to delete category");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-details"] });
      toast.success(
        `Category "${deleteTarget?.name || ""}" deleted successfully`,
      );
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.danger(err?.message || "Failed to delete category");
    },
  });

  // Build tree
  const categoryTree = useMemo(() => {
    return buildCategoryTree(categories);
  }, [categories]);

  // Track collapsed IDs (empty by default means all nodes are expanded)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter by search query if present
  const filteredTree = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categoryTree;

    function filterNodes(
      nodes: CategoryTreeNode<CategoryItem>[],
    ): CategoryTreeNode<CategoryItem>[] {
      const result: CategoryTreeNode<CategoryItem>[] = [];
      for (const node of nodes) {
        const matchesSelf =
          node.name.toLowerCase().includes(query) ||
          node.slug.toLowerCase().includes(query);
        const filteredChildren = filterNodes(node.children);

        if (matchesSelf || filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren,
          });
        }
      }
      return result;
    }

    return filterNodes(categoryTree);
  }, [categoryTree, search]);

  const handleOpenCreate = (parentId?: string, parentName?: string) => {
    setDrawerConfig({
      isOpen: true,
      initialValues: parentId ? { parentId } : {},
      title: parentName ? `Add Subcategory to "${parentName}"` : "New Category",
    });
  };

  return (
    <Content>
      {/* Header Toolbar */}
      <div className="mb-6 rounded-2xl border border-ap-border bg-ap-surface px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2.5 text-ap-foreground">
            <span className="grid h-8 w-8 place-content-center rounded-lg bg-ap-accent/10 text-ap-accent">
              <FolderTree size={18} />
            </span>
            <div>
              <h1 className="text-lg leading-tight font-bold sm:text-xl">
                Categories
              </h1>
              <p className="text-xs text-ap-muted">
                Manage category nesting, subcategories, and catalog hierarchy
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ap-muted"
              />
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-44 sm:w-56 rounded-xl border border-ap-border bg-ap-field-background/50 pl-8 pr-3 text-xs text-ap-foreground placeholder:text-ap-muted/60 outline-none transition-all focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
              />
            </div>

            {/* New Category Button */}
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-ap-accent px-3.5 text-xs font-semibold text-ap-accent-foreground transition-opacity hover:opacity-90"
            >
              <Plus size={14} />
              New Category
            </button>
          </div>
        </div>
      </div>

      {isPending ? (
        <div className="flex h-44 items-center justify-center rounded-2xl border border-ap-border bg-ap-surface">
          <Spinner className="text-ap-accent" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-3xl border border-ap-border bg-ap-surface p-6 sm:p-8">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-content-center rounded-2xl bg-ap-accent/10 text-ap-accent">
              <FolderTree size={26} />
            </div>

            <h2 className="text-lg font-semibold text-ap-foreground">
              No categories found
            </h2>
            <p className="mt-2 text-sm text-ap-muted">
              Get started by creating your first product category. Categories
              help organize your products for easier navigation and discovery.
            </p>

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => handleOpenCreate()}
                className="inline-flex items-center gap-2 rounded-xl bg-ap-accent px-4 py-2.5 text-sm font-semibold text-ap-accent-foreground transition-opacity hover:opacity-90"
              >
                <Plus size={15} />
                Create First Category
              </button>
            </div>
          </div>
        </div>
      ) : filteredTree.length === 0 ? (
        <div className="rounded-2xl border border-ap-border bg-ap-surface p-8 text-center">
          <p className="text-sm font-medium text-ap-foreground">
            No matching categories for &ldquo;{search}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-3 text-xs font-medium text-ap-accent hover:underline"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ap-border bg-ap-surface shadow-xs">
          <div className="overflow-x-auto scrollbar-styled">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-ap-border bg-ap-field-background/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Category Hierarchy
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted md:table-cell">
                    Parent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Subcategories
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Products
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ap-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTree.map((node) => (
                  <CategoryTreeRow
                    key={node.id}
                    node={node}
                    onAddSubcategory={handleOpenCreate}
                    onDeleteCategory={setDeleteTarget}
                    collapsedIds={collapsedIds}
                    onToggleCollapse={toggleCollapse}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Subcategory Drawer */}
      <CategoryUpsertDrawer
        isOpen={drawerConfig.isOpen}
        onOpenChange={(open) =>
          setDrawerConfig((p) => ({ ...p, isOpen: open }))
        }
        mode="create"
        title={drawerConfig.title || "New Category"}
        submitLabel="Create Category"
        submittingLabel="Creating..."
        initialValues={drawerConfig.initialValues}
      />

      {/* Delete Confirmation Modal */}
      <Modal>
        <Modal.Backdrop
          isOpen={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open && !deleteMutation.isPending) {
              setDeleteTarget(null);
            }
          }}
        >
          <Modal.Container size="sm">
            <Modal.Dialog className="rounded-2xl border border-ap-border/60 bg-ap-surface p-6 shadow-2xl">
              <div className="flex items-start gap-3.5">
                <span className="grid h-10 w-10 shrink-0 place-content-center rounded-xl bg-ap-danger/10 text-ap-danger">
                  <AlertTriangle size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <Modal.Heading className="text-base font-bold text-ap-foreground">
                    Delete Category
                  </Modal.Heading>
                  <p className="mt-1 text-xs text-ap-muted">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-ap-foreground">
                      &ldquo;{deleteTarget?.name}&rdquo;
                    </span>
                    ? This action cannot be undone.
                  </p>
                </div>
              </div>

              {deleteTarget && (
                <div className="mt-4 space-y-2 rounded-xl bg-ap-field-background p-3 text-xs text-ap-muted">
                  <div className="flex justify-between">
                    <span>Slug:</span>
                    <span className="font-mono text-ap-foreground">
                      /{deleteTarget.slug}
                    </span>
                  </div>
                  {deleteTarget.childrenCount > 0 && (
                    <div className="flex justify-between text-amber-500">
                      <span>Subcategories:</span>
                      <span className="font-medium">
                        {deleteTarget.childrenCount}{" "}
                        {deleteTarget.parentName
                          ? `(will be moved under "${deleteTarget.parentName}")`
                          : `(will be promoted to top-level)`}
                      </span>
                    </div>
                  )}
                  {deleteTarget.productCount > 0 && (
                    <div className="flex justify-between text-amber-500">
                      <span>Linked Products:</span>
                      <span className="font-medium">
                        {deleteTarget.productCount} (will be unassigned)
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Modal.Footer className="mt-5 flex justify-end gap-2 p-0">
                <Button
                  type="button"
                  variant="outline"
                  isDisabled={deleteMutation.isPending}
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border-ap-border text-xs font-medium text-ap-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  isPending={deleteMutation.isPending}
                  isDisabled={deleteMutation.isPending}
                  onClick={() => {
                    if (deleteTarget) {
                      deleteMutation.mutate(deleteTarget.id);
                    }
                  }}
                  className="rounded-xl bg-ap-danger text-xs font-semibold text-white hover:opacity-90"
                >
                  {deleteMutation.isPending ? (
                    <Spinner size="sm" color="current" />
                  ) : (
                    "Delete"
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Content>
  );
}
