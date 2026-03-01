import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { formatDistanceToNow, format } from "date-fns"
import { projectsApi, ApiProject, PipelineEvent } from "@/lib/api"
import { mapApiStatus } from "@/store/projects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Archive,
  ChevronDown,
  ChevronRight,
  Info,
  RefreshCw,
  Terminal,
  Github,
  PlayCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Event severity helpers ───────────────────────────────────────────────────
type Severity = "info" | "success" | "warning" | "error"

function eventSeverity(ev: PipelineEvent): Severity {
  if (ev.step === "done")           return "success"
  if (ev.step === "error")          return "error"
  if (ev.status === "error")        return "error"
  if (ev.status === "warning")      return "warning"
  if (ev.step === "security")       return "warning"
  return "info"
}

function eventMessage(ev: PipelineEvent): string {
  if (ev.step === "done") return "Pipeline completed successfully."
  if (ev.step === "error") return `Pipeline error: ${ev.msg ?? ev.detail ?? "Unknown error"}`
  const parts: string[] = []
  if (ev.step)   parts.push(`[${ev.step}]`)
  if (ev.msg)    parts.push(ev.msg)
  if (ev.detail) parts.push(ev.detail)
  return parts.join(" — ") || "Processing…"
}

const SEV_ICON: Record<Severity, React.ReactNode> = {
  info:    <Info      className="h-3.5 w-3.5 text-blue-500   shrink-0" />,
  success: <CheckCircle2   className="h-3.5 w-3.5 text-green-500  shrink-0" />,
  warning: <AlertCircle  className="h-3.5 w-3.5 text-yellow-500 shrink-0" />,
  error:   <AlertCircle  className="h-3.5 w-3.5 text-red-500   shrink-0" />,
}

const SEV_ROW: Record<Severity, string> = {
  info:    "",
  success: "bg-green-500/5",
  warning: "bg-yellow-500/5",
  error:   "bg-red-500/5 border-l-2 border-red-500/40",
}

// ── Per-project expandable events list ──────────────────────────────────────
function ProjectEventLog({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<PipelineEvent[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    projectsApi.getEvents(projectId)
      .then((data) => setEvents(data.events))
      .catch((err: any) => setError(err?.message ?? "Failed to load events."))
      .finally(() => setIsLoading(false))
  }, [projectId])

  if (isLoading) {
    return (
      <div className="px-4 py-3 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-sm text-destructive flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="px-4 py-4 text-sm text-muted-foreground text-center">
        No pipeline events recorded for this project.
      </div>
    )
  }

  return (
    <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
      {events.map((ev, i) => {
        const sev = eventSeverity(ev)
        const ts  = ev.ts ? new Date(ev.ts) : null
        return (
          <div key={i} className={cn("flex items-start gap-2.5 px-4 py-2 text-xs font-mono", SEV_ROW[sev])}>
            <span className="mt-0.5">{SEV_ICON[sev]}</span>
            <span className="flex-1 text-foreground/80 leading-5">{eventMessage(ev)}</span>
            {ts && (
              <span className="text-muted-foreground/60 shrink-0 whitespace-nowrap">
                {format(ts, "HH:mm:ss")}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Project activity row ─────────────────────────────────────────────────────
function ProjectActivityRow({ project }: { project: ApiProject }) {
  const [expanded, setExpanded] = useState(false)
  const uiStatus = mapApiStatus(project.status)

  const statusConfig = {
    completed: { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, badge: "success" as const,     label: "Completed" },
    analyzing: { icon: <Loader2      className="h-4 w-4 text-yellow-500 animate-spin" />, badge: "warning" as const,     label: "Analyzing" },
    failed:    { icon: <AlertCircle  className="h-4 w-4 text-red-500"   />, badge: "destructive" as const, label: "Failed"    },
    archived:  { icon: <Archive      className="h-4 w-4 text-muted-foreground" />,      badge: "secondary" as const,   label: "Archived"  },
  }

  const cfg = statusConfig[uiStatus] ?? { icon: <Clock className="h-4 w-4" />, badge: "secondary" as const, label: project.status }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Row header */}
      <button
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="shrink-0">{cfg.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">
              {project.repoOwner}/{project.repoName}
            </span>
            <Badge variant={cfg.badge} className="text-[10px] py-0">{cfg.label}</Badge>
          </div>
          {project.status === "error" && (project as any).errorMessage && (
            <p className="text-xs text-destructive mt-0.5 truncate">{(project as any).errorMessage}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
          <span className="hidden sm:block">
            {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
          </span>

          {/* Quick action links */}
          {uiStatus === "analyzing" && (
            <Link
              to={`/projects/${project._id}/live`}
              className="text-primary hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <PlayCircle className="h-3.5 w-3.5" /> Live
            </Link>
          )}
          {uiStatus === "completed" && (
            <Link
              to={`/projects/${project._id}/docs`}
              className="text-primary hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowRight className="h-3.5 w-3.5" /> Docs
            </Link>
          )}

          {expanded
            ? <ChevronDown  className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Expanded event log */}
      {expanded && (
        <div className="border-t border-border/60 bg-muted/20">
          <ProjectEventLog projectId={project._id} />
        </div>
      )}
    </div>
  )
}

// ── Status filter buttons ────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: "",         label: "All"       },
  { key: "running",  label: "Running"   },
  { key: "done",     label: "Completed" },
  { key: "error",    label: "Failed"    },
  { key: "archived", label: "Archived"  },
] as const

// ── Main page ────────────────────────────────────────────────────────────────
export function LogsPage() {
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [total, setTotal]       = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, any> = { limit: 100, sort: "-updatedAt" }
      if (statusFilter) params.status = statusFilter
      const data = await projectsApi.list(params)
      setProjects(data.projects as unknown as ApiProject[])
      setTotal(data.total)
    } catch (err: any) {
      setError(err?.message ?? "Failed to load activity log.")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const runningCount  = projects.filter((p) => p.status === "running" || p.status === "queued").length
  const failedCount   = projects.filter((p) => p.status === "error").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Activity Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Pipeline execution history and event traces for all projects.
            {!isLoading && (
              <span className="text-xs ml-2">({total} total)</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 shrink-0">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
              statusFilter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-border rounded-xl p-4 flex items-center gap-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="rounded-full bg-muted p-5 mb-5">
            <Terminal className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">No activity yet</h2>
          <p className="text-muted-foreground mt-2">
            {statusFilter
              ? `No projects with status "${statusFilter}".`
              : "Create a project to see pipeline events here."
            }
          </p>
          {!statusFilter && (
            <Button asChild className="mt-5 gap-2">
              <Link to="/dashboard">
                <Github className="h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Project rows */}
      {!isLoading && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((p) => (
            <ProjectActivityRow key={p._id} project={p} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pb-2">
        Events are stored up to the last 200 per project.
      </p>
    </div>
  )
}
