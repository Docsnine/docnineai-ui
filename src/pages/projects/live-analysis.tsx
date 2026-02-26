import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useProjectStore } from "@/store/projects"
import { getAccessToken, API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Terminal,
} from "lucide-react"
import { fetchEventSource } from "@microsoft/fetch-event-source"
import { cn } from "@/lib/utils"

type LogSeverity = "info" | "warning" | "error" | "success"

interface LogEntry {
  id: string
  timestamp: string
  message: string
  severity: LogSeverity
}

/** Map a backend pipeline event to a UI severity level. */
function eventToSeverity(step: string, status?: string): LogSeverity {
  if (step === "done") return "success"
  if (step === "error") return "error"
  if (status === "error") return "error"
  if (status === "warning") return "warning"
  if (step === "security") return "warning"
  return "info"
}

/** Derive a human-readable message from a pipeline event. */
function eventToMessage(event: Record<string, any>): string {
  if (event.step === "done") return "✅ Documentation pipeline completed successfully."
  if (event.step === "error") return `❌ Pipeline error: ${event.msg ?? event.detail ?? "Unknown error"}`
  const parts: string[] = []
  if (event.step) parts.push(`[${event.step}]`)
  if (event.msg) parts.push(event.msg)
  if (event.detail) parts.push(event.detail)
  return parts.join(" — ") || "Processing…"
}

export function LiveAnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getProject, updateLocalProject } = useProjectStore()

  const [projectName, setProjectName] = useState<string>("")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "reconnecting" | "disconnected">("connecting")
  const [pipelineStatus, setPipelineStatus] = useState<"running" | "done" | "error">("running")
  const [loadError, setLoadError] = useState<string | null>(null)

  const logsEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pausedRef = useRef(isPaused)

  // Keep a ref in-sync with state for use inside the SSE callback
  useEffect(() => { pausedRef.current = isPaused }, [isPaused])

  // Auto-scroll when not paused
  useEffect(() => {
    if (!isPaused) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, isPaused])

  // Load project name and start SSE stream
  useEffect(() => {
    if (!id) return

    // Fetch project metadata for the page title
    getProject(id)
      .then((p) => setProjectName(p.name))
      .catch(() => { }) // non-fatal

    // Start the SSE connection
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const token = getAccessToken()

      ; (async () => {
        try {
          await fetchEventSource(`${API_BASE}/projects/${id}/stream`, {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
            signal: ctrl.signal,
            credentials: "include",

            onopen: async (res) => {
              if (res.ok) {
                setConnectionState("connected")
                setLoadError(null)
              } else {
                const body = await res.json().catch(() => ({}))
                throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
              }
            },

            onmessage: (ev) => {
              try {
                const data = JSON.parse(ev.data ?? "{}")

                // Ignore heartbeat pings
                if (data.type === "ping") return

                const severity = eventToSeverity(data.step, data.status)
                const message = eventToMessage(data)

                // Don't add duplicate "done" events
                setLogs((prev) => {
                  if (data.step === "done" && prev.some((l) => l.message.startsWith("✅"))) return prev
                  return [
                    ...prev,
                    {
                      id: `${Date.now()}-${Math.random()}`,
                      timestamp: data.ts ?? new Date().toISOString(),
                      message,
                      severity,
                    },
                  ]
                })

                if (data.step === "done") {
                  setPipelineStatus("done")
                  setConnectionState("disconnected")
                  updateLocalProject(id, { status: "completed", apiStatus: "done" })
                } else if (data.step === "error") {
                  setPipelineStatus("error")
                  setConnectionState("disconnected")
                  updateLocalProject(id, { status: "failed", apiStatus: "error" })
                }
              } catch {
                // Malformed JSON — ignore
              }
            },

            onerror: (err) => {
              if (ctrl.signal.aborted) return // user navigated away
              setConnectionState("reconnecting")
              // fetchEventSource will auto-retry; nothing needed here.
            },

            onclose: () => {
              if (!ctrl.signal.aborted) {
                setConnectionState("disconnected")
              }
            },
          })
        } catch (err: any) {
          if (!ctrl.signal.aborted) {
            setConnectionState("disconnected")
            setLoadError(err?.message ?? "Failed to connect to the stream.")
          }
        }
      })()

    return () => {
      ctrl.abort()
    }
  }, [id, getProject, updateLocalProject])

  const getSeverityIcon = (severity: LogSeverity) => {
    switch (severity) {
      case "info": return <Info className="h-4 w-4 text-blue-500" />
      case "warning": return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />
      case "success": return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
  }

  const getSeverityColor = (severity: LogSeverity) => {
    switch (severity) {
      case "info": return "text-blue-400"
      case "warning": return "text-yellow-400 bg-yellow-400/10"
      case "error": return "text-red-400 bg-red-400/10 border-l-2 border-red-500"
      case "success": return "text-green-400"
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="-ml-2">
            <Link to={`/projects/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight flex items-center gap-2">
              Analysing
              {connectionState === "connected" && (
                <span className="relative flex h-3 w-3 ml-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{projectName || `Project ${id}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connectionState === "reconnecting" && (
            <Badge variant="warning" className="animate-pulse">
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Reconnecting…
            </Badge>
          )}
          {connectionState === "disconnected" && pipelineStatus === "done" && (
            <Button asChild variant="default">
              <Link to={`/projects/${id}/docs`}>View Documentation</Link>
            </Button>
          )}
          {connectionState === "disconnected" && pipelineStatus === "error" && (
            <Button variant="outline" onClick={() => navigate(`/projects/${id}`)}>
              View Project
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused((p) => !p)}
            disabled={connectionState === "disconnected"}
          >
            {isPaused ? (
              <><Play className="mr-2 h-4 w-4" /> Resume</>
            ) : (
              <><Pause className="mr-2 h-4 w-4" /> Pause</>
            )}
          </Button>
        </div>
      </div>

      {/* Stream error */}
      {loadError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive shrink-0">
          {loadError}
        </div>
      )}

      <Card className="flex-1 flex flex-col overflow-hidden border-border  shadow-none">
        <CardHeader className="py-3 px-4 border-b border-border/20 bg-muted/5 shrink-0 flex flex-row items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-mono text-muted-foreground font-normal">
            Working....
          </CardTitle>
          {connectionState !== "disconnected" && (
            <Badge variant="outline" className="ml-auto text-xs">
              {logs.length} events
            </Badge>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Waiting for pipeline events…
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-3 py-1 px-2 rounded-sm transition-colors",
                    getSeverityColor(log.severity)
                  )}
                >
                  <span className="text-muted-foreground/50 shrink-0 w-20">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className="shrink-0 mt-0.5">{getSeverityIcon(log.severity)}</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
