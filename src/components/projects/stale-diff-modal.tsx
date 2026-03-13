import { Button } from "@/components/ui/button"
import { DocRenderer } from "@/components/projects/DocRenderer"
import Loader1 from "@/components/ui/loader1"

export interface StaleDiffModalProps {
    sectionLabel: string
    userContent: string
    aiContent: string
    onClose: () => void
    onAcceptAI: () => void
    accepting: boolean
}

export function StaleDiffModal({
    sectionLabel,
    userContent,
    aiContent,
    onClose,
    onAcceptAI,
    accepting,
}: StaleDiffModalProps) {
    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
                <div>
                    <h2 className="font-semibold text-sm">Compare versions — {sectionLabel}</h2>
                    <p className="text-xs text-muted-foreground">Left: your edit · Right: new AI version</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" disabled={accepting} onClick={onAcceptAI}>
                        {accepting && <Loader1 className="mr-1.5 h-3 w-3 " />}
                        Accept AI version
                    </Button>
                    <Button size="sm" variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto border-r border-border p-6">
                    <div className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Edit</div>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        <DocRenderer content={userContent} />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-primary/2">
                    <div className="mb-3 text-xs font-semibold text-primary uppercase tracking-wider">New AI Version</div>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        <DocRenderer content={aiContent} />
                    </div>
                </div>
            </div>
        </div>
    )
}
