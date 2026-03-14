import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBannerProps {
    message: string
    onRetry?: () => void
    className?: string
}

export function ErrorBanner({ message, onRetry, className }: ErrorBannerProps) {
    return (
        <div className={`rounded-md bg-destructive/15 p-4 text-sm text-destructive flex items-center justify-between ${className ?? ""}`}>
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{message}</span>
            </div>
            {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                    <RefreshCw className="mr-1 h-3 w-3" /> Retry
                </Button>
            )}
        </div>
    )
}
