"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { ConfirmModal } from "./confirm-modal";
import type { ConfirmOptions, ConfirmContextType } from "./types";

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmOptions>({
    title: "",
    description: "",
  });
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setConfig(options);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (config.onConfirm) {
      setIsLoading(true);
      try {
        await config.onConfirm();
      } finally {
        setIsLoading(false);
      }
    }

    if (resolver) {
      resolver(true);
    }
    setIsOpen(false);
  }, [resolver, config]);

  const handleCancel = useCallback(() => {
    if (config.onCancel) {
      config.onCancel();
    }
    if (resolver) resolver(false);
    setIsOpen(false);
  }, [resolver, config]);

  return (
    <ConfirmContext.Provider value={{ confirm, isLoading, setIsLoading }}>
      {children}
      <ConfirmModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={config.title}
        description={config.description}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
        isDanger={config.isDanger || false}
        isLoading={isLoading}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
