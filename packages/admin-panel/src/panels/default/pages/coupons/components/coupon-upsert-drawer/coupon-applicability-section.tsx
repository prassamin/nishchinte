"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { Checkbox, Spinner, cn } from "@heroui/react";
import { ShoppingBag, Tag, Search } from "lucide-react";
import { actions } from "@nishchinte/server/actions";
import { useNishchinte } from "@nishchinte/hooks";
import type { CouponUpsertFormData } from "../../types";

export function CouponApplicabilitySection({
  form,
  setForm,
  isOpen,
}: {
  form: CouponUpsertFormData;
  setForm: Dispatch<SetStateAction<CouponUpsertFormData>>;
  isOpen: boolean;
}) {
  const { formatMoney } = useNishchinte();
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  // Query products when target is SPECIFIC_PRODUCTS
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ["coupon-picker-products"],
    queryFn: async () => {
      const res = await actions.product.list({ limit: 100 });
      return res.ok ? res.products : [];
    },
    enabled: isOpen && form.target === "SPECIFIC_PRODUCTS",
    staleTime: 60_000,
  });

  // Query categories when target is SPECIFIC_CATEGORIES
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["coupon-picker-categories"],
    queryFn: async () => {
      const res = await actions.product.category.list();
      return res.ok ? res.categories : [];
    },
    enabled: isOpen && form.target === "SPECIFIC_CATEGORIES",
    staleTime: 60_000,
  });

  const filteredProducts = (productsData || []).filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  const filteredCategories = (categoriesData || []).filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  const toggleProductId = (id: string) => {
    setForm((p) => ({
      ...p,
      productIds: p.productIds.includes(id)
        ? p.productIds.filter((x) => x !== id)
        : [...p.productIds, id],
    }));
  };

  const toggleCategoryId = (id: string) => {
    setForm((p) => ({
      ...p,
      categoryIds: p.categoryIds.includes(id)
        ? p.categoryIds.filter((x) => x !== id)
        : [...p.categoryIds, id],
    }));
  };

  return (
    <div className="space-y-4 border-t border-ap-border/50 pt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ap-muted">
        Applicability
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "All Products",
            value: "ALL",
            icon: ShoppingBag,
          },
          {
            label: "Specific Products",
            value: "SPECIFIC_PRODUCTS",
            icon: ShoppingBag,
          },
          {
            label: "Categories",
            value: "SPECIFIC_CATEGORIES",
            icon: Tag,
          },
        ].map(({ label, value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setForm((p) => ({ ...p, target: value as any }))}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition-all text-xs font-medium",
              form.target === value
                ? "border-ap-accent bg-ap-accent/10 text-ap-accent font-semibold"
                : "border-ap-border bg-ap-field-background/20 text-ap-muted hover:text-ap-foreground",
            )}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Specific Products Picker */}
      {form.target === "SPECIFIC_PRODUCTS" && (
        <div className="rounded-xl border border-ap-border bg-ap-field-background/30 p-3 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ap-foreground">
              Selected Products ({form.productIds.length})
            </span>
            {form.productIds.length > 0 && (
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, productIds: [] }))}
                className="text-ap-muted hover:text-ap-danger text-[12px]"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ap-muted"
            />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products to include..."
              className="w-full rounded-lg border border-ap-border bg-ap-field-background/60 pl-8 pr-3 py-1.5 text-xs text-ap-foreground outline-none focus:border-ap-accent"
            />
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1 scrollbar-styled! pr-1">
            {isProductsLoading ? (
              <div className="w-full min-h-15 flex items-center justify-center gap-2">
                <Spinner size="sm" />
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="text-center py-4 text-xs text-ap-muted">
                No matching products found
              </p>
            ) : (
              filteredProducts.map((prod) => {
                const isSelected = form.productIds.includes(prod.id);
                return (
                  <Checkbox
                    key={prod.id}
                    id={`checkbox-prod-${prod.id}`}
                    isSelected={isSelected}
                    onChange={() => toggleProductId(prod.id)}
                    className="w-full p-2 rounded-lg cursor-pointer hover:bg-ap-accent/20 transition-colors"
                  >
                    <Checkbox.Content className="w-full flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox.Control className="bg-ap-accent/20">
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        <span className="truncate text-xs text-ap-foreground font-medium">
                          {prod.name}
                        </span>
                      </div>
                      <span className="text-ap-muted text-[13px] shrink-0">
                        {formatMoney(prod.price)}
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Specific Categories Picker */}
      {form.target === "SPECIFIC_CATEGORIES" && (
        <div className="rounded-xl border border-ap-border bg-ap-field-background/30 p-3 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ap-foreground">
              Selected Categories ({form.categoryIds.length})
            </span>
            {form.categoryIds.length > 0 && (
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, categoryIds: [] }))}
                className="text-ap-muted hover:text-ap-danger text-[12px]"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ap-muted"
            />
            <input
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search categories to include..."
              className="w-full rounded-lg border border-ap-border bg-ap-field-background/60 pl-8 pr-3 py-1.5 text-xs text-ap-foreground outline-none focus:border-ap-accent"
            />
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1 scrollbar-styled pr-1">
            {isCategoriesLoading ? (
              <div className="w-full min-h-15 flex items-center justify-center gap-2">
                <Spinner size="sm" />
                Loading categories...
              </div>
            ) : filteredCategories.length === 0 ? (
              <p className="text-center py-4 text-xs text-ap-muted">
                No matching categories found
              </p>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = form.categoryIds.includes(cat.id);
                return (
                  <Checkbox
                    key={cat.id}
                    id={`checkbox-cat-${cat.id}`}
                    isSelected={isSelected}
                    onChange={() => toggleCategoryId(cat.id)}
                    className="w-full px-3 py-2 rounded-lg cursor-pointer hover:bg-ap-accent/20 transition-colors"
                  >
                    <Checkbox.Content className="w-full flex items-center gap-2.5 min-w-0">
                      <Checkbox.Control className="bg-ap-accent/20">
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="truncate text-xs text-ap-foreground font-medium">
                        {cat.name}
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
