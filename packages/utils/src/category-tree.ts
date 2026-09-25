export interface CategoryTreeNode<T = any> {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productCount: number;
  data: T;
  children: CategoryTreeNode<T>[];
  depth: number;
}

/**
 * Builds a hierarchical category tree from a flat list or partially nested category array.
 */
export function buildCategoryTree<T extends { id: string; name: string; slug?: string; parentId?: string | null; _count?: { products?: number } }>(
  categories: T[],
): CategoryTreeNode<T>[] {
  const map = new Map<string, CategoryTreeNode<T>>();
  const roots: CategoryTreeNode<T>[] = [];

  // Pass 1: Initialize nodes
  for (const cat of categories) {
    map.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug || cat.id,
      parentId: cat.parentId || null,
      productCount: cat._count?.products ?? 0,
      data: cat,
      children: [],
      depth: 0,
    });
  }

  // Pass 2: Link children to parents
  for (const cat of categories) {
    const node = map.get(cat.id);
    if (!node) continue;

    if (cat.parentId && map.has(cat.parentId)) {
      const parent = map.get(cat.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Pass 3: Set depth levels and aggregate counts
  function setDepthAndCounts(node: CategoryTreeNode<T>, depth: number): number {
    node.depth = depth;
    let totalCount = node.productCount;
    for (const child of node.children) {
      totalCount += setDepthAndCounts(child, depth + 1);
    }
    return totalCount;
  }

  for (const root of roots) {
    setDepthAndCounts(root, 0);
  }

  return roots;
}

/**
 * Finds the breadcrumb path of categories from root to the selected category.
 */
export function findCategoryPath<T extends { id: string; name: string; slug?: string; parentId?: string | null }>(
  categories: T[],
  targetIdOrSlug?: string | null,
): Array<{ id: string; name: string; slug: string }> {
  if (!targetIdOrSlug) return [];

  const path: Array<{ id: string; name: string; slug: string }> = [];
  const idMap = new Map<string, T>();
  const slugMap = new Map<string, T>();

  for (const cat of categories) {
    idMap.set(cat.id, cat);
    if (cat.slug) slugMap.set(cat.slug, cat);
  }

  let curr = idMap.get(targetIdOrSlug) || slugMap.get(targetIdOrSlug);
  while (curr) {
    path.unshift({
      id: curr.id,
      name: curr.name,
      slug: curr.slug || curr.id,
    });
    curr = curr.parentId ? idMap.get(curr.parentId) : undefined;
  }

  return path;
}

/**
 * Returns a Set containing the given category ID and all its descendant IDs.
 * Useful for preventing circular parent-child relations.
 */
export function getDescendantCategoryIds<T extends { id: string; parentId?: string | null }>(
  categories: T[],
  categoryId?: string | null,
): Set<string> {
  const result = new Set<string>();
  if (!categoryId) return result;

  result.add(categoryId);

  // Map parentId to array of child IDs
  const childrenMap = new Map<string, string[]>();
  for (const cat of categories) {
    if (cat.parentId) {
      const list = childrenMap.get(cat.parentId) || [];
      list.push(cat.id);
      childrenMap.set(cat.parentId, list);
    }
  }

  // BFS / DFS to collect all descendants
  const queue = [categoryId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const directChildren = childrenMap.get(current) || [];
    for (const childId of directChildren) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }

  return result;
}

/**
 * Flattens a category tree into a flat list with depth indentation for dropdown selects.
 */
export function flattenCategoryTree<T>(
  tree: CategoryTreeNode<T>[],
  indentChar = "— ",
): Array<{ id: string; name: string; displayName: string; depth: number; node: CategoryTreeNode<T> }> {
  const result: Array<{
    id: string;
    name: string;
    displayName: string;
    depth: number;
    node: CategoryTreeNode<T>;
  }> = [];

  function traverse(nodes: CategoryTreeNode<T>[]) {
    for (const node of nodes) {
      const indent = node.depth > 0 ? indentChar.repeat(node.depth) : "";
      result.push({
        id: node.id,
        name: node.name,
        displayName: `${indent}${node.name}`,
        depth: node.depth,
        node,
      });
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return result;
}
