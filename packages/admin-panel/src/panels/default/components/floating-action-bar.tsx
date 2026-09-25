"use client";

import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Spinner } from "@heroui/react";

type ActionVariant = "primary" | "secondary" | "danger" | "ghost";

export type FloatingActionItem = {
  id: string;
  label: string;
  onClick: () => void;
  variant?: ActionVariant;
  icon?: ReactNode;
  isPending?: boolean;
  isDisabled?: boolean;
  type?: "button" | "submit" | "reset";
  form?: string;
};

type FloatingActionBarProps = {
  isVisible: boolean;
  title: string;
  description?: string;
  actions: FloatingActionItem[];
};

function getButtonClass(variant: ActionVariant = "secondary") {
  if (variant === "primary") {
    return "rounded-xl bg-ap-accent px-4 py-2 text-sm font-bold text-ap-accent-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
  }

  if (variant === "danger") {
    return "rounded-xl border border-ap-danger/30 bg-transparent px-3 py-2 text-sm font-medium text-ap-danger transition-colors hover:bg-ap-danger/10 disabled:cursor-not-allowed disabled:opacity-50";
  }

  if (variant === "ghost") {
    return "rounded-xl bg-transparent px-3 py-2 text-sm font-medium text-ap-foreground transition-colors hover:bg-ap-field-background disabled:cursor-not-allowed disabled:opacity-50";
  }

  return "rounded-xl border border-ap-border px-3 py-2 text-sm font-medium text-ap-foreground transition-colors hover:bg-ap-field-background disabled:cursor-not-allowed disabled:opacity-50";
}

export function FloatingActionBar({
  isVisible,
  title,
  description,
  actions,
}: FloatingActionBarProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-ap-border bg-ap-surface/95 px-4 py-3 shadow-xl backdrop-blur-sm">
            <div className="pr-2">
              <p className="text-sm font-semibold text-ap-foreground">
                {title}
              </p>
              {description ? (
                <p className="text-xs text-ap-muted">{description}</p>
              ) : null}
            </div>

            {actions.map((action) => {
              const variant = action.variant ?? "secondary";
              const isPending = Boolean(action.isPending);

              if (variant === "primary") {
                return (
                  <Button
                    key={action.id}
                    type={action.type ?? "button"}
                    form={action.form}
                    onClick={action.onClick}
                    isDisabled={Boolean(action.isDisabled)}
                    isPending={isPending}
                    className={getButtonClass(variant)}
                  >
                    {isPending ? (
                      <Spinner size="sm" color="current" />
                    ) : (
                      (action.icon ?? null)
                    )}
                    {action.label}
                  </Button>
                );
              }

              return (
                <button
                  key={action.id}
                  type={action.type ?? "button"}
                  form={action.form}
                  onClick={action.onClick}
                  disabled={Boolean(action.isDisabled) || isPending}
                  className={getButtonClass(variant)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isPending ? <Spinner size="sm" /> : (action.icon ?? null)}
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
