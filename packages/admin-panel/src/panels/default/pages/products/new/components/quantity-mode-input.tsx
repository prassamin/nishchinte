"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@heroui/react";

export function QuantityModeInput({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">(
    "bottom",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value === -1 ? "" : String(value));
  }, [value]);

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > 220) {
        setDropdownPosition("top");
      } else {
        setDropdownPosition("bottom");
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className="flex items-center gap-2 p-3 min-h-11 border border-ap-border/60 rounded-xl bg-ap-field-background/30 focus-within:ring-2 focus-within:ring-ap-accent-soft focus-within:border-ap-accent focus-within:bg-ap-field-background/50 transition-all cursor-text shadow-inner"
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        <input
          ref={inputRef}
          type="number"
          min={0}
          value={value === -1 ? "" : inputValue}
          onChange={(e) => {
            const next = e.target.value;
            setInputValue(next);

            if (next === "") return;
            const num = Number(next);
            if (!Number.isNaN(num)) {
              onChange(Math.max(0, num));
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={value === -1 ? "Unlimited" : placeholder}
          className="flex-1 w-full text-[14px] bg-transparent outline-none placeholder:text-ap-muted/50 px-1 text-ap-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        <span className="grid place-content-center p-1">
          <ChevronDown
            size={16}
            className={cn(
              "text-ap-muted transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </span>
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute left-0 w-full z-50 bg-ap-surface border border-ap-border shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-xl overflow-hidden flex flex-col animate-in fade-in duration-200",
            dropdownPosition === "top"
              ? "bottom-full mb-2 slide-in-from-bottom-2"
              : "top-full mt-2 slide-in-from-top-2",
          )}
        >
          <div className="max-h-60 overflow-y-auto p-2 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onChange(-1);
                setInputValue("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-[14px] transition-colors",
                value === -1
                  ? "bg-ap-accent/10 text-ap-accent"
                  : "hover:bg-ap-field-background/50 text-ap-foreground",
              )}
            >
              <span className="font-medium">Unlimited</span>
              {value === -1 && <Check size={15} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
