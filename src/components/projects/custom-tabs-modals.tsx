import { SetStateAction, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import Loader1 from "@/components/ui/loader1"
import { Textarea } from "../ui/textarea"

// ─────────────────────────────────────────────────────────────────────────────
// CREATE TAB MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface CreateTabModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (data: { name: string; description: string }) => Promise<void>
    isLoading?: boolean
}

export function CreateTabModal({ isOpen, onClose, onCreate, isLoading = false }: CreateTabModalProps) {
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async () => {
        if (!name.trim()) {
            setError("Tab name is required")
            return
        }

        setError(null)
        try {
            await onCreate({ name: name.trim(), description: description.trim() })
            setName("")
            setDescription("")
            onClose()
        } catch (err: any) {
            setError(err?.message ?? "Failed to create tab")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Custom Contents</DialogTitle>
                    <DialogDescription>Add a new tab to this doc</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {error && (
                        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                            placeholder="e.g. Release Notes"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                            placeholder="Brief description"
                            value={description}
                            onChange={(e: { target: { value: SetStateAction<string> } }) => setDescription(e.target.value)}
                            disabled={isLoading}
                            className="min-h-[80px]"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isLoading || !name.trim()}>
                        {isLoading && <Loader1 className="h-4 w-4 mr-2" />}
                        Create Tab
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// RENAME TAB MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface RenameTabModalProps {
    isOpen: boolean
    onClose: () => void
    currentName: string
    onRename: (newName: string) => Promise<void>
    isLoading?: boolean
}

export function RenameTabModal({ isOpen, onClose, currentName, onRename, isLoading = false }: RenameTabModalProps) {
    const [newName, setNewName] = useState(currentName)
    const [error, setError] = useState<string | null>(null)

    const handleRename = async () => {
        if (!newName.trim()) {
            setError("Tab name is required")
            return
        }

        if (newName === currentName) {
            onClose()
            return
        }

        setError(null)
        try {
            await onRename(newName.trim())
            onClose()
        } catch (err: any) {
            setError(err?.message ?? "Failed to rename tab")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Rename Tab</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {error && (
                        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">New Tab Name</label>
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleRename} disabled={isLoading || newName === currentName || !newName.trim()}>
                        {isLoading && <Loader1 className="h-4 w-4 mr-2" />}
                        Rename
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE TAB MODAL
// ─────────────────────────────────────────────────────────────────────────────

interface DeleteTabModalProps {
    isOpen: boolean
    onClose: () => void
    tabName: string
    onDelete: () => Promise<void>
    isLoading?: boolean
}

export function DeleteTabModal({ isOpen, onClose, tabName, onDelete, isLoading = false }: DeleteTabModalProps) {
    const [error, setError] = useState<string | null>(null)

    const handleDelete = async () => {
        setError(null)
        try {
            await onDelete()
            onClose()
        } catch (err: any) {
            setError(err?.message ?? "Failed to delete tab")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Tab
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete the tab <strong>"{tabName}"</strong>? This action cannot be undone, and all content in this tab will be permanently deleted.
                    </p>

                    {error && (
                        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                        {isLoading && <Loader1 className="h-4 w-4 mr-2" />}
                        Delete Tab
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
