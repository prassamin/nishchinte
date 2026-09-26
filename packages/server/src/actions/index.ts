import {
  setupInitialAdminAction,
  signInAdminAction,
  signOutAdminAction,
  getTeamMembersAction,
  createTeamMemberAction,
  updateTeamMemberAction,
  deleteTeamMemberAction,
  hasAdminUserAction,
} from "./admin";
import {
  listStorageAction,
  createStorageFolderAction,
  uploadStorageAction,
  renameStorageItemAction,
  moveStorageItemsAction,
  deleteStorageItemsAction,
  getStorageUrlAction,
} from "./storage";
import {
  listProductsAction,
  getProductByIdAction,
  getProductBySlugAction,
  checkProductSlugAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
  bulkDeleteProductsAction,
  toggleProductStatusAction,
  listCategoriesAction,
  getCategoryByIdAction,
  getCategoryBySlugAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  listTagsAction,
  createTagAction,
  deleteTagAction,
} from "./products";
import {
  listCouponsAction,
  getCouponByIdAction,
  getCouponByCodeAction,
  checkCouponCodeAction,
  createCouponAction,
  updateCouponAction,
  deleteCouponAction,
  bulkDeleteCouponsAction,
  toggleCouponStatusAction,
  validateCouponForCheckoutAction,
} from "./coupons";
import {
  sendCustomerOtpAction,
  verifyCustomerOtpAction,
  signInCustomerPasswordAction,
  signUpCustomerAction,
  signOutCustomerAction,
  getCurrentCustomerProfileAction,
  updateCustomerProfileAction,
  listCustomerAddressesAction,
  createCustomerAddressAction,
  updateCustomerAddressAction,
  deleteCustomerAddressAction,
  setDefaultCustomerAddressAction,
  listCustomerIdentitiesAction,
  linkCustomerIdentityAction,
  verifyCustomerIdentityAction,
  unlinkCustomerIdentityAction,
  sendPasswordResetAction,
  updatePasswordAction,
} from "./customer";
import {
  createOrderAction,
  getOrderByIdAction,
  listOrdersAction,
  listCustomerOrdersAction,
  updateOrderAction,
  updateOrderStatusAction,
  deleteOrderAction,
  bulkDeleteOrdersAction,
  bulkUpdateOrderStatusAction,
} from "./orders";

/**
 * Centralized server actions registry for Nishchinte E-commerce platform.
 * Provides unified access to all administrative, storage, product, and coupon actions.
 *
 * @example
 * ```ts
 * import { actions } from "@nishchinte/server/actions";
 *
 * // Create a coupon
 * const result = await actions.coupon.create({
 *   name: "Summer Sale 20% Off",
 *   code: "SUMMER20",
 *   type: "PERCENTAGE",
 *   discountValue: 20,
 * });
 *
 * // Validate during checkout
 * const validation = await actions.coupon.validate({
 *   code: "SUMMER20",
 *   cartItems: [{ productId: "prod_1", price: 100, quantity: 2 }],
 * });
 * ```
 */
export const actions = {
  /**
   * Administrative and team management server actions.
   */
  admin: {
    /**
     * Initializes the initial super administrator account if no admin accounts exist.
     *
     * @param data - User creation attributes (email, password, name, role).
     * @returns The newly created super administrator user or error.
     */
    setupInitialAdmin: setupInitialAdminAction,

    /**
     * Authenticates an admin user using their email and password credentials.
     *
     * @param data - Sign in payload with email and password.
     * @returns Admin session payload and redirect URL or error.
     */
    signIn: signInAdminAction,

    /**
     * Signs out the active admin user and destroys the session.
     */
    signOut: signOutAdminAction,

    /**
     * Checks if an admin user exists in the database.
     *
     * @returns True if an admin user exists, false otherwise.
     */
    hasAdmin: hasAdminUserAction,

    /**
     * Retrieves all team members and administrator accounts.
     *
     * @returns A list of team members with roles and metadata.
     */
    listUser: getTeamMembersAction,

    /**
     * Creates a new team member / administrator account.
     *
     * @param data - User attributes and assigned permissions/role.
     * @returns The created team member or error.
     */
    createUser: createTeamMemberAction,

    /**
     * Updates an existing team member's profile, role, or credentials.
     *
     * @param userId - Unique identifier of the user to update.
     * @param data - Attributes to update.
     * @returns The updated team member result.
     */
    updateUser: updateTeamMemberAction,

    /**
     * Deletes a team member / administrator account.
     *
     * @param userId - Unique identifier of the user to delete.
     * @returns Success status or error.
     */
    deleteUser: deleteTeamMemberAction,
  },

  /**
   * Cloud media and asset storage server actions.
   */
  storage: {
    /**
     * Lists files and folders in storage with pagination, search, and directory navigation.
     *
     * @param input - Listing options (folder path, pagination, search, sorting).
     * @returns Paginated list of storage items and directory metadata.
     */
    list: listStorageAction,

    /**
     * Creates a new folder in storage.
     *
     * @param name - Name of the new folder.
     * @param parentPath - Optional parent directory path.
     * @returns The created folder item or error.
     */
    createFolder: createStorageFolderAction,

    /**
     * Uploads one or more files to storage via FormData.
     *
     * @param formData - FormData containing files and optional destination path.
     * @returns Upload result with file metadata and accessible URLs.
     */
    upload: uploadStorageAction,

    /**
     * Renames an existing storage file or folder.
     *
     * @param oldPath - Full current path of the item.
     * @param newName - New name for the item.
     * @returns The updated storage item or error.
     */
    rename: renameStorageItemAction,

    /**
     * Moves storage items to a target directory.
     *
     * @param paths - Array of item paths to move.
     * @param targetFolder - Destination directory path.
     * @returns Success status or error.
     */
    move: moveStorageItemsAction,

    /**
     * Deletes one or more files or folders from storage.
     *
     * @param paths - Array of item paths to delete.
     * @returns Success status or error.
     */
    delete: deleteStorageItemsAction,

    /**
     * Generates a public or signed temporary URL for a stored asset.
     *
     * @param path - Storage path of the file.
     * @param options - URL generation options (e.g. download trigger, expiration time).
     * @returns Accessible URL string or error.
     */
    getUrl: getStorageUrlAction,
  },

  /**
   * Product catalog management, categories, and tags server actions.
   */
  product: {
    /**
     * Lists products with pagination, search, filters (status, category), and sorting.
     *
     * @param options - Listing, filter, and pagination options.
     * @returns Paginated list of products.
     */
    list: listProductsAction,

    /**
     * Retrieves a single product by its unique ID including variants, categories, and media.
     *
     * @param id - Unique product ID.
     * @returns The product details or null if not found.
     */
    getById: getProductByIdAction,

    /**
     * Retrieves a single product by its SEO slug.
     *
     * @param slug - Product URL slug.
     * @returns The product details or null if not found.
     */
    getBySlug: getProductBySlugAction,

    /**
     * Checks whether a product slug is unique and available.
     *
     * @param slug - The slug candidate to verify.
     * @param excludeId - Optional product ID to exclude from uniqueness check (for edits).
     * @returns Object indicating availability `{ available: boolean }`.
     */
    checkSlug: checkProductSlugAction,

    /**
     * Creates a new product with variants, media gallery, categories, and tags.
     *
     * @param input - Product creation payload.
     * @returns The created product item or error.
     */
    create: createProductAction,

    /**
     * Updates an existing product, syncing variants, prices, and relationships.
     *
     * @param id - Unique product ID.
     * @param input - Product update payload.
     * @returns The updated product item or error.
     */
    update: updateProductAction,

    /**
     * Deletes a single product by ID.
     *
     * @param id - Unique product ID.
     * @returns Success status or error.
     */
    delete: deleteProductAction,

    /**
     * Bulk deletes multiple products by their IDs.
     *
     * @param ids - Array of product IDs to delete.
     * @returns Count of deleted products or error.
     */
    bulkDelete: bulkDeleteProductsAction,

    /**
     * Toggles or sets the publishing status of a product (e.g. DRAFT, PUBLISHED, ARCHIVED).
     *
     * @param id - Unique product ID.
     * @param status - Optional explicit target status.
     * @returns The updated status or error.
     */
    toggleStatus: toggleProductStatusAction,

    /**
     * Product category management server actions.
     */
    category: {
      /**
       * Lists product categories with hierarchy tree or flat layout.
       *
       * @param options - Category listing and filtering options.
       * @returns List of categories.
       */
      list: listCategoriesAction,

      /**
       * Retrieves a single category by ID.
       *
       * @param id - Category ID.
       * @param options - Include options (parent, children, products count).
       * @returns The category details or null.
       */
      getById: getCategoryByIdAction,

      /**
       * Retrieves a single category by its slug.
       *
       * @param slug - Category slug.
       * @param options - Include options.
       * @returns The category details or null.
       */
      getBySlug: getCategoryBySlugAction,

      /**
       * Creates a new product category.
       *
       * @param input - Category creation input.
       * @returns The created category or error.
       */
      create: createCategoryAction,

      /**
       * Updates an existing product category.
       *
       * @param id - Category ID.
       * @param input - Category update input.
       * @returns The updated category or error.
       */
      update: updateCategoryAction,

      /**
       * Deletes a product category.
       *
       * @param id - Category ID.
       * @returns Success status or error.
       */
      delete: deleteCategoryAction,
    },

    /**
     * Product tag management server actions.
     */
    tag: {
      /**
       * Lists product tags with optional search.
       *
       * @param options - Tag listing options.
       * @returns List of tags.
       */
      list: listTagsAction,

      /**
       * Creates a new product tag.
       *
       * @param input - Tag creation input.
       * @returns The created tag or error.
       */
      create: createTagAction,

      /**
       * Deletes a product tag by ID.
       *
       * @param id - Tag ID.
       * @returns Success status or error.
       */
      delete: deleteTagAction,
    },
  },

  /**
   * Discount coupon and promotion server actions.
   */
  coupon: {
    /**
     * Lists discount coupons with pagination, search, status/type/target filters, and sorting.
     *
     * @param options - Listing and filter parameters.
     * @returns Paginated list of coupons and metadata.
     */
    list: listCouponsAction,

    /**
     * Retrieves a single coupon by its ID.
     *
     * @param id - Unique coupon ID.
     * @returns The coupon details or null if not found.
     */
    getById: getCouponByIdAction,

    /**
     * Retrieves a single coupon by its code (case-insensitive).
     *
     * @param code - Coupon code string.
     * @returns The coupon details or null if not found.
     */
    getByCode: getCouponByCodeAction,

    /**
     * Checks if a coupon code is unique and available.
     *
     * @param code - The coupon code to check.
     * @param excludeId - Optional coupon ID to exclude (during edit).
     * @returns Object indicating availability `{ available: boolean }`.
     */
    checkCode: checkCouponCodeAction,

    /**
     * Creates a new discount coupon with validation, date ranges, usage limits, and product targeting.
     *
     * @param input - Coupon creation payload.
     * @returns The created coupon item or error.
     */
    create: createCouponAction,

    /**
     * Updates an existing discount coupon.
     *
     * @param id - Unique coupon ID.
     * @param input - Coupon update payload.
     * @returns The updated coupon item or error.
     */
    update: updateCouponAction,

    /**
     * Deletes a discount coupon by ID.
     *
     * @param id - Unique coupon ID.
     * @returns Success status or error.
     */
    delete: deleteCouponAction,

    /**
     * Bulk deletes multiple coupons by their IDs.
     *
     * @param ids - Array of coupon IDs to delete.
     * @returns Count of deleted coupons or error.
     */
    bulkDelete: bulkDeleteCouponsAction,

    /**
     * Toggles or sets the active status of a coupon.
     *
     * @param id - Unique coupon ID.
     * @param isActive - Optional explicit active boolean state.
     * @returns The updated active status or error.
     */
    toggleStatus: toggleCouponStatusAction,

    /**
     * Evaluates and validates a coupon for a shopping cart checkout.
     * Checks validity period, usage limits, targeted products/categories, minimum purchase amount,
     * and calculates the exact flat or percentage discount amount (with max cap applied).
     *
     * @param params - Validation input with coupon code, customer info, and cart items.
     * @returns Validation outcome with calculated discount amounts or descriptive error.
     */
    validate: validateCouponForCheckoutAction,
  },

  /**
   * Customer authentication, account, and address management server actions.
   */
  customer: {
    /**
     * Sends an OTP verification code to customer phone or email.
     */
    sendOtp: sendCustomerOtpAction,

    /**
     * Verifies an OTP code and signs in/registers the customer.
     */
    verifyOtp: verifyCustomerOtpAction,

    /**
     * Signs in a customer using identifier and password.
     */
    signInPassword: signInCustomerPasswordAction,

    /**
     * Registers a new customer account.
     */
    signUp: signUpCustomerAction,

    /**
     * Signs out the active customer session.
     */
    signOut: signOutCustomerAction,

    /**
     * Retrieves the profile of the currently authenticated customer.
     */
    getProfile: getCurrentCustomerProfileAction,

    /**
     * Updates profile details of the currently authenticated customer.
     */
    updateProfile: updateCustomerProfileAction,

    /**
     * Customer delivery address management.
     */
    addresses: {
      list: listCustomerAddressesAction,
      create: createCustomerAddressAction,
      update: updateCustomerAddressAction,
      delete: deleteCustomerAddressAction,
      setDefault: setDefaultCustomerAddressAction,
    },

    /**
     * Customer authentication identities & multi-provider management.
     */
    identities: {
      list: listCustomerIdentitiesAction,
      link: linkCustomerIdentityAction,
      verify: verifyCustomerIdentityAction,
      unlink: unlinkCustomerIdentityAction,
    },
  },

  /**
   * Customer and Storefront Order management server actions.
   */
  order: {
    /**
     * Lists orders with search, filters (status, payment, date), pagination, and sorting (Admin).
     */
    list: listOrdersAction,

    /**
     * Places a new Cash on Delivery order with inventory tracking and coupon support.
     */
    create: createOrderAction,

    /**
     * Retrieves an order by its unique ID or readable order number.
     */
    getById: getOrderByIdAction,

    /**
     * Updates an existing order's status, payment, notes, or logistics (Admin).
     */
    update: updateOrderAction,

    /**
     * Updates an order's status and logs to the order timeline (Admin).
     */
    updateStatus: updateOrderStatusAction,

    /**
     * Deletes a single order by ID (Admin).
     */
    delete: deleteOrderAction,

    /**
     * Bulk deletes multiple orders by IDs (Admin).
     */
    bulkDelete: bulkDeleteOrdersAction,

    /**
     * Bulk updates status for multiple orders (Admin).
     */
    bulkUpdateStatus: bulkUpdateOrderStatusAction,

    /**
     * Lists orders placed by the currently authenticated customer.
     */
    listMyOrders: listCustomerOrdersAction,
  },
};

export default actions;

// Named export for all server actions
export * from "./admin";
export * from "./customer";
export * from "./storage";
export * from "./products";
export * from "./coupons";
export * from "./orders";

// Action Utility Types & Interfaces
export type {
  TeamMember,
  CreateUserAttributes,
  UpdateUserAttributes,
  ListUsersResult,
  AuthActionResult,
  CustomerUser,
  CustomerIdentityItem,
  CustomerAddressItem,
  CustomerAddressInput,
  UpdateCustomerAttributes,
  CustomerSession,
  CustomerSessionPayload,
  AuthTokens,
  SignOutOptions,
  CustomerAuthMode,
} from "@nishchinte/auth";

export type {
  StorageItem,
  UploadResult,
  UploadOptions,
  StorageFileInput,
} from "@nishchinte/storage";

export type {
  ListStorageInput,
  ListStorageResult,
  StorageActionError,
  StorageSortKey,
  StorageSortDirection,
} from "./storage";

export type {
  ProductOptionInput,
  ProductOptionValueInput,
  ProductVariantInput,
  CreateProductInput,
  UpdateProductInput,
  ListProductsInput,
  ListProductsResult,
  ProductItem,
  TransformedVariant,
  ProductSortKey,
  ProductSortDirection,
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesInput,
  CategoryBase,
  CategorySeo,
  CategoryParent,
  CategoryChild,
  CategoryInclude,
  GetCategoryOptions,
  CategoryItem,
  CreateTagInput,
  ListTagsInput,
  TagItem,
} from "./products";

export type {
  CouponType,
  CouponTarget,
  CreateCouponInput,
  UpdateCouponInput,
  ListCouponsInput,
  CouponItem,
  ListCouponsResult,
  ValidateCouponInput,
  ValidateCouponResult,
} from "./coupons";

export type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  DeliveryType,
  CreateOrderItemInput,
  CreateOrderAddressInput,
  CreateOrderInput,
  OrderItemSnapshot,
  OrderSummaryItem,
  OrderTimelineItem,
  ListOrdersInput,
  ListOrdersResult,
  UpdateOrderInput,
} from "./orders";
