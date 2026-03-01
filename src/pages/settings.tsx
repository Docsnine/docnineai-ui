import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { githubApi, authApi, GitHubStatus, API_BASE } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Github,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Link as LinkIcon,
    Copy,
    Check,
    ExternalLink,
    Unlink,
    Webhook,
    Settings,
    RefreshCw,
    FileText,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// ── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }
    return (
        <button
            type="button"
            onClick={copy}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted",
                className,
            )}
        >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
        </button>
    )
}

// ── GitHub Integration card ──────────────────────────────────────────────────
function GitHubCard() {
    const [status, setStatus] = useState<GitHubStatus | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<"connect" | "disconnect" | null>(null)
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

    const loadStatus = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await githubApi.getStatus()
            setStatus(data)
        } catch {
            setStatus(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { loadStatus() }, [loadStatus])

    const handleConnect = async () => {
        setActionLoading("connect")
        setFeedback(null)
        try {
            const data = await githubApi.getOAuthStartUrl()
            window.location.href = data.url
        } catch (err: any) {
            setFeedback({ type: "error", message: err?.message ?? "Failed to start GitHub OAuth flow." })
            setActionLoading(null)
        }
    }

    const handleDisconnect = async () => {
        if (!confirm("Disconnect your GitHub account? You will no longer be able to import private repositories.")) return
        setActionLoading("disconnect")
        setFeedback(null)
        try {
            await githubApi.disconnect()
            setStatus({ connected: false })
            setFeedback({ type: "success", message: "GitHub account disconnected." })
        } catch (err: any) {
            setFeedback({ type: "error", message: err?.message ?? "Failed to disconnect GitHub." })
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Github className="h-5 w-5" />
                    GitHub Integration
                </CardTitle>
                <CardDescription>
                    Connect your GitHub account to import repositories and run the documentation pipeline.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {feedback && (
                    <div
                        className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${feedback.type === "success"
                            ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                            }`}
                    >
                        {feedback.type === "success"
                            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                            : <AlertTriangle className="h-4 w-4 shrink-0" />
                        }
                        {feedback.message}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                ) : status?.connected ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            <div>
                                <p className="font-medium text-sm">
                                    Connected as <span className="text-primary">@{status.githubUsername}</span>
                                </p>
                                {status.connectedAt && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Since {format(new Date(status.connectedAt), "d MMM yyyy")}
                                    </p>
                                )}
                            </div>
                            <Badge variant="success" className="ml-auto">Active</Badge>
                        </div>

                        {status.scopes && status.scopes.length > 0 && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-1.5">Granted scopes</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {status.scopes.map((s) => (
                                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={loadStatus}
                                className="gap-2"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Refresh
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDisconnect}
                                disabled={actionLoading === "disconnect"}
                                className="gap-2"
                            >
                                {actionLoading === "disconnect"
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Unlink className="h-3.5 w-3.5" />
                                }
                                Disconnect
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                            <Github className="h-5 w-5 text-muted-foreground shrink-0" />
                            <p className="text-sm text-muted-foreground">No GitHub account connected.</p>
                        </div>
                        <Button
                            onClick={handleConnect}
                            disabled={actionLoading === "connect"}
                            className="gap-2"
                        >
                            {actionLoading === "connect"
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Github className="h-4 w-4" />
                            }
                            Connect GitHub
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ── Webhook Integration card ─────────────────────────────────────────────────
function WebhookCard() {
    // The backend webhook endpoint — same origin as the API
    const backendBase = API_BASE || window.location.origin
    const webhookUrl = `${backendBase}/api/webhook`

    // Static GitHub Actions YAML template (mirrors webhook.service.js generateGitHubActionsWorkflow)
    const yaml = `# .github/workflows/document.yml
# Auto-generated by Docnine — triggers incremental sync on every push to main.

name: Auto-Document

on:
  push:
    branches: [ main, master ]
    paths:
      - '**.js'
      - '**.ts'
      - '**.tsx'
      - '**.jsx'
      - '**.py'
      - '**.go'
      - '**.rs'
      - '**.java'
      - '**.prisma'
      - '**.graphql'
  workflow_dispatch:

jobs:
  document:
    name: Incremental Documentation Sync
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Trigger Docnine sync
        run: |
          curl -s -o /dev/null -w "%{http_code}" \\
            -X POST "${webhookUrl}" \\
            -H "Content-Type: application/json" \\
            -H "X-Hub-Signature-256: sha256=\${{ secrets.DOCNINE_WEBHOOK_SECRET }}" \\
            -d "\${{ toJson(github.event) }}"`.trim()

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook Integration
                </CardTitle>
                <CardDescription>
                    Configure a GitHub webhook or GitHub Actions workflow to trigger incremental documentation
                    syncs automatically on every push.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Endpoint URL */}
                <div className="space-y-2">
                    <p className="text-sm font-medium">Webhook endpoint URL</p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono break-all select-all">
                            {webhookUrl}
                        </code>
                        <CopyButton text={webhookUrl} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Add this URL as a GitHub repository webhook (push events, content-type: application/json).
                        Set the same secret as <code className="text-[10px] bg-muted px-1 py-0.5 rounded">WEBHOOK_SECRET</code> in your backend environment.
                    </p>
                </div>

                {/* GitHub Actions YAML */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">GitHub Actions workflow</p>
                        <CopyButton text={yaml} />
                    </div>
                    <div className="relative rounded-lg border border-border overflow-hidden">
                        <pre className="bg-muted/40 text-xs font-mono p-4 overflow-x-auto max-h-56 overflow-y-auto leading-5">
                            {yaml}
                        </pre>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Copy this into <code className="text-[10px] bg-muted px-1 py-0.5 rounded">.github/workflows/document.yml</code> in your repository.
                        Add <code className="text-[10px] bg-muted px-1 py-0.5 rounded">DOCNINE_WEBHOOK_SECRET</code> as a repository secret.
                    </p>
                </div>

                <a
                    href="https://docs.github.com/en/developers/webhooks-and-events/webhooks/creating-webhooks"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                    GitHub Webhooks documentation
                </a>
            </CardContent>
        </Card>
    )
}

// ── Google Docs card ─────────────────────────────────────────────────────────
interface GoogleDocsStatusData {
    connected: boolean
    email?: string
    name?: string
    connectedAt?: string
}

function GoogleDocsCard({ initialStatus }: { initialStatus?: "connected" | "error" }) {
    const [status, setStatus] = useState<GoogleDocsStatusData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<"connect" | "disconnect" | null>(null)
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
        initialStatus === "connected"
            ? { type: "success", message: "Google Drive connected successfully!" }
            : initialStatus === "error"
                ? { type: "error", message: "Failed to connect Google Drive. Please try again." }
                : null,
    )

    const loadStatus = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await authApi.getGoogleDocsStatus()
            setStatus(data)
        } catch {
            setStatus(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { loadStatus() }, [loadStatus])

    const handleConnect = async () => {
        setActionLoading("connect")
        setFeedback(null)
        try {
            const data = await authApi.getGoogleDocsStartUrl()
            window.location.href = data.url
        } catch (err: any) {
            setFeedback({ type: "error", message: err?.message ?? "Failed to start Google OAuth flow." })
            setActionLoading(null)
        }
    }

    const handleDisconnect = async () => {
        if (!confirm("Disconnect Google Drive? You will no longer be able to export docs to Google Docs.")) return
        setActionLoading("disconnect")
        setFeedback(null)
        try {
            await authApi.disconnectGoogleDocs()
            setStatus({ connected: false })
            setFeedback({ type: "success", message: "Google Drive disconnected." })
        } catch (err: any) {
            setFeedback({ type: "error", message: err?.message ?? "Failed to disconnect Google Drive." })
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {/* Google Docs icon */}
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#4285F4" opacity=".3" />
                        <path d="M14 2v6h6" fill="none" stroke="#4285F4" strokeWidth="1.5" />
                        <path d="M16 13H8M16 17H8M10 9H8" fill="none" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Google Docs Export
                </CardTitle>
                <CardDescription>
                    Connect your Google account to export documentation directly to Google Docs.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {feedback && (
                    <div
                        className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${feedback.type === "success"
                            ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                            }`}
                    >
                        {feedback.type === "success"
                            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                            : <AlertTriangle className="h-4 w-4 shrink-0" />
                        }
                        {feedback.message}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-5 rounded-full" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                ) : status?.connected ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            <div>
                                <p className="font-medium text-sm">
                                    Connected as <span className="text-primary">{status.email ?? status.name}</span>
                                </p>
                                {status.connectedAt && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Since {format(new Date(status.connectedAt), "d MMM yyyy")}
                                    </p>
                                )}
                            </div>
                            <Badge variant="success" className="ml-auto">Active</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={loadStatus} className="gap-2">
                                <RefreshCw className="h-3.5 w-3.5" />
                                Refresh
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDisconnect}
                                disabled={actionLoading === "disconnect"}
                                className="gap-2"
                            >
                                {actionLoading === "disconnect"
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Unlink className="h-3.5 w-3.5" />
                                }
                                Disconnect
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                            <p className="text-sm text-muted-foreground">No Google account connected.</p>
                        </div>
                        <Button onClick={handleConnect} disabled={actionLoading === "connect"} className="gap-2">
                            {actionLoading === "connect"
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : (
                                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                )
                            }
                            Connect Google Drive
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function SettingsPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const googleDocsStatus = searchParams.get("googleDocs") as "connected" | "error" | null

    useEffect(() => {
        if (googleDocsStatus) {
            setSearchParams({}, { replace: true })
        }
    }, [googleDocsStatus, setSearchParams])

    return (
        <div className="flex items-center justify-center py-7">
            <div className="max-w-2xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Settings className="h-7 w-7" />
                        Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure integrations and automation for your Docnine account.
                    </p>
                </div>

                <GitHubCard />
                <GoogleDocsCard initialStatus={googleDocsStatus ?? undefined} />
                <WebhookCard />
            </div>
        </div>
    )
}
