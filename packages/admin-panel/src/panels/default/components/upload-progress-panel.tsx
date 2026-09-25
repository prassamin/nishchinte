"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, AlertCircle } from "lucide-react";

export type UploadProgressItem = {
  id: string;
  name: string;
  size?: number;
  status: "pending" | "uploading" | "done" | "error";
  percent: number;
  loaded?: number;
  error?: string;
};

export interface UploadProgressPanelProps {
  queue: UploadProgressItem[];
  onClear: () => void;
  portal?: boolean;
}

export function UploadProgressPanel({
  queue,
  onClear,
  portal = true,
}: UploadProgressPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCount = queue.length;
  const doneCount = queue.filter((q) => q.status === "done").length;
  const errorCount = queue.filter((q) => q.status === "error").length;
  const activeCount = queue.filter(
    (q) => q.status === "uploading" || q.status === "pending",
  ).length;
  const isFinished = totalCount > 0 && doneCount + errorCount === totalCount;

  const content = (
    <AnimatePresence>
      {totalCount > 0 && (
        <motion.div
          key="upload-progress-panel"
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            y: 20,
            scale: 0.96,
            transition: { duration: 0.18, ease: "easeIn" },
          }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          style={{ zIndex: 999999 }}
          className="fixed bottom-6 right-6 w-85 max-w-[calc(100vw-32px)] rounded-2xl border border-ap-border/80 bg-ap-background/95 backdrop-blur-2xl shadow-2xl shadow-black/25 overflow-hidden pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ap-border/40 bg-ap-field-background/50">
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-ap-foreground">
                {isFinished
                  ? errorCount > 0
                    ? `Upload completed with ${errorCount} error${errorCount > 1 ? "s" : ""}`
                    : "Upload complete"
                  : `Uploading ${activeCount} file${activeCount !== 1 ? "s" : ""}`}
              </span>
              <span className="text-[11px] text-ap-muted font-medium">
                {doneCount} / {totalCount} completed
              </span>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-ap-muted hover:text-ap-foreground hover:bg-ap-field-background transition-colors"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>

          {/* File List */}
          <div className="max-h-60 overflow-y-auto p-3.5 space-y-3">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[12px] font-medium text-ap-foreground truncate max-w-48"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    <span className="text-[11px] font-semibold text-ap-muted tabular-nums shrink-0 ml-2 flex items-center gap-1">
                      {item.status === "done" ? (
                        <span className="text-green-500 flex items-center gap-0.5 font-bold">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      ) : item.status === "error" ? (
                        <span className="text-ap-danger flex items-center gap-0.5 font-bold">
                          <AlertCircle size={13} strokeWidth={2.5} />
                        </span>
                      ) : (
                        `${item.percent}%`
                      )}
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-ap-field-background overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        item.status === "done"
                          ? "bg-green-500"
                          : item.status === "error"
                            ? "bg-ap-danger"
                            : "bg-ap-accent"
                      }`}
                      initial={false}
                      animate={{ width: `${item.percent}%` }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                  </div>

                  {item.status === "error" && item.error && (
                    <span className="text-[11px] text-ap-danger mt-1 block leading-tight font-medium">
                      {item.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;

  if (portal && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}
