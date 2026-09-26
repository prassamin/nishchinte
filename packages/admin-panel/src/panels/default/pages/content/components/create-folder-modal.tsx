"use client";

import { FolderPlus } from "lucide-react";
import { Button, Modal, Spinner } from "@heroui/react";
import { useContent } from "../use-content-manager";

type Props = {
  isOpen?: boolean;
  onClose?: () => void;
  folderName?: string;
  onFolderNameChange?: (value: string) => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
};

export function CreateFolderModal(props: Props = {}) {
  const content = useContent();
  const isOpen = props.isOpen ?? content.isCreateFolderOpen;
  const onClose = props.onClose ?? content.handleCloseFolderModal;
  const folderName = props.folderName ?? content.folderName;
  const onFolderNameChange = props.onFolderNameChange ?? content.setFolderName;
  const onSubmit = props.onSubmit ?? content.handleCreateFolder;
  const isSubmitting =
    props.isSubmitting ?? (content.isCreatingFolder || content.isSubmittingFolder);
  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) onClose();
        }}
      >
        <Modal.Container size="sm">
          <Modal.Dialog className="rounded-2xl bg-ap-surface border border-ap-border/50 shadow-2xl shadow-black/20">
            {!isSubmitting && <Modal.CloseTrigger />}
            <Modal.Header className="pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ap-accent/10 text-ap-accent">
                  <FolderPlus size={22} />
                </div>
                <div>
                  <Modal.Heading className="text-lg">
                    Create Folder
                  </Modal.Heading>
                  <p className="text-sm text-ap-muted mt-0.5">
                    Create a new folder to organize your media files
                  </p>
                </div>
              </div>
            </Modal.Header>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
            >
              <Modal.Body className="space-y-4 overflow-hidden">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ap-foreground">
                    Folder Name
                  </label>
                  <input
                    value={folderName}
                    onChange={(e) => onFolderNameChange(e.target.value)}
                    placeholder="e.g. products, banners, invoices"
                    className="h-11 w-full rounded-xl border border-ap-border/50 bg-ap-background px-4 text-sm text-ap-foreground outline-none transition-all focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft disabled:opacity-60"
                    autoFocus
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-ap-muted">
                    Use short, descriptive names. Avoid special characters.
                  </p>
                </div>
              </Modal.Body>

              <Modal.Footer className="gap-3 pt-5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl border border-ap-border/50 px-5 py-2.5 text-sm font-medium text-ap-muted hover:bg-ap-surface transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  isDisabled={!folderName.trim() || isSubmitting}
                  isPending={isSubmitting}
                  className="rounded-xl bg-ap-accent px-5 py-2.5 text-sm font-semibold text-ap-background hover:bg-ap-accent/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? <Spinner color="current" size="sm" /> : null}
                  {isSubmitting ? "Creating..." : "Create Folder"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
