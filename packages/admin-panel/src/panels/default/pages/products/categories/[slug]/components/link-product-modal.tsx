"use client";

import { useEffect } from "react";
import { Image as ImageIcon, Link2 } from "lucide-react";
import { Button, Modal, Spinner } from "@heroui/react";
import { ProductItem } from "@nishchinte/server/actions";

type LinkProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  onLink: (productId: string) => void;
  isLinkingPending: boolean;
  linkableProducts: ProductItem[];
  isFetching: boolean;
  errorMessage: string | null;
};

export function LinkProductModal({
  isOpen,
  onClose,
  search,
  onSearchChange,
  onLink,
  isLinkingPending,
  linkableProducts,
  isFetching,
  errorMessage,
}: LinkProductModalProps) {
  useEffect(() => {
    if (!isOpen) {
      onSearchChange("");
    }
  }, [isOpen, onSearchChange]);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onClose}>
        <Modal.Container size="lg">
          <Modal.Dialog className="max-h-[82vh] overflow-hidden rounded-2xl bg-ap-surface">
            <Modal.CloseTrigger />
            <Modal.Header className="mb-1 border-b-0 pb-0">
              <div className="flex flex-col gap-1">
                <Modal.Heading>Link Products</Modal.Heading>
                <p className="text-sm text-ap-muted">
                  Select products to assign to this category.
                </p>
              </div>
            </Modal.Header>

            <Modal.Body className="space-y-4 pt-3">
              <div>
                <input
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search products by name or SKU..."
                  className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3 py-2.5 text-sm text-ap-foreground outline-none transition focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft"
                />
              </div>

              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {isFetching ? (
                  <div className="grid place-items-center py-10">
                    <Spinner className="text-ap-accent" />
                  </div>
                ) : errorMessage ? (
                  <div className="rounded-xl bg-ap-danger/10 px-4 py-6 text-center">
                    <p className="text-sm font-medium text-ap-danger">
                      {errorMessage}
                    </p>
                  </div>
                ) : linkableProducts.length === 0 ? (
                  <div className="rounded-xl bg-ap-field-background px-4 py-8 text-center text-sm text-ap-muted">
                    No available products found to link.
                  </div>
                ) : (
                  <div className="rounded-xl border border-ap-border/60 bg-ap-field-background/40">
                    <div className="overflow-x-auto scrollbar-styled">
                      <table className="min-w-180 w-full border-collapse">
                        <thead>
                          <tr className="border-b border-ap-border/60 bg-ap-surface/60">
                            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ap-muted">
                              Product
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ap-muted">
                              Price
                            </th>
                            <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-ap-muted">
                              Stock
                            </th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ap-muted">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {linkableProducts.map((product) => {
                            const thumbnail = product.media[0]?.url;
                            return (
                              <tr
                                key={product.id}
                                className="border-b border-ap-border/40 last:border-0"
                              >
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    {thumbnail ? (
                                      <img
                                        src={thumbnail}
                                        alt={product.name}
                                        className="h-9 w-9 rounded-lg border border-ap-border/60 object-cover"
                                      />
                                    ) : (
                                      <span className="grid h-9 w-9 place-content-center rounded-lg border border-ap-border text-ap-muted">
                                        <ImageIcon size={13} />
                                      </span>
                                    )}
                                    <p className="max-w-65 truncate text-sm font-medium text-ap-foreground">
                                      {product.name}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right text-sm text-ap-foreground">
                                  ৳{Number(product.price).toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${product.inStock ? "bg-ap-success/10 text-ap-success" : "bg-ap-danger/10 text-ap-danger"}`}
                                  >
                                    {product.inventoryQuantity === -1
                                      ? "Unlimited"
                                      : product.inStock
                                        ? `In stock (${product.inventoryQuantity})`
                                        : "Out of stock"}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <Button
                                    type="button"
                                    onClick={() => onLink(product.id)}
                                    isPending={isLinkingPending}
                                    isIconOnly
                                    isDisabled={isLinkingPending}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-ap-accent transition-opacity hover:opacity-90 disabled:opacity-50"
                                  >
                                    {isLinkingPending ? (
                                      <Spinner size="sm" color="current" />
                                    ) : (
                                      <Link2 size={13} />
                                    )}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </Modal.Body>

            <Modal.Footer className="border-t-0 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-ap-border px-3 py-1.5 text-xs font-medium text-ap-foreground transition-colors hover:bg-ap-field-background"
              >
                Close
              </button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
