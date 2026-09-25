"use client";

import {
  Calendar,
  DateField,
  DatePicker,
  TimeField,
  Label,
  cn,
} from "@heroui/react";
import { Clock3 } from "lucide-react";

export function TimeLimitedDatePicker({
  value,
  onChange,
  label,
}: {
  value: any;
  onChange: (v: any) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[12px] font-medium text-ap-muted flex items-center gap-1.5">
        <Clock3 size={13} /> {label}
      </label>
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
          <>
            <DateField.Group
              fullWidth
              className={cn(
                "w-full rounded-xl border border-ap-border bg-ap-field-background py-2 text-[13px] text-ap-foreground focus-within:border-ap-accent focus-within:ring-1 focus-within:ring-ap-accent transition-all flex items-center shadow-none hover:border-ap-accent/40",
                isFocusWithin &&
                  "ring-2! ring-ap-accent-soft! border-ap-accent!",
              )}
            >
              <DateField.Input className="flex-1 text-left min-w-0">
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateField.Suffix className="ml-auto shrink-0">
                <DatePicker.Trigger className="rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-ap-muted outline-none">
                  <DatePicker.TriggerIndicator />
                </DatePicker.Trigger>
              </DateField.Suffix>
            </DateField.Group>

            <DatePicker.Popover
              className="flex flex-col gap-3 bg-ap-surface border border-ap-border shadow-2xl rounded-2xl p-4 overflow-hidden z-50"
              style={{ ...({ "--trigger-width": "100%" } as any) }}
            >
              <Calendar aria-label={label}>
                <Calendar.Header className="flex items-center justify-between mb-3 w-full">
                  <Calendar.YearPickerTrigger className="px-2 py-1 rounded-md hover:bg-black/5 font-semibold text-sm flex items-center gap-1">
                    <Calendar.YearPickerTriggerHeading />
                    <Calendar.YearPickerTriggerIndicator />
                  </Calendar.YearPickerTrigger>
                  <div className="flex items-center gap-1">
                    <Calendar.NavButton
                      slot="previous"
                      className="p-1.5 rounded-lg hover:bg-black/5 outline-none"
                    />
                    <Calendar.NavButton
                      slot="next"
                      className="p-1.5 rounded-lg hover:bg-black/5 outline-none"
                    />
                  </div>
                </Calendar.Header>
                <Calendar.Grid className="w-full border-collapse">
                  <Calendar.GridHeader>
                    {(day) => (
                      <Calendar.HeaderCell className="text-xs font-semibold text-ap-muted tracking-wide pb-2 text-center">
                        {day}
                      </Calendar.HeaderCell>
                    )}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>
                    {(date) => (
                      <Calendar.Cell
                        date={date}
                        className="w-9 h-9 text-sm rounded-lg flex items-center justify-center hover:bg-black/5 data-[selected=true]:bg-ap-accent data-[selected=true]:text-ap-accent-foreground data-[selected=true]:font-bold transition-all cursor-pointer outline-none mx-auto"
                      />
                    )}
                  </Calendar.GridBody>
                </Calendar.Grid>
                <Calendar.YearPickerGrid>
                  <Calendar.YearPickerGridBody>
                    {({ year }) => (
                      <Calendar.YearPickerCell
                        year={year}
                        className="py-1 px-2 rounded-md hover:bg-black/5 text-sm cursor-pointer data-[selected=true]:bg-ap-accent data-[selected=true]:text-ap-accent-foreground outline-none"
                      />
                    )}
                  </Calendar.YearPickerGridBody>
                </Calendar.YearPickerGrid>
              </Calendar>

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
                  <TimeField.Group className="flex items-center bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded-lg text-sm font-medium border border-transparent focus-within:border-ap-accent focus-within:bg-ap-surface focus-within:ring-1 focus-within:ring-ap-accent transition-all cursor-text">
                    <TimeField.Input>
                      {(segment) => <TimeField.Segment segment={segment} />}
                    </TimeField.Input>
                  </TimeField.Group>
                </TimeField>
              </div>
            </DatePicker.Popover>
          </>
        )}
      </DatePicker>
    </div>
  );
}
