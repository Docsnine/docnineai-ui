import { useState, useEffect, useCallback } from "react"
import { githubApi, GitHubStatus, API_BASE } from "@/lib/api"
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

// ── Main page ────────────────────────────────────────────────────────────────
export function SettingsPage() {
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
                <WebhookCard />
            </div>
        </div>
    )
}
