"use client";

import { Switch } from "@heroui/react";

interface ProductStatusSwitchProps {
  isActive: boolean;
  isDisabled?: boolean;
  onToggle: (isActive: boolean) => void;
}

export function ProductStatusSwitch({
  isActive,
  isDisabled,
  onToggle,
}: ProductStatusSwitchProps) {
  return (
    <Switch isDisabled={isDisabled} isSelected={isActive} onChange={onToggle}>
      <Switch.Content>
        <Switch.Control className={isActive ? "bg-green-500/80" : ""}>
          <Switch.Thumb className="bg-ap-surface text-ap-foreground" />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}
