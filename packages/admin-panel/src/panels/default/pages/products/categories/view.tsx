"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@heroui/react";
import Content from "../../../components/content";
import {
  CategoryUpsertDrawer,
  type CategoryUpsertInput,
} from "../components/category-upsert-drawer";
import { actions, type CategoryItem } from "@nishchinte/server/actions";
import { buildCategoryTree, type CategoryTreeNode } from "@nishchinte/utils";
import {
  CategoriesHeader,
  CategoriesToolbar,
  CategoriesTable,
  CategoryDeleteModal,
  type DeleteTarget,
} from "./components";

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
      <CategoriesHeader onNewCategory={() => handleOpenCreate()} />

      <CategoriesToolbar
        searchInput={search}
        onSearchChange={(e) => setSearch(e.target.value)}
      />

      <CategoriesTable
        treeNodes={filteredTree}
        totalCategories={categories.length}
        isLoading={isPending}
        debouncedSearch={search}
        collapsedIds={collapsedIds}
        onToggleCollapse={toggleCollapse}
        onAddSubcategory={handleOpenCreate}
        onDeleteCategory={setDeleteTarget}
      />

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
      <CategoryDeleteModal
        deleteTarget={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
      />
    </Content>
  );
}
