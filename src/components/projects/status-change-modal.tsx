import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DOC_STATUS_CONFIG } from "@/components/projects/doc-status"
import { cn } from "@/lib/utils"
import Loader1 from "@/components/ui/loader1"
import type { ApiShare } from "@/lib/api"
import type { DocStatus } from "@/store/doc-tracker"

export interface StatusChangeModalProps {
    isOpen: boolean
    onClose: () => void
    pendingStatus: DocStatus | null
    onConfirm: (note: string, taggedMember?: string) => void
    members: ApiShare[]
    loadingMembers: boolean
}

export function StatusChangeModal({
    isOpen,
    onClose,
    pendingStatus,
    onConfirm,
    members,
    loadingMembers,
}: StatusChangeModalProps) {
    const [note, setNote] = useState("")
    const [tagged, setTagged] = useState<string>("")

    // reset fields each time the modal opens
    useEffect(() => {
        if (isOpen) {
            setNote("")
            setTagged("")
        }
    }, [isOpen])

    if (!pendingStatus) return null
    const cfg = DOC_STATUS_CONFIG[pendingStatus]
    const isChangesRequested = pendingStatus === "changes_requested"
    const Icon = cfg.icon

    const activeMembers = members.filter((m) => m.status === "accepted")

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4 shrink-0", cfg.iconClass)} />
                        Set status to "{cfg.label}"
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Note */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            Message <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <textarea
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none min-h-20 placeholder:text-muted-foreground"
                            placeholder={
                                isChangesRequested ? "Describe what needs to change..." : "Add a note for this status change..."
                            }
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    {/* Tag member — only for changes_requested */}
                    {isChangesRequested && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                Assign to <span className="text-muted-foreground font-normal">(optional)</span>
                            </label>
                            {loadingMembers ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader1 className="h-3 w-3" /> Loading members...
                                </div>
                            ) : activeMembers.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No invited members yet.</p>
                            ) : (
                                <div className="space-y-1">
                                    {activeMembers.map((m) => {
                                        const display = m.inviteeUser?.name ?? m.inviteeEmail
                                        const val = m.inviteeEmail
                                        return (
                                            <label
                                                key={m._id}
                                                className={cn(
                                                    "flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                                                    tagged === val
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:bg-muted",
                                                )}
                                            >
                                                <input
                                                    type="radio"
                                                    name="tagged-member"
                                                    className="h-3.5 w-3.5 accent-primary"
                                                    checked={tagged === val}
                                                    onChange={() => setTagged(tagged === val ? "" : val)}
                                                    onClick={() => {
                                                        if (tagged === val) setTagged("")
                                                    }}
                                                />
                                                <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                                    <span className="text-[10px] font-semibold text-primary">
                                                        {display[0].toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium truncate">{display}</div>
                                                    {m.inviteeUser?.name && (
                                                        <div className="text-xs text-muted-foreground truncate">{m.inviteeEmail}</div>
                                                    )}
                                                </div>
                                                <span className="ml-auto text-[10px] text-muted-foreground capitalize">{m.role}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={() => onConfirm(note.trim(), tagged || undefined)}>
                        <Icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        {cfg.label}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
