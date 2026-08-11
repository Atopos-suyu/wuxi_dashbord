import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}
