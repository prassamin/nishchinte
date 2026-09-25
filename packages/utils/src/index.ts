// Routing & Matchers
export { createRouteMatcher } from "./route-matcher";

// Avatar Utilities
export { getAvatar, getAvatarSync, getAvatarSeed } from "./avatar";

// Path & File Helpers
export { cleanPath, sanitizeFilename, joinStoragePath } from "./path";

// Formatting & Size Utilities
export {
  toHumanSize,
  truncateText,
  markdownToPlain,
  type MarkdownToPlainOptions,
} from "./format";

// Slug Utilities
export {
  slugify,
  sanitizeSlug,
  slugifyPath,
  getLeafSegment,
  getParentPath,
  buildHierarchicalSlug,
  type SlugifyOptions,
} from "./slug";

// Function & Timing Utilities
export { debounce } from "./debounce";

// Category Hierarchy & Tree Utilities
export {
  buildCategoryTree,
  findCategoryPath,
  getDescendantCategoryIds,
  flattenCategoryTree,
  type CategoryTreeNode,
} from "./category-tree";

