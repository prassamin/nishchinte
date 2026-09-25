"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";

type Props = {
  onUpload: (files: File[]) => void;
  disabled?: boolean;
};

export function ContentUploadDropzone({ onUpload, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length > 0) onUpload(files);
      }}
      className="mb-4 rounded-2xl border-2 border-dashed border-ap-border bg-ap-surface px-4 py-6"
    >
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <Upload size={20} className="text-ap-muted" />
        <p className="text-sm font-medium text-ap-foreground">
          Drop files here
        </p>
        <p className="text-xs text-ap-muted">
          or select files from your computer
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) onUpload(files);
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="mt-1 rounded-lg border border-ap-border px-3 py-1.5 text-xs font-semibold text-ap-foreground hover:bg-ap-field-background disabled:opacity-50"
        >
          Choose Files
        </button>
      </div>
    </div>
  );
}
