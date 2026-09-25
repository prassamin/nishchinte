"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Checkbox, cn } from "@heroui/react";
import { ProductOption } from "../../types";
import { PREDEFINED_VALUES } from "./utils";

export function OptionValuesInput({
  option,
  onAddValue,
  onRemoveValue,
}: {
  option: ProductOption;
  onAddValue: (val: string) => void;
  onRemoveValue: (val: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">(
    "bottom",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 320 && rect.top > 320) {
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const predefinedSuggestions: Array<{ name: string; hex?: string }> =
    PREDEFINED_VALUES[option.name] || [];

  const customSuggestions: Array<{ name: string; hex?: string }> = option.values
    .filter((value) => !predefinedSuggestions.some((s) => s.name === value))
    .map((name) => ({ name }));

  const allSuggestions: Array<{ name: string; hex?: string }> = [
    ...predefinedSuggestions,
    ...customSuggestions,
  ];

  const filteredSuggestions = allSuggestions.filter((s) =>
    s.name.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const getSuggestionMeta = (value: string) =>
    allSuggestions.find((s) => s.name === value);

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className="flex flex-col gap-2 p-3 min-h-22 border border-ap-border/60 rounded-xl bg-ap-field-background/30 focus-within:ring-2 focus-within:ring-ap-accent-soft focus-within:border-ap-accent focus-within:bg-ap-field-background/50 transition-all cursor-text shadow-inner"
        onClick={() => {
          inputRef.current?.focus();
          setIsOpen(true);
        }}
      >
        {option.values.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {option.values.map((val) => {
              const meta = getSuggestionMeta(val);
              return (
                <span
                  key={val}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-ap-surface border border-ap-border/80 text-ap-foreground/90 text-[13px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)] group hover:border-ap-accent/40 transition-colors"
                >
                  {meta?.hex && (
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-ap-border/60 shrink-0"
                      style={{ backgroundColor: meta.hex }}
                    />
                  )}
                  <span>{val}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveValue(val);
                    }}
                    className="text-ap-muted hover:text-ap-danger hover:bg-ap-danger/10 p-0.5 rounded-md transition-colors"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={`Add ${option.name.toLowerCase() || "values"}... (press Enter)`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputValue.trim()) {
              e.preventDefault();
              if (!option.values.includes(inputValue.trim())) {
                onAddValue(inputValue.trim());
              }
              setInputValue("");
            }
          }}
          className="flex-1 w-full text-[14px] bg-transparent outline-none placeholder:text-ap-muted/50 mt-1 px-1 min-w-30 text-ap-foreground"
        />
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
          {filteredSuggestions.length > 0 && (
            <>
              <div className="px-4 py-3 text-[13px] font-bold text-ap-muted uppercase tracking-wider bg-ap-surface">
                Suggested Values
              </div>
              <div className="max-h-60 overflow-y-auto p-2 space-y-0.5">
                {filteredSuggestions.map((s) => {
                  const isSelected = option.values.includes(s.name);
                  return (
                    <Checkbox
                      key={s.name}
                      id={`checkbox-${s.name}`}
                      isSelected={isSelected}
                      className={
                        "w-full px-2 py-2 hover:bg-ap-muted/25 rounded-md"
                      }
                      onChange={(checked: boolean) => {
                        if (checked) onAddValue(s.name);
                        else onRemoveValue(s.name);
                        inputRef.current?.focus();
                      }}
                    >
                      <Checkbox.Content className={"w-full"}>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        {s.hex && (
                          <div
                            className="w-5 h-5 rounded-lg border border-ap-border/50 shadow-sm shrink-0"
                            style={{ backgroundColor: s.hex }}
                          />
                        )}
                        <span className="text-[14px] text-ap-foreground font-medium">
                          {s.name}
                        </span>
                      </Checkbox.Content>
                    </Checkbox>
                  );
                })}
              </div>
            </>
          )}

          <div className="p-2 border-t border-ap-border/50 bg-ap-field-background/30">
            <button
              type="button"
              onClick={() => {
                if (
                  inputValue.trim() &&
                  !option.values.includes(inputValue.trim())
                ) {
                  onAddValue(inputValue.trim());
                  setInputValue("");
                }
                inputRef.current?.focus();
              }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-[14px] font-semibold text-ap-foreground hover:bg-ap-surface rounded-lg transition-colors border border-transparent hover:border-ap-border/60 shadow-sm"
            >
              <Plus size={16} className="text-ap-muted shrink-0" />
              {inputValue.trim()
                ? `Add "${inputValue.trim()}"`
                : "Add custom value"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
