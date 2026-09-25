"use client";

import { cn, Select as HeroSelect, ListBox } from "@heroui/react";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

// Make the option interface generic
interface SelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

// Make the props interface generic
interface SelectProps<T extends string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Apply the generic to the functional component
export function Select<T extends string>({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  disabled = false,
}: SelectProps<T>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`flex h-10 items-center rounded-xl border border-ap-border bg-ap-field-background px-4 py-2 text-sm text-ap-muted ${className}`}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <HeroSelect
      onChange={(val) => onChange(val as T)} // Cast the emission to the strict type T
      defaultValue={value}
      isDisabled={disabled}
      placeholder={placeholder}
      className={cn(
        `w-full rounded-xl border border-ap-border bg-ap-field-background-2 text-sm text-ap-foreground placeholder:text-ap-muted relative`,
        className,
      )}
    >
      <HeroSelect.Trigger>
        <HeroSelect.Value />
        <HeroSelect.Indicator>
          <ChevronDown className="w-4 h-4" />
        </HeroSelect.Indicator>
      </HeroSelect.Trigger>
      <HeroSelect.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.value}
              aria-label={option.label}
              isDisabled={option.disabled}
              id={option.value}
              textValue={option.label}
            >
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </HeroSelect.Popover>
    </HeroSelect>
  );
}
