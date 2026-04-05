import { memo } from "react";
import { cn } from "@/lib/utils";

/** App mark — raster asset from `public/pi-code-logo.png`. */
export const BrandLogo = memo(function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/pi-code-logo.png"
      alt=""
      draggable={false}
      className={cn("shrink-0 select-none object-contain", className)}
    />
  );
});
