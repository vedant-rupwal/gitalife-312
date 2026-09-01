import React from "react";
import { cn } from "@/lib/utils";

export const brandLogoPath = "/gitalife-312-logo.jpeg";

export default function BrandLogo({ className, imageClassName, alt = "GitaLife 312" }) {
  return (
    <span className={cn("inline-flex items-center justify-center overflow-hidden rounded-full bg-white", className)}>
      <img
        src={brandLogoPath}
        alt={alt}
        className={cn("h-full w-full object-cover", imageClassName)}
      />
    </span>
  );
}
