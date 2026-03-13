import { AlertTriangle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import Loader1 from "@/components/ui/loader1"

export interface StaleSectionBannerProps {
    changeSummary: string | null
    onViewDiff: () => void
    onAcceptAI: () => void
    onDismiss: () => void
    accepting: boolean
}

export function StaleSectionBanner({
    changeSummary,
    onViewDiff,
    onAcceptAI,
    onDismiss,
    accepting,
}: StaleSectionBannerProps) {
    return (
        <div className="mx-6 mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3 flex flex-col gap-2 shrink-0">
            <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-primary dark:text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary dark:text-primary">
                        (AI) has updated this section since your last edit
                    </p>
                    {changeSummary && (
                        <p className="text-xs text-primary/80 dark:text-primary/80 mt-0.5 line-clamp-2">{changeSummary}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 pl-6 flex-wrap">
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-primary/30 hover:bg-primary/10"
                    onClick={onViewDiff}
                >
                    <Eye className="mr-1.5 h-3 w-3" /> View AI version
                </Button>
                <Button size="sm" className="h-7 text-xs" disabled={accepting} onClick={onAcceptAI}>
                    {accepting && <Loader1 className="mr-1.5 h-3 w-3 " />}
                    Accept AI version
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onDismiss}>
                    Keep my edit
                </Button>
            </div>
        </div>
    )
}
