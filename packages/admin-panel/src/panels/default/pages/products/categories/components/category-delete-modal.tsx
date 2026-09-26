"use client";

import { Spinner, Button, Modal } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import type { DeleteTarget } from "./category-actions-dropdown";

interface CategoryDeleteModalProps {
  deleteTarget: DeleteTarget | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isDeleting: boolean;
}

export function CategoryDeleteModal({
  deleteTarget,
  onClose,
  onConfirm,
  isDeleting,
}: CategoryDeleteModalProps) {
  return (
    <Modal>
      <Modal.Backdrop
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            onClose();
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
                isDisabled={isDeleting}
                onClick={onClose}
                className="rounded-xl border-ap-border text-xs font-medium text-ap-foreground"
              >
                Cancel
              </Button>
              <Button
                type="button"
                isPending={isDeleting}
                isDisabled={isDeleting}
                onClick={() => {
                  if (deleteTarget) {
                    onConfirm(deleteTarget.id);
                  }
                }}
                className="rounded-xl bg-ap-danger text-xs font-semibold text-white hover:opacity-90"
              >
                {isDeleting ? (
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
  );
}
