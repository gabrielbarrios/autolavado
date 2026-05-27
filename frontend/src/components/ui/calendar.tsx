"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

/** Calendario premium (react-day-picker v9) localizado a español. */
export function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays
      animate
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-2",
        month_caption: "flex items-center justify-center pt-1 capitalize text-sm font-semibold",
        caption_label: "capitalize",
        nav: "flex items-center justify-between absolute top-3 left-3 right-3",
        button_previous: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background opacity-70 hover:opacity-100 hover:bg-accent",
        ),
        button_next: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background opacity-70 hover:opacity-100 hover:bg-accent",
        ),
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-xs capitalize",
        week: "flex w-full mt-2",
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-normal transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:font-semibold",
        outside: "text-muted-foreground/40",
        disabled:
          "[&>button]:text-muted-foreground/40 [&>button]:line-through [&>button]:opacity-50 [&>button]:hover:bg-transparent [&>button]:cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...rest} />
          ) : (
            <ChevronRight className="h-4 w-4" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
