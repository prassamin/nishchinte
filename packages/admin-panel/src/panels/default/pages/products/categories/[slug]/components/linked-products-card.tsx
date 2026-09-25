"use client";

import { Image as ImageIcon, Link2, Unlink2 } from "lucide-react";
import { useCategoryStore } from "../store";
import { ProductItem } from "@nishchinte/server/actions";

type LinkedProductsCardProps = {
  products: ProductItem[];
  onUnlink: (productId: string) => void;
  isLinkingPending: boolean;
};

export function LinkedProductsCard({
  products,
  onUnlink,
  isLinkingPending,
}: LinkedProductsCardProps) {
  const { setLinkModalOpen } = useCategoryStore();

  return (
    <div className="overflow-hidden rounded-2xl border border-ap-border bg-ap-surface">
      <div className="flex items-center justify-between border-b border-ap-border px-4 py-3">
        <h3 className="text-sm font-semibold text-ap-foreground">
          Products in Category ({products.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLinkModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-ap-border px-2.5 py-1.5 text-xs font-medium text-ap-foreground transition-colors hover:bg-ap-field-background"
          >
            <Link2 size={13} />
            Link Products
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm font-medium text-ap-foreground">
            No products linked
          </p>
          <p className="mt-1 text-xs text-ap-muted">
            No products are currently assigned to this category.
          </p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto p-3">
          <div className="space-y-2">
            {products.map((product) => {
              const thumbnail =  product.media[0]?.url;
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl bg-ap-field-background px-3 py-2.5"
                >
                  {thumbnail ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnail}
                        alt={product.name}
                        className="h-9 w-9 rounded-lg border border-ap-border/60 object-cover"
                      />
                    </>
                  ) : (
                    <span className="grid h-9 w-9 place-content-center rounded-lg border border-ap-border text-ap-muted">
                      <ImageIcon size={13} />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ap-foreground">
                      {product.media?.length ? product.name : "No image"}
                    </p>
                    <p className="text-xs text-ap-muted">
                      ৳{Number(product.price).toFixed(2)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUnlink(product.id)}
                    disabled={isLinkingPending}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-ap-danger/30 px-2.5 py-1.5 text-xs font-medium text-ap-danger transition-colors hover:bg-ap-danger/10 disabled:opacity-50"
                  >
                    <Unlink2 size={13} />
                    Unlink
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
