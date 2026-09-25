"use client";

import {
  Calendar as HeroUICalendar,
  DateField,
  DatePicker,
  Label,
  TimeField,
  cn,
} from "@heroui/react";

export function CouponDatePicker({
  value,
  onChange,
  label,
}: {
  value: any;
  onChange: (v: any) => void;
  label: string;
}) {
  return (
    <DatePicker
      aria-label={label}
      granularity="minute"
      hourCycle={12}
      hideTimeZone
      value={value}
      onChange={onChange}
      className="w-full"
    >
      {({ state, isFocusWithin }) => (
        <div className="flex flex-col gap-1 w-full">
          <label className="text-[13px] font-medium text-ap-foreground">
            {label}
          </label>
          <DateField.Group
            fullWidth
            className={cn(
              "w-full rounded-xl border border-ap-border bg-ap-field-background/30 py-2 text-[14px] text-ap-foreground shadow-sm outline-none transition-all placeholder:text-ap-muted/60 focus-within:border-ap-accent focus-within:ring-2 focus-within:ring-ap-accent-soft flex items-center hover:border-ap-accent/40",
              isFocusWithin && "ring-2! ring-ap-accent-soft! border-ap-accent!",
            )}
          >
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DatePicker.Trigger>
                <DatePicker.TriggerIndicator />
              </DatePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>

          <DatePicker.Popover>
            <HeroUICalendar aria-label={label}>
              <HeroUICalendar.Header className="flex items-center justify-between mb-3 w-full">
                <HeroUICalendar.YearPickerTrigger>
                  <HeroUICalendar.YearPickerTriggerHeading />
                  <HeroUICalendar.YearPickerTriggerIndicator />
                </HeroUICalendar.YearPickerTrigger>
                <div className="flex items-center gap-1">
                  <HeroUICalendar.NavButton
                    slot="previous"
                    className="p-1.5 outline-none"
                  />
                  <HeroUICalendar.NavButton
                    slot="next"
                    className="p-1.5 outline-none"
                  />
                </div>
              </HeroUICalendar.Header>
              <HeroUICalendar.Grid className="w-full border-collapse">
                <HeroUICalendar.GridHeader>
                  {(day) => (
                    <HeroUICalendar.HeaderCell className="text-xs font-semibold text-ap-muted tracking-wide pb-2 text-center">
                      {day}
                    </HeroUICalendar.HeaderCell>
                  )}
                </HeroUICalendar.GridHeader>
                <HeroUICalendar.GridBody>
                  {(date) => (
                    <HeroUICalendar.Cell date={date} className="rounded-lg" />
                  )}
                </HeroUICalendar.GridBody>
              </HeroUICalendar.Grid>
              <HeroUICalendar.YearPickerGrid>
                <HeroUICalendar.YearPickerGridBody>
                  {({ year }) => (
                    <HeroUICalendar.YearPickerCell
                      year={year}
                      className="rounded-md"
                    />
                  )}
                </HeroUICalendar.YearPickerGridBody>
              </HeroUICalendar.YearPickerGrid>
            </HeroUICalendar>

            <div className="flex items-center justify-between border-t border-ap-border/50 pt-3 mt-1">
              <Label className="text-[12px] font-medium text-ap-muted">
                Time
              </Label>
              <TimeField
                aria-label="Time"
                granularity="minute"
                hourCycle={12}
                hideTimeZone
                value={state.timeValue}
                onChange={(v) => state.setTimeValue(v as any)}
              >
                <TimeField.Group variant="secondary">
                  <TimeField.Input>
                    {(segment) => <TimeField.Segment segment={segment} />}
                  </TimeField.Input>
                </TimeField.Group>
              </TimeField>
            </div>
          </DatePicker.Popover>
        </div>
      )}
    </DatePicker>
  );
}
