import React from "react"
import { cn } from "@/lib/utils"

type LoaderSize = "xs" | "sm" | "md" | "lg" | "xl"

const SIZE_MAP: Record<LoaderSize, string> = {
  xs: "0.75rem",
  sm: "1rem",
  md: "1.5rem",
  lg: "2rem",
  xl: "3rem",
}

interface LoaderProps {
  /** Preset size key or any valid CSS length. Default: "md" */
  size?: LoaderSize | string
  /** Any valid CSS color. Defaults to currentColor (inherits text color). */
  color?: string
  /** Animation duration. Default: "1.1s" */
  speed?: string
  /** Extra Tailwind / CSS classes (e.g. "text-primary"). */
  className?: string
}

export default function Loader({
  size = "md",
  color,
  speed,
  className,
}: LoaderProps) {
  const resolvedSize =
    size in SIZE_MAP ? SIZE_MAP[size as LoaderSize] : size

  return (
    <span
      className={cn("loader", className)}
      style={{
        fontSize: resolvedSize,
        ...(color && { "--loader-color": color }),
        ...(speed && { "--loader-speed": speed }),
      } as React.CSSProperties}
      role="status"
      aria-label="Loading"
    />
  )
}
