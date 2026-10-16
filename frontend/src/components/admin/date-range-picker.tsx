"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dateRangeLabel, startOfDay } from "@/lib/report-dates";

/**
 * Button that opens a range calendar. One click marks a day; the second
 * closes the range. Future days are never selectable: nothing was charged there.
 */
export function DateRangePicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: DateRange | undefined;
  onChange: (next: DateRange | undefined) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const today = startOfDay(new Date());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start font-normal", !value?.from && "text-muted-foreground")}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">{dateRangeLabel(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          defaultMonth={value?.from ?? today}
          disabled={{ after: today }}
          endMonth={today}
          numberOfMonths={2}
          classNames={{
            months: "flex flex-col gap-4 sm:flex-row",
            // `!` because the day also carries the `selected` class, which paints bg-primary.
            range_middle:
              "[&>button]:rounded-none! [&>button]:bg-primary/20! [&>button]:text-foreground! [&>button]:hover:bg-primary/30!",
            range_start: "[&>button]:rounded-r-none",
            range_end: "[&>button]:rounded-l-none",
          }}
        />
        <div className="flex items-center justify-between gap-2 border-t border-border/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {value?.from && !value?.to ? "Elige el último día" : "Un clic por día; dos para un rango."}
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>
            Listo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
