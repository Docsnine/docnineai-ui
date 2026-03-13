import * as React from "react"
import { cn } from "@/lib/utils"

// Dropdown Menu Context
const DropdownMenuContext = React.createContext<{
    open: boolean
    setOpen: (open: boolean) => void
} | null>(null)

// Root Component
interface DropdownMenuProps {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const DropdownMenu = ({ children, open: controlledOpen, onOpenChange }: DropdownMenuProps) => {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const isControlled = controlledOpen !== undefined

    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = (value: boolean) => {
        if (isControlled) {
            onOpenChange?.(value)
        } else {
            setInternalOpen(value)
        }
    }

    return (
        <DropdownMenuContext.Provider value={{ open, setOpen }}>
            <div className="relative">
                {children}
            </div>
        </DropdownMenuContext.Provider>
    )
}

// Trigger Component
interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    children?: React.ReactNode
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
    ({ asChild, className, children, ...props }, ref) => {
        const context = React.useContext(DropdownMenuContext)

        if (asChild && React.isValidElement(children)) {
            const childProps = (children as React.ReactElement<any>).props
            return React.cloneElement(children as React.ReactElement<any>, {
                onClick: (e: React.MouseEvent) => {
                    context?.setOpen(!context.open)
                    childProps?.onClick?.(e)
                },
            })
        }

        return (
            <button
                ref={ref}
                className={className}
                onClick={() => context?.setOpen(!context?.open)}
                {...props}
            >
                {children}
            </button>
        )
    }
)

DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

// Content Component
interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
    align?: "start" | "end"
    side?: "bottom" | "top"
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
    ({ className, align = "start", side = "bottom", ...props }, ref) => {
        const context = React.useContext(DropdownMenuContext)

        if (!context?.open) return null

        return (
            <>
                {/* Backdrop to close menu */}
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => context.setOpen(false)}
                    onContextMenu={(e) => e.preventDefault()}
                />
                {/* Menu Content */}
                <div
                    ref={ref}
                    className={cn(
                        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
                        align === "start" ? "left-0" : "right-0",
                        side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
                        className
                    )}
                    onClick={(e) => e.stopPropagation()}
                    {...props}
                />
            </>
        )
    }
)

DropdownMenuContent.displayName = "DropdownMenuContent"

// MenuItem Component
interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    inset?: boolean
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
    ({ className, inset, onClick, ...props }, ref) => {
        const context = React.useContext(DropdownMenuContext)

        return (
            <button
                ref={ref}
                className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground hover:bg-accent",
                    inset && "pl-8",
                    className
                )}
                onClick={(e) => {
                    context?.setOpen(false)
                    onClick?.(e)
                }}
                {...props}
            />
        )
    }
)
DropdownMenuItem.displayName = "DropdownMenuItem"

// Separator Component
const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("-mx-1 my-1 h-px bg-muted", className)}
            {...props}
        />
    )
)
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator
}
