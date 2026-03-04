import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * A minimal accessible toggle switch — no Radix dependency required.
 */
interface SwitchProps {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    id?: string
    disabled?: boolean
    "aria-label"?: string
    className?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
    ({ checked, onCheckedChange, id, disabled, "aria-label": ariaLabel, className }, ref) => {
        return (
            <button
                ref={ref}
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => onCheckedChange(!checked)}
                className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                    checked ? "bg-primary" : "bg-muted",
                    className,
                )}
            >
                <span
                    className={cn(
                        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-none ring-0 transition-transform",
                        checked ? "translate-x-4" : "translate-x-0",
                    )}
                />
            </button>
        )
    },
)

Switch.displayName = "Switch"

export { Switch }
