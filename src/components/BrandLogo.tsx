import { memo } from "react";
import { cn } from "@/lib/utils";

/** App mark — raster asset copied to `dist/` from `public/pi-code-logo.png`. */
export const BrandLogo = memo(function BrandLogo({ className }: { className?: string }) {
  // Absolute `/…` breaks under Electron production (`loadFile` → file://): resolves to drive root, not dist/.
  const src = new URL("pi-code-logo.png", window.location.href).href;

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={cn("shrink-0 select-none object-contain", className)}
    />
  );
});
