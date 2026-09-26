"use client";

import { Switch } from "@heroui/react";
import { Check, Power } from "lucide-react";

interface CouponStatusSwitchProps {
  isActive: boolean;
  isDisabled?: boolean;
  onToggle: (isActive: boolean) => void;
}

export function CouponStatusSwitch({
  isActive,
  isDisabled,
  onToggle,
}: CouponStatusSwitchProps) {
  return (
    <Switch isDisabled={isDisabled} isSelected={isActive} onChange={onToggle}>
      <Switch.Content>
        <Switch.Control className={isActive ? "bg-green-500/80" : ""}>
          <Switch.Thumb className="bg-ap-surface text-ap-foreground"></Switch.Thumb>
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}
