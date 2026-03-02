/**
 * OtherDocsPanel — "Other Docs" tab content inside the documentation viewer.
 *
 * Features:
 *   • Upload supporting documents (any common file format, max 10 MB)
 *   • Display file list with icon, name, size, type, date, description
 *   • Inline PDF / image preview in a fullscreen overlay
 *   • Per-file description editing
 *   • Delete with confirmation
 *   • Graceful empty state and error handling
 */
import { useState, useEffect, useRef, useCallback } from "react"
import {
  Upload,
  File,
  FileText,
  Trash2,
  Eye,
  Download,
  Loader2,
  Plus,
  FilePlus2,
  FileSpreadsheet,
  Presentation,
  X,
  Pencil,
  Check,
  AlertCircle,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { attachmentsApi, ApiAttachment, getAccessToken, API_BASE } from "@/lib/api"

// ── File type helpers ──────────────────────────────────────────────────────

const EXT_ICON_MAP: Record<string, React.ElementType> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
  csv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  ppt: Presentation,
  pptx: Presentation,
}

function fileIcon(fileName: string): React.ElementType {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  return EXT_ICON_MAP[ext] ?? File
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const PREVIEWABLE = new Set(["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg"])

function isPreviewable(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  return PREVIEWABLE.has(ext)
}

// Allowed extensions (used for accept attribute + friendly display)
const ACCEPTED_EXTENSIONS =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.svg"

// ── Inline preview (fullscreen overlay) ───────────────────────────────────

function PreviewOverlay({
  url,
  fileName,
  onClose,
}: {
  url: string
  fileName: string
  onClose: () => void
}) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{fileName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={url}
            download={fileName}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border bg-muted hover:bg-muted/80 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4">
        {isImage ? (
          <div className="flex items-center justify-center h-full">
            <img
              src={url}
              alt={fileName}
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          </div>
        ) : (
          <iframe
            src={url}
            title={fileName}
            className="w-full h-full rounded-lg border border-border"
          />
        )}
      </div>
    </div>
  )
}

// ── Single attachment row ─────────────────────────────────────────────────

function AttachmentRow({
  attachment,
  projectId,
  onDeleted,
  onDescriptionSaved,
}: {
  attachment: ApiAttachment
  projectId: string
  onDeleted: (id: string) => void
  onDescriptionSaved: (id: string, desc: string) => void
}) {
  const Icon = fileIcon(attachment.fileName)
  const [showPreview, setShowPreview] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [desc, setDesc] = useState(attachment.description ?? "")
  const [savingDesc, setSavingDesc] = useState(false)
  const [showMeta, setShowMeta] = useState(false)

  // Authenticated download/preview URL
  const rawUrl = attachmentsApi.downloadUrl(projectId, attachment._id)
  // We stream it through the API (which requires the Bearer token).
  // For iframes/images we need an authenticated URL — we create a blob URL.
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const blobRef = useRef<string | null>(null)

  const fetchBlob = useCallback(async () => {
    if (blobRef.current) return blobRef.current
    const token = getAccessToken()
    const res = await fetch(rawUrl, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error("Download failed")
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    blobRef.current = url
    setBlobUrl(url)
    return url
  }, [rawUrl])

  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current)
    }
  }, [])

  async function handlePreview() {
    try {
      const url = await fetchBlob()
      setBlobUrl(url)
      setShowPreview(true)
    } catch {
      // fall through — download button still works
    }
  }

  async function handleDownload() {
    try {
      const url = await fetchBlob()
      const a = document.createElement("a")
      a.href = url
      a.download = attachment.fileName
      a.click()
    } catch {
      /* ignore */
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await attachmentsApi.delete(projectId, attachment._id)
      onDeleted(attachment._id)
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handleSaveDesc() {
    setSavingDesc(true)
    try {
      const res = await attachmentsApi.updateDescription(projectId, attachment._id, desc)
      onDescriptionSaved(attachment._id, res.attachment.description)
      setEditingDesc(false)
    } catch {
      /* ignore */
    } finally {
      setSavingDesc(false)
    }
  }

  const ext = attachment.fileName.split(".").pop()?.toUpperCase() ?? "FILE"

  return (
    <>
      <div className="group flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
        {/* Icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-md border border-border bg-muted/50 shrink-0 mt-0.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Main body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate" title={attachment.fileName}>
                {attachment.fileName}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {ext}
                </span>
                <span className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{formatDate(attachment.createdAt)}</span>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                  onClick={() => setShowMeta((s) => !s)}
                >
                  <ChevronDown className={cn("h-3 w-3 transition-transform", showMeta && "rotate-180")} />
                  {attachment.uploaderName}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {isPreviewable(attachment.fileName) && (
                <button
                  title="Preview"
                  onClick={handlePreview}
                  className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                title="Download"
                onClick={handleDownload}
                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                title="Edit description"
                onClick={() => setEditingDesc((e) => !e)}
                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {confirmDelete ? (
                <>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-[11px] px-2 py-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-60"
                  >
                    {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete?"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[11px] px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors text-muted-foreground"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  title="Delete"
                  onClick={() => setConfirmDelete(true)}
                  className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Collapsible uploader info */}
          {showMeta && (
            <p className="text-xs text-muted-foreground mt-1">
              Uploaded by <span className="text-foreground font-medium">{attachment.uploaderName}</span>
            </p>
          )}

          {/* Description row */}
          {editingDesc ? (
            <div className="flex items-center gap-2 mt-2">
              <Input
                className="h-7 text-xs"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Add a short description…"
                maxLength={500}
                autoFocus
              />
              <button
                disabled={savingDesc}
                onClick={handleSaveDesc}
                className="h-7 w-7 flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {savingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => { setEditingDesc(false); setDesc(attachment.description ?? "") }}
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            attachment.description && (
              <p className="text-xs text-muted-foreground mt-1 italic">{attachment.description}</p>
            )
          )}
        </div>
      </div>

      {showPreview && blobUrl && (
        <PreviewOverlay
          url={blobUrl}
          fileName={attachment.fileName}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}

// ── Drop zone ─────────────────────────────────────────────────────────────

function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onFiles(files)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
        dragging
          ? "border-primary/60 bg-primary/5"
          : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
      )}
      onClick={() => inputRef.current?.click()}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted border border-border">
        <FilePlus2 className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          Drop files here or <span className="text-primary">browse</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOCX, XLSX, CSV, PPTX, TXT, images — up to 10 MB each
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length > 0) onFiles(files)
          e.target.value = ""
        }}
      />
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────

interface OtherDocsPanelProps {
  projectId: string
}

export function OtherDocsPanel({ projectId }: OtherDocsPanelProps) {
  const [attachments, setAttachments] = useState<ApiAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<{ file: File; progress: "pending" | "done" | "error" }[]>([])

  // Load attachments on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    attachmentsApi.list(projectId)
      .then((res) => { if (!cancelled) setAttachments(res.attachments) })
      .catch((e) => { if (!cancelled) setError(e.message ?? "Failed to load attachments.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId])

  async function handleFiles(files: File[]) {
    const MAX = 10 * 1024 * 1024
    const valid = files.filter((f) => {
      if (f.size > MAX) {
        setError(`"${f.name}" exceeds the 10 MB limit and was skipped.`)
        return false
      }
      return true
    })
    if (valid.length === 0) return

    const entries = valid.map((f) => ({ file: f, progress: "pending" as const }))
    setUploading((prev) => [...prev, ...entries])
    setError(null)

    for (const entry of entries) {
      try {
        const res = await attachmentsApi.upload(projectId, entry.file)
        setAttachments((prev) => [res.attachment, ...prev])
        setUploading((prev) =>
          prev.map((u) => u.file === entry.file ? { ...u, progress: "done" } : u),
        )
      } catch (e: any) {
        setUploading((prev) =>
          prev.map((u) => u.file === entry.file ? { ...u, progress: "error" } : u),
        )
        setError(e.message ?? `Failed to upload "${entry.file.name}".`)
      }
    }

    // Clear done entries after a brief moment
    setTimeout(() => {
      setUploading((prev) => prev.filter((u) => u.progress !== "done"))
    }, 1500)
  }

  function handleDeleted(id: string) {
    setAttachments((prev) => prev.filter((a) => a._id !== id))
  }

  function handleDescriptionSaved(id: string, desc: string) {
    setAttachments((prev) =>
      prev.map((a) => (a._id === id ? { ...a, description: desc } : a)),
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">Other Docs</h2>
          <p className="text-sm text-muted-foreground">
            Attach supplementary files — requirements, specs, and reference materials.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium text-foreground shrink-0">
          <Upload className="h-4 w-4" />
          Upload files
          <input
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              if (files.length > 0) handleFiles(files)
              e.target.value = ""
            }}
          />
        </label>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button className="ml-auto shrink-0 hover:opacity-70" onClick={() => setError(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Upload progress items */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((u, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg border text-sm",
                u.progress === "error"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : u.progress === "done"
                    ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400"
                    : "border-border bg-muted/30 text-muted-foreground",
              )}
            >
              {u.progress === "pending" && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
              {u.progress === "done" && <Check className="h-4 w-4 shrink-0" />}
              {u.progress === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
              <span className="truncate">{u.file.name}</span>
              <span className="ml-auto text-xs shrink-0">{formatBytes(u.file.size)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && attachments.length === 0 && uploading.length === 0 && (
        <DropZone onFiles={handleFiles} />
      )}

      {/* File list */}
      {!loading && attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment._id}
              attachment={attachment}
              projectId={projectId}
              onDeleted={handleDeleted}
              onDescriptionSaved={handleDescriptionSaved}
            />
          ))}

          {/* Drop zone at the bottom when files already exist */}
          <DropZone onFiles={handleFiles} />
        </div>
      )}
    </div>
  )
}
