"use client";

import { Select, ListBox, ListBoxItem, cn } from "@heroui/react";
import { ProductFormData, ProductOption } from "../../types";
import { PREDEFINED_OPTIONS } from "./utils";
import { OptionValuesInput } from "./option-values-input";

export function OptionBlock({
  formData,
  optIndex,
  option,
  updateFormData,
  handleOptionsChange,
}: {
  formData: ProductFormData;
  optIndex: number;
  option: ProductOption;
  updateFormData: (updates: Partial<ProductFormData>) => void;
  handleOptionsChange: (newOptions: ProductOption[]) => void;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-1 rounded-2xl border border-ap-border/60 bg-ap-surface shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:border-ap-border/80">
        {/* Option Block Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[14px] font-semibold text-ap-foreground/90 tracking-tight">
              Option Name
            </label>
          </div>

          <div className="flex gap-2">
            <Select
              aria-label="Select option"
              disabledKeys={formData.options
                .map((o, i) => (i !== optIndex ? o.name : ""))
                .filter(Boolean)}
              value={
                PREDEFINED_OPTIONS.includes(option.name)
                  ? option.name
                  : "Custom"
              }
              onChange={(key) => {
                if (!key) return;
                const val = key as string;
                const newOptions: ProductOption[] = [...formData.options];
                newOptions[optIndex].name = val === "Custom" ? "" : val;
                newOptions[optIndex].values = [];
                updateFormData({ options: newOptions });
                if (val !== "Custom") handleOptionsChange(newOptions);
              }}
              className="w-1/3"
            >
              {({ isFocused }) => (
                <>
                  <Select.Trigger
                    className={cn(
                      "flex! justify-between! px-3! py-2! border! border-ap-border! rounded-xl! shadow-sm! text-[14px]! transition-colors! outline-none! min-w-full! cursor-pointer! relative!",
                      isFocused
                        ? "ring-2! ring-ap-accent-soft! border-ap-accent!"
                        : "",
                    )}
                  >
                    <Select.Value className="text-ap-foreground/90 truncate" />
                    <Select.Indicator className="text-ap-muted shrink-0" />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox className="p-1">
                      {PREDEFINED_OPTIONS.map((opt) => (
                        <ListBoxItem
                          key={opt}
                          id={opt}
                          textValue={opt}
                          className="rounded-md data-[hover=true]:bg-ap-accent/10 data-[hover=true]:text-ap-accent"
                        >
                          {opt}
                        </ListBoxItem>
                      ))}
                      <ListBoxItem
                        key="Custom"
                        id="Custom"
                        textValue="Custom"
                        className="rounded-md data-[hover=true]:bg-ap-accent/10 data-[hover=true]:text-ap-accent"
                      >
                        Custom...
                      </ListBoxItem>
                    </ListBox>
                  </Select.Popover>
                </>
              )}
            </Select>

            {(!PREDEFINED_OPTIONS.includes(option.name) &&
              option.name !== "") ||
            option.name === "" ? (
              <input
                type="text"
                value={option.name}
                onChange={(e) => {
                  const newOptions = [...formData.options];
                  newOptions[optIndex].name = e.target.value;
                  updateFormData({ options: newOptions });
                }}
                onBlur={() => handleOptionsChange(formData.options)}
                placeholder="Custom option name (e.g. Fabric)"
                className="flex-1 px-3 py-2 border border-ap-border rounded-xl text-[14px] focus:ring-2 focus:ring-ap-accent-soft focus:border-ap-accent outline-none transition-all shadow-sm text-ap-foreground placeholder:text-ap-muted/60"
              />
            ) : null}
          </div>
        </div>

        {/* Option Tags Block */}
        <div className="p-5 pt-2">
          <OptionValuesInput
            option={option}
            onAddValue={(val) => {
              const newOptions = [...formData.options];
              newOptions[optIndex].values.push(val);
              handleOptionsChange(newOptions);
            }}
            onRemoveValue={(val) => {
              const newOptions = [...formData.options];
              newOptions[optIndex].values = newOptions[optIndex].values.filter(
                (v) => v !== val,
              );
              handleOptionsChange(newOptions);
            }}
          />
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-ap-field-background/40 border-t border-ap-border/40">
          <button
            type="button"
            onClick={() => {
              const newOptions = formData.options.filter(
                (_, i) => i !== optIndex,
              );
              handleOptionsChange(newOptions);
            }}
            className="px-4 py-1.5 rounded-lg text-[13px] font-semibold text-ap-muted hover:text-ap-danger hover:bg-ap-danger/10 transition-colors"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => handleOptionsChange(formData.options)}
            className="px-5 py-1.5 bg-ap-foreground text-ap-background rounded-lg text-[13px] font-semibold hover:bg-ap-foreground/90 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
