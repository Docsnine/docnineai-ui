import { useState, useEffect, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { useProjectStore } from "@/store/projects"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Play, Pause, AlertCircle, CheckCircle2, Info, Loader2, RefreshCw, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"

type LogSeverity = "info" | "warning" | "error" | "success"

interface LogEntry {
  id: string
  timestamp: string
  message: string
  severity: LogSeverity
}

export function LiveAnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const project = useProjectStore(state => state.projects.find(p => p.id === id))
  const updateProjectStatus = useProjectStore(state => state.updateProjectStatus)
  
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "reconnecting" | "disconnected">("connecting")
  const logsEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (!isPaused) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, isPaused])

  useEffect(() => {
    if (!project) return

    // In a real app, this would be:
    // const eventSource = new EventSource(`/api/projects/${id}/analysis/stream`)
    
    // Simulating SSE for the design prototype
    let eventIndex = 0
    const mockEvents: Omit<LogEntry, 'id' | 'timestamp'>[] = [
      { message: "Initializing analysis engine...", severity: "info" },
      { message: "Cloning repository...", severity: "info" },
      { message: "Repository cloned successfully.", severity: "success" },
      { message: "Scanning for dependencies...", severity: "info" },
      { message: "Found package.json. Analyzing Node.js project.", severity: "info" },
      { message: "Warning: Outdated dependency 'lodash' found.", severity: "warning" },
      { message: "Parsing source files...", severity: "info" },
      { message: "Analyzing authentication flow...", severity: "info" },
      { message: "Error parsing file src/legacy/auth.js: Unexpected token", severity: "error" },
      { message: "Generating API documentation...", severity: "info" },
      { message: "Extracting React components...", severity: "info" },
      { message: "Building dependency graph...", severity: "info" },
      { message: "Running security scan...", severity: "info" },
      { message: "Critical: Hardcoded secret found in config.ts", severity: "error" },
      { message: "Finalizing documentation...", severity: "info" },
      { message: "Analysis complete.", severity: "success" },
    ]

    setConnectionState("connected")
    updateProjectStatus(id!, "analyzing")

    const interval = setInterval(() => {
      if (isPaused) return

      if (eventIndex < mockEvents.length) {
        const event = mockEvents[eventIndex]
        setLogs(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          ...event
        }])
        eventIndex++
      } else {
        clearInterval(interval)
        setConnectionState("disconnected")
        updateProjectStatus(id!, "completed")
      }
    }, 1500) // Emit event every 1.5s

    return () => clearInterval(interval)
  }, [id, project, isPaused, updateProjectStatus])

  if (!project) {
    return <div>Project not found</div>
  }

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
            <Link to={`/projects/${project.id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Live Analysis
              {connectionState === "connected" && <span className="relative flex h-3 w-3 ml-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>}
            </h1>
            <p className="text-sm text-muted-foreground">{project.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connectionState === "reconnecting" && (
            <Badge variant="warning" className="animate-pulse">
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Reconnecting...
            </Badge>
          )}
          {connectionState === "disconnected" && project.status === "completed" && (
            <Button asChild variant="default">
              <Link to={`/projects/${project.id}/docs`}>View Documentation</Link>
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPaused(!isPaused)}
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

      <Card className="flex-1 flex flex-col overflow-hidden border-border bg-[#0d1117]">
        <CardHeader className="py-3 px-4 border-b border-border/20 bg-muted/5 shrink-0 flex flex-row items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-mono text-muted-foreground font-normal">analysis-stream.log</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Waiting for logs...
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
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
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
