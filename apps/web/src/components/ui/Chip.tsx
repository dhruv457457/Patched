import React, { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ArcMark } from "@/components/brand/PartnerLogos";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "arc" | "green" | "orange";
}

export function Chip({
  variant = "default",
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold border-[1.5px] border-[var(--line)] rounded-full px-2.5 py-0.5 bg-[var(--card)] text-[var(--ink)] select-none",
        variant === "green" && "bg-[var(--green-soft)] border-[var(--green)] text-[var(--green)]",
        variant === "orange" && "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-text)]",
        className
      )}
      {...props}
    >
      {variant === "arc" && <ArcMark size={12} className="flex-none" />}
      {children}
    </span>
  );
}
