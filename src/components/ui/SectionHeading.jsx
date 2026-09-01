import React from "react";
import { cn } from "@/lib/utils";

export default function SectionHeading({ eyebrow, title, subtitle, align = "left", dark = false }) {
  return (
    <div className={cn("mb-10", align === "center" && "text-center mx-auto max-w-2xl")}>
      {eyebrow && (
        <div className={cn("flex items-center gap-2 mb-3", align === "center" && "justify-center")}>
          <div className="h-px w-8 bg-saffron" />
          <span className="font-heading text-xs font-semibold text-saffron uppercase tracking-wider">{eyebrow}</span>
          <div className="h-px w-8 bg-saffron" />
        </div>
      )}
      <h2 className={cn(
        "font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight",
        dark ? "text-white" : "text-navy"
      )}>
        {title}
      </h2>
      {subtitle && (
        <p className={cn(
          "mt-4 font-body text-base sm:text-lg",
          dark ? "text-white/60" : "text-navy/60"
        )}>
          {subtitle}
        </p>
      )}
    </div>
  );
}