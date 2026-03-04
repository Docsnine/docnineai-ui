import { cn } from "@/lib/utils"

type LoaderSize = "xs" | "sm" | "md" | "lg" | "xl"

const SIZE_MAP: Record<LoaderSize, number> = {
    xs: 14,
    sm: 18,
    md: 24,
    lg: 32,
    xl: 48,
}

interface LoaderProps {
    /** Preset size or an explicit px number. Default: "md" */
    size?: LoaderSize | number
    /** Explicit color. Falls back to currentColor (inherits text color). */
    color?: string
    /** Animation duration. Default: "0.8s" */
    speed?: string
    /** Stroke thickness in px. Default: 2.5 */
    strokeWidth?: number
    /** Additional Tailwind / CSS classes (e.g. "text-primary"). */
    className?: string
    /** Accessible label. Default: "Loading" */
    label?: string
}

export default function Loader1({
    size = "md",
    color,
    speed = "0.8s",
    strokeWidth = 2.5,
    className,
    label = "Loading",
}: LoaderProps) {
    const px = typeof size === "number" ? size : SIZE_MAP[size]

    return (
        <svg
            width={px}
            height={px}
            viewBox="0 0 24 24"
            fill="none"
            role="status"
            aria-label={label}
            className={cn("", className)}
            style={{
                color: color ?? undefined,
                animationDuration: speed,
            }}
        >
            {/* Background track */}
            <circle
                cx="12"
                cy="12"
                r="9.5"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={0.2}
            />
            {/* Spinning arc */}
            <path
                d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
        </svg>
    )
}
