import { useState, useRef, useCallback } from "react"
import { Upload, Link2, FileText, X, RefreshCw, Check, AlertCircle, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { apiSpecApi, type ApiSpec } from "@/lib/api"

interface Props {
    projectId: string
    open: boolean
    onClose: () => void
    onImported: (spec: ApiSpec) => void
    existingSpec?: ApiSpec | null
}

type Tab = "file" | "url" | "raw"

export function ApiSpecImportModal({ projectId, open, onClose, onImported, existingSpec }: Props) {
    const [tab, setTab] = useState<Tab>("file")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // File tab
    const [dragOver, setDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // URL tab
    const [url, setUrl] = useState("")
    const [autoSync, setAutoSync] = useState(false)

    // Raw tab
    const [rawText, setRawText] = useState("")

    const reset = useCallback(() => {
        setLoading(false)
        setError(null)
        setSelectedFile(null)
        setUrl("")
        setRawText("")
        setAutoSync(false)
        setDragOver(false)
    }, [])

    const handleClose = () => {
        reset()
        onClose()
    }

    // ── File drag & drop ─────────────────────────────────────────

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) setSelectedFile(file)
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null
        setSelectedFile(file)
    }

    // ── Submit ───────────────────────────────────────────────────

    const handleImport = async () => {
        setError(null)
        setLoading(true)
        try {
            let result: ApiSpec

            if (tab === "file") {
                if (!selectedFile) { setError("Please select a file."); return }
                const fd = new FormData()
                fd.append("file", selectedFile)
                fd.append("method", "file")
                const data = await apiSpecApi.importFile(projectId, fd)
                result = data.spec
            } else if (tab === "url") {
                if (!url.trim()) { setError("Please enter a URL."); return }
                const data = await apiSpecApi.importUrl(projectId, url.trim(), autoSync)
                result = data.spec
            } else {
                if (!rawText.trim()) { setError("Please paste a spec."); return }
                const data = await apiSpecApi.importRaw(projectId, rawText.trim())
                result = data.spec
            }

            onImported(result)
            reset()
            onClose()
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Import failed. Please check your spec."
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    const TABS: { key: Tab; icon: React.ElementType; label: string }[] = [
        { key: "file", icon: Upload, label: "File Upload" },
        { key: "url", icon: Link2, label: "URL" },
        { key: "raw", icon: FileText, label: "Raw Paste" },
    ]

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Upload className="h-4 w-4" />
                        {existingSpec ? "Re-import API Spec" : "Import API Spec"}
                    </DialogTitle>
                </DialogHeader>

                {existingSpec && (
                    <div className="mx-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                        Currently imported: <span className="font-semibold">{existingSpec.info.title}</span>{" "}
                        ({existingSpec.specVersion}) — importing will replace the existing spec.
                    </div>
                )}

                {/* Tab switcher */}
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                    {TABS.map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            onClick={() => { setTab(key); setError(null) }}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                                tab === key
                                    ? "bg-background shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab panels */}
                <div className="mt-1 min-h-50">

                    {/* File upload */}
                    {tab === "file" && (
                        <div className="space-y-3">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                                    dragOver
                                        ? "border-primary bg-primary/5"
                                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,.yaml,.yml"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                {selectedFile ? (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-green-500" />
                                        <span className="font-medium">{selectedFile.name}</span>
                                        <span className="text-muted-foreground">
                                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                                            className="ml-1 text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">
                                            Drag & drop or <span className="text-primary underline underline-offset-2">click to select</span>
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground/60">.json, .yaml, .yml — max 5 MB</p>
                                    </>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Supports <strong>OpenAPI 2.0 / 3.0 / 3.1</strong> and <strong>Postman Collection v2.x</strong>
                            </p>
                        </div>
                    )}

                    {/* URL import */}
                    {tab === "url" && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Spec URL</Label>
                                <Input
                                    placeholder="https://api.example.com/openapi.json"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleImport()}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Must be publicly accessible. Supports JSON and YAML.
                                </p>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2.5">
                                <div
                                    onClick={() => setAutoSync((v) => !v)}
                                    className={cn(
                                        "relative h-5 w-9 rounded-full transition-colors",
                                        autoSync ? "bg-primary" : "bg-muted-foreground/30",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                                            autoSync ? "translate-x-4" : "translate-x-0.5",
                                        )}
                                    />
                                </div>
                                <span className="text-sm">Auto-sync periodically</span>
                            </label>
                        </div>
                    )}

                    {/* Raw paste */}
                    {tab === "raw" && (
                        <div className="space-y-2">
                            <Label className="text-xs">Paste OpenAPI / Swagger / Postman JSON or YAML</Label>
                            <textarea
                                className="h-44 w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder={'{\n  "openapi": "3.0.0",\n  "info": { ... },\n  "paths": { ... }\n}'}
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleImport} disabled={loading}>
                        {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                        {loading ? "Importing…" : existingSpec ? "Re-import" : "Import"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
