"use client";

import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { ProductFormData, ProductOption } from "../types";
import { generateVariants } from "./variations/utils";
import { OptionBlock } from "./variations/option-block";
import { GroupedVariantsTable } from "./variations/grouped-variants-table";
import { cn } from "@heroui/styles";

export function VariationsCard({
  formData,
  updateFormData,
}: {
  formData: ProductFormData;
  updateFormData: (updates: Partial<ProductFormData>) => void;
}) {
  const [groupByOption, setGroupByOption] = useState<string | null>(null);

  // Set default group by option
  useEffect(() => {
    const validNames = formData.options
      .filter((o) => o.name.trim() !== "")
      .map((o) => o.name.trim());
    if (validNames.length > 0) {
      if (!groupByOption || !validNames.includes(groupByOption)) {
        setGroupByOption(validNames[0]);
      }
    } else {
      setGroupByOption(null);
    }
  }, [formData.options, groupByOption]);

  const handleOptionsChange = (newOptions: ProductOption[]) => {
    const newCombos = generateVariants(newOptions);

    const newVariants = newCombos.map((combo) => {
      // Find existing variant to preserve price/stock
      const existing = formData.variants.find((v) => {
        const keys1 = Object.keys(combo);
        const keys2 = Object.keys(v.optionValues || {});
        if (keys1.length !== keys2.length) return false;
        return keys1.every((k) => combo[k] === (v.optionValues as any)[k]);
      });

      if (existing) return existing;

      return {
        id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: Object.values(combo).join(" / "),
        price: formData.price || "",
        costPrice: formData.costPrice || "",
        inventoryQuantity: -1,
        imageUrl: formData.media?.[0]?.url || "",
        sku: "",
        barcode: "",
        optionValues: combo,
      };
    });

    updateFormData({ options: newOptions, variants: newVariants });
  };

  return (
    <section className="rounded-2xl border border-ap-border bg-ap-surface shadow-sm flex flex-col">
      <div className={cn("p-6", formData.variants.length !== 0 && "pb-0")}>
        <h2 className="text-[15px] font-bold text-ap-foreground mb-4">
          Variants & Options
        </h2>

        {formData.options.length > 0 && (
          <div className="space-y-4 mb-4">
            {formData.options.map((option, optIndex) => (
              <OptionBlock
                key={option.id}
                formData={formData}
                optIndex={optIndex}
                option={option}
                updateFormData={updateFormData}
                handleOptionsChange={handleOptionsChange}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            const newOptions = [
              ...formData.options,
              { id: `opt-${Date.now()}`, name: "", values: [] },
            ];
            updateFormData({ options: newOptions });
          }}
          className="flex items-center justify-center gap-2 w-full py-4 mt-6 rounded-2xl border-2 border-dashed border-ap-border/60 text-[14px] font-semibold text-ap-muted hover:text-ap-foreground hover:border-ap-border hover:bg-ap-field-background/50 transition-all duration-200 group"
        >
          <Plus
            size={18}
            className="text-ap-muted group-hover:text-ap-accent transition-colors"
          />
          <span>Add Another Option</span>
        </button>
      </div>

      <GroupedVariantsTable
        formData={formData}
        groupByOption={groupByOption}
        setGroupByOption={setGroupByOption}
        updateFormData={updateFormData}
      />
    </section>
  );
}
