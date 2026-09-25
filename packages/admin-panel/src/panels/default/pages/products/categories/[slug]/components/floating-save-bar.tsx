"use client";

import { Save } from "lucide-react";
import { FloatingActionBar } from "../../../../../components/floating-action-bar";

type FloatingSaveBarProps = {
  isDirty: boolean;
  isPending: boolean;
  onCancel: () => void;
  onSave: () => void;
  isValid: boolean;
};

export function FloatingSaveBar({
  isDirty,
  isPending,
  onCancel,
  onSave,
  isValid,
}: FloatingSaveBarProps) {
  return (
    <FloatingActionBar
      isVisible={isDirty}
      title="Unsaved Changes"
      description="You have unsaved changes on this category"
      actions={[
        {
          id: "cancel",
          label: "Discard",
          onClick: onCancel,
          variant: "secondary",
        },
        {
          id: "save",
          label: "Save Changes",
          onClick: onSave,
          variant: "primary",
          icon: <Save size={16} />,
          isPending,
          isDisabled: isPending || !isValid,
        },
      ]}
    />
  );
}
