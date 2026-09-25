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
          <Switch.Thumb className="bg-ap-surface text-ap-foreground">
            <Switch.Icon>
              {isActive ? (
                <Power className="size-2.5 opacity-100" />
              ) : (
                <Check className="size-3 opacity-70" />
              )}
            </Switch.Icon>
          </Switch.Thumb>
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}
