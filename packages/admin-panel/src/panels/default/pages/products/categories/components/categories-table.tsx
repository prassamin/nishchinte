"use client";

import { useMemo, useState } from "react";
import {
  cn,
  EmptyState,
  Spinner,
  Table,
  type SortDescriptor,
} from "@heroui/react";
import {
  FolderTree,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  Image as ImageIcon,
} from "lucide-react";
import { useRouter } from "@bprogress/next";
import type { CategoryItem } from "@nishchinte/server/actions";
import type { CategoryTreeNode } from "@nishchinte/utils";
import {
  CategoryActionsDropdown,
  type DeleteTarget,
} from "./category-actions-dropdown";

const TABLE_COLUMNS = [
  { name: "Category Hierarchy", id: "name", allowsSorting: true },
  {
    name: "Parent",
    id: "parent",
    allowsSorting: true,
    className: "hidden md:table-cell",
  },
  { name: "Subcategories", id: "subcategories", allowsSorting: true },
  { name: "Products", id: "products", allowsSorting: true },
  { name: "", id: "actions", allowsSorting: false },
];

interface CategoriesTableProps {
  treeNodes: CategoryTreeNode<CategoryItem>[];
  totalCategories: number;
  isLoading: boolean;
  debouncedSearch: string;
  collapsedIds: Set<string>;
  onToggleCollapse: (id: string) => void;
  onAddSubcategory: (parentId: string, parentName: string) => void;
  onDeleteCategory: (target: DeleteTarget) => void;
}

export function CategoriesTable({
  treeNodes,
  totalCategories,
  isLoading,
  debouncedSearch,
  collapsedIds,
  onToggleCollapse,
  onAddSubcategory,
  onDeleteCategory,
}: CategoriesTableProps) {
  const router = useRouter();

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });

  // Flatten nodes based on collapsed state or sorting
  const flattenedRows = useMemo(() => {
    // If a non-default sort is applied, flatten all nodes and sort them
    if (sortDescriptor?.column && sortDescriptor.column !== "name") {
      const all: CategoryTreeNode<CategoryItem>[] = [];
      function collect(nodes: CategoryTreeNode<CategoryItem>[]) {
        for (const n of nodes) {
          all.push(n);
          if (n.children.length > 0) {
            collect(n.children);
          }
        }
      }
      collect(treeNodes);

      return all.sort((a, b) => {
        let first: any;
        let second: any;

        switch (sortDescriptor.column) {
          case "parent":
            first = a.data?.parent?.name?.toLowerCase() ?? "";
            second = b.data?.parent?.name?.toLowerCase() ?? "";
            break;
          case "subcategories":
            first = a.children.length;
            second = b.children.length;
            break;
          case "products":
            first = a.productCount;
            second = b.productCount;
            break;
          default:
            first = a.name.toLowerCase();
            second = b.name.toLowerCase();
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
    }

    // Default: Hierarchical tree order respecting collapsedIds
    const rows: CategoryTreeNode<CategoryItem>[] = [];
    function flatten(nodes: CategoryTreeNode<CategoryItem>[]) {
      // Sort siblings by name ascending or descending
      const sorted = [...nodes].sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return sortDescriptor.direction === "descending" ? -cmp : cmp;
      });

      for (const node of sorted) {
        rows.push(node);
        const isExpanded = !collapsedIds.has(node.id);
        if (node.children.length > 0 && isExpanded) {
          flatten(node.children);
        }
      }
    }
    flatten(treeNodes);
    return rows;
  }, [treeNodes, collapsedIds, sortDescriptor]);

  return (
    <Table>
      <Table.ScrollContainer
        className={cn(
          totalCategories !== 0 ? "h-[calc(100dvh-270px)]" : "h-[50dvh]",
        )}
      >
        <Table.Content
          aria-label="Categories table"
          className={cn("min-w-180", totalCategories === 0 && "h-full")}
          onRowAction={() => {}}
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        >
          <Table.Header className="sticky top-0 z-10">
            {TABLE_COLUMNS.map((column) => (
              <Table.Column
                className={cn("after:hidden", column.className)}
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
                    <FolderTree className="size-6 text-ap-muted" />
                    <h2 className="text-ap-foreground">
                      {debouncedSearch
                        ? "No matching categories found"
                        : "No categories created yet"}
                    </h2>
                  </>
                )}
              </EmptyState>
            )}
          >
            {totalCategories === 0
              ? []
              : flattenedRows.map((node) => {
                  const hasChildren = node.children.length > 0;
                  const isExpanded = !collapsedIds.has(node.id);

                  return (
                    <Table.Row
                      key={node.id}
                      id={node.id}
                      className="cursor-pointer hover:bg-ap-field-background/40 transition-colors group"
                      onClick={() =>
                        router.push(`/admin/products/categories/${node.slug}`)
                      }
                    >
                      {/* Column 1: Category Hierarchy */}
                      <Table.Cell>
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
                                isExpanded
                                  ? "Collapse subcategories"
                                  : "Expand subcategories"
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
                            <img
                              src={node.data.imageUrl}
                              alt={node.name}
                              className="h-8 w-8 shrink-0 rounded-lg border border-ap-border object-cover"
                            />
                          ) : (
                            <span className="grid h-8 w-8 shrink-0 place-content-center rounded-lg border border-ap-border bg-ap-field-background/60 text-ap-muted">
                              <ImageIcon size={14} />
                            </span>
                          )}

                          {/* Name and Slug */}
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-ap-foreground group-hover:text-ap-accent transition-colors">
                              {node.name}
                            </span>
                            <p className="text-[12px] text-ap-muted">
                              /{node.slug}
                            </p>
                          </div>
                        </div>
                      </Table.Cell>

                      {/* Column 2: Parent */}
                      <Table.Cell className="hidden md:table-cell">
                        {node.data?.parent ? (
                          <span className="inline-flex items-center gap-1 text-xs text-ap-muted">
                            <CornerDownRight
                              size={12}
                              className="text-ap-muted/60"
                            />
                            <span className="max-w-35 truncate font-medium text-ap-foreground">
                              {node.data.parent.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-ap-muted/60">—</span>
                        )}
                      </Table.Cell>

                      {/* Column 3: Subcategories */}
                      <Table.Cell>
                        {hasChildren ? (
                          <span className="inline-flex items-center rounded-lg bg-ap-field-background px-2 py-0.5 text-xs font-medium text-ap-foreground">
                            {node.children.length}{" "}
                            {node.children.length === 1 ? "child" : "children"}
                          </span>
                        ) : (
                          <span className="text-xs text-ap-muted/50">0</span>
                        )}
                      </Table.Cell>

                      {/* Column 4: Products */}
                      <Table.Cell>
                        <span className="text-sm text-ap-foreground font-medium">
                          {node.productCount}
                        </span>{" "}
                        <span className="text-xs text-ap-muted">
                          {node.productCount === 1 ? "product" : "products"}
                        </span>
                      </Table.Cell>

                      {/* Column 5: Actions */}
                      <Table.Cell className="w-0 ring-0!">
                        <CategoryActionsDropdown
                          node={node}
                          onAddSubcategory={onAddSubcategory}
                          onEditCategory={(slug) =>
                            router.push(`/admin/products/categories/${slug}`)
                          }
                          onDeleteCategory={onDeleteCategory}
                        />
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
