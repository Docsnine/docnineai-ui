import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  X,
  Clock,
  Sparkles,
  RefreshCw,
  Pencil,
  GitCommit,
  RotateCcw,
  AlertTriangle,
  Eye,
  CheckCircle2,
} from "lucide-react"
import { versionsApi, type DocVersion } from "@/lib/api"
import { DocRenderer } from "@/components/projects/DocRenderer"
import { cn } from "@/lib/utils"

// ── Date helper (avoid dependency on date-fns format) ────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

// ── Source badge configuration ────────────────────────────────────────────────
const SOURCE_CONFIG: Record<
  DocVersion["source"],
  { label: string; Icon: React.ElementType; badgeClass: string; dotClass: string }
> = {
  ai_full: {
    label: "AI Full Run",
    Icon: Sparkles,
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dotClass: "bg-blue-500",
  },
  ai_incremental: {
    label: "AI Sync",
    Icon: RefreshCw,
    badgeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    dotClass: "bg-violet-500",
  },
  user: {
    label: "Your Edit",
    Icon: Pencil,
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-500",
  },
}

// ── Version content preview modal ─────────────────────────────────────────────
function VersionPreviewModal({
  version,
  onClose,
}: {
  version: DocVersion & { content: string }
  onClose: () => void
}) {
  const cfg = SOURCE_CONFIG[version.source] ?? SOURCE_CONFIG.user
  const { Icon } = cfg

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[82vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Version snapshot</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", cfg.badgeClass)}>
              {cfg.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{timeAgo(version.createdAt)}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* Change summary */}
        {version.meta?.changeSummary && (
          <div className="px-5 py-2 bg-muted/30 border-b border-border text-xs text-muted-foreground">
            {version.meta.changeSummary}
          </div>
        )}
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <DocRenderer content={version.content} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────
interface VersionHistoryPanelProps {
  projectId: string
  section: string      // e.g. "apiReference"
  sectionLabel: string // e.g. "API Reference"
  onClose: () => void
  onRestored: (effectiveOutput: Record<string, string>, editedSections: any[]) => void
}

export function VersionHistoryPanel({
  projectId,
  section,
  sectionLabel,
  onClose,
  onRestored,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<DocVersion[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Per-entry UI state
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [restoredId, setRestoredId] = useState<string | null>(null)
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null)
  const [previewVersion, setPreviewVersion] = useState<(DocVersion & { content: string }) | null>(null)

  // Load versions
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    versionsApi
      .list(projectId, section)
      .then((r) => {
        if (!cancelled) {
          setVersions(r.versions)
          setTotal(r.total)
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load version history.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [projectId, section])

  // Preview a version's full content
  const handlePreview = useCallback(
    async (v: DocVersion) => {
      setLoadingPreviewId(v._id)
      try {
        const r = await versionsApi.get(projectId, section, v._id)
        setPreviewVersion(r.version)
      } catch {
        // ignore — preview is optional
      } finally {
        setLoadingPreviewId(null)
      }
    },
    [projectId, section],
  )

  // Restore a version
  const handleRestore = useCallback(
    async (versionId: string) => {
      setRestoringId(versionId)
      try {
        const r = await versionsApi.restore(projectId, section, versionId)
        onRestored(r.effectiveOutput as any, r.editedSections)
        setRestoredId(versionId)
        // Refresh the list (restore creates a new version entry)
        const fresh = await versionsApi.list(projectId, section)
        setVersions(fresh.versions)
        setTotal(fresh.total)
        setTimeout(() => setRestoredId(null), 2500)
      } catch {
        // ignore
      } finally {
        setRestoringId(null)
        setConfirmingId(null)
      }
    },
    [projectId, section, onRestored],
  )

  return (
    <>
      {previewVersion && (
        <VersionPreviewModal version={previewVersion} onClose={() => setPreviewVersion(null)} />
      )}

      <div className="flex flex-col h-full bg-card border-l border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Version History</span>
            <span className="text-xs text-muted-foreground truncate max-w-[90px]">{sectionLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!loading && total > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {total > 20 ? "20+" : total}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading */}
          {loading && (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-14 text-center px-4">
              <AlertTriangle className="h-8 w-8 text-destructive mb-2 opacity-70" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && versions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center px-4">
              <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No version history yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1.5 leading-relaxed">
                Versions are saved automatically on each pipeline run or manual edit.
              </p>
            </div>
          )}

          {/* Timeline */}
          {!loading && !error && versions.length > 0 && (
            <div className="relative px-4 py-4">
              {/* Vertical connector line */}
              <div className="absolute left-[29px] top-8 bottom-8 w-px bg-border/60" />

              <div className="space-y-0.5">
                {versions.map((v, idx) => {
                  const cfg = SOURCE_CONFIG[v.source] ?? SOURCE_CONFIG.user
                  const { Icon } = cfg
                  const isFirst = idx === 0
                  const isConfirming = confirmingId === v._id
                  const isRestoring = restoringId === v._id
                  const isRestored = restoredId === v._id
                  const isLoadingPreview = loadingPreviewId === v._id

                  return (
                    <div key={v._id} className="relative flex gap-3 pb-2">
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          "relative z-10 mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                          isFirst
                            ? `${cfg.dotClass} border-background`
                            : "bg-muted border-background",
                        )}
                      >
                        <Icon className={cn("h-3 w-3", isFirst ? "text-white" : "text-muted-foreground")} />
                      </div>

                      {/* Card */}
                      <div
                        className={cn(
                          "flex-1 rounded-lg border p-3 mt-1 transition-colors",
                          isFirst
                            ? "border-border bg-muted/30"
                            : "border-border/50 hover:border-border bg-background",
                        )}
                      >
                        {/* Top row — badge + timestamp + actions */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] px-1.5 py-0 font-medium", cfg.badgeClass)}
                              >
                                {cfg.label}
                              </Badge>
                              {isFirst && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
                                >
                                  Current
                                </Badge>
                              )}
                              {isRestored && (
                                <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                                  <CheckCircle2 className="h-3 w-3" /> Restored
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(v.createdAt)}</p>

                            {/* Change summary */}
                            {v.meta?.changeSummary && (
                              <p className="text-xs text-foreground/70 mt-1 line-clamp-2 leading-relaxed">
                                {v.meta.changeSummary}
                              </p>
                            )}

                            {/* Commit SHA */}
                            {v.meta?.commitSha && (
                              <div className="flex items-center gap-1 mt-1">
                                <GitCommit className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[10px] font-mono text-primary">
                                  {v.meta.commitSha.slice(0, 7)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Preview content"
                              disabled={isLoadingPreview}
                              onClick={() => handlePreview(v)}
                            >
                              {isLoadingPreview ? (
                                <span className="h-3 w-3 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                            {!isFirst && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                title="Restore this version"
                                disabled={!!restoringId}
                                onClick={() => setConfirmingId(isConfirming ? null : v._id)}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Restore confirmation */}
                        {isConfirming && (
                          <div className="mt-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5">
                            <p className="text-xs text-amber-700 dark:text-amber-400 mb-2 leading-relaxed">
                              Restore this version? This will replace your current content.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-6 text-xs px-2.5"
                                disabled={isRestoring}
                                onClick={() => handleRestore(v._id)}
                              >
                                {isRestoring && (
                                  <span className="mr-1 h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                )}
                                Restore
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs px-2.5"
                                onClick={() => setConfirmingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
