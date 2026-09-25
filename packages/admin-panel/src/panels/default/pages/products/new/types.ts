export type ProductOption = {
  id: string;
  name: string;
  values: string[];
};

export type ProductVariant = {
  id: string;
  title: string;
  price: string;
  costPrice?: string;
  inventoryQuantity: number;
  sku?: string;
  barcode?: string;
  imageUrl?: string;
  optionValues: Record<string, string>;
};

export type ProductMediaItem = {
  url: string;
  mimeType: string;
};

export type ProductFormData = {
  name: string;
  price: string;
  costPrice: string;
  description: string;
  categoryId: string;
  tags: string[];
  media: ProductMediaItem[];
  inStock: boolean;
  inventoryQuantity: number;
  sku: string;
  barcode: string;
  slug?: string;

  discountType: string;
  discountValue: string;
  discountStartAt: string;
  discountEndAt: string;
  seoTitle: string;
  seoDescription: string;
  seoImageUrl: string;
  options: ProductOption[];
  variants: ProductVariant[];
};

export type DiscountOption = {
  value: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};