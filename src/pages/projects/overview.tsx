import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useProjectStore } from "@/store/projects"
import { projectsApi, ApiException } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import {
    ArrowLeft,
    BookOpen,
    Download,
    Share2,
    Github,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Clock,
    PlayCircle,
    RefreshCw,
    Archive,
    Trash2,
    ExternalLink,
    FileCode,
} from "lucide-react"

export function ProjectOverviewPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { getProject, retryProject, archiveProject, deleteProject, updateLocalProject } = useProjectStore()

    const [project, setProject] = useState<ReturnType<typeof useProjectStore.getState>['projects'][0] | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [exportMessage, setExportMessage] = useState<string | null>(null)

    useEffect(() => {
        if (!id) return
        setIsLoading(true)
        setError(null)
        getProject(id)
            .then(setProject)
            .catch((err: any) => setError(err?.message ?? "Failed to load project."))
            .finally(() => setIsLoading(false))
    }, [id, getProject])

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="bg-card p-6 rounded-xl border border-border">
                    <Skeleton className="h-8 w-64 mb-4" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    <Skeleton className="h-48 md:col-span-2" />
                    <Skeleton className="h-48" />
                </div>
            </div>
        )
    }

    if (error || !project) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-2xl font-bold">Project Not Found</h2>
                <p className="text-muted-foreground mt-2">{error ?? "The project does not exist or has been deleted."}</p>
                <Button asChild className="mt-6">
                    <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
            </div>
        )
    }

    const getStatusBadge = () => {
        switch (project.status) {
            case "completed":
                return (
                    <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Analysis Completed
                    </Badge>
                )
            case "analyzing":
                return (
                    <Badge variant="warning" className="flex items-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin" /> Analyzing Codebase…
                    </Badge>
                )
            case "failed":
                return (
                    <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" /> Analysis Failed
                    </Badge>
                )
            case "archived":
                return (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Archive className="h-4 w-4" /> Archived
                    </Badge>
                )
            default:
                return (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Ready
                    </Badge>
                )
        }
    }

    const handleRetry = async () => {
        setActionLoading("retry")
        try {
            const result = await retryProject(project.id)
            navigate(`/projects/${project.id}/live`)
        } catch (err: any) {
            alert(err?.message ?? "Failed to retry pipeline.")
        } finally {
            setActionLoading(null)
        }
    }

    const handleArchive = async () => {
        if (!confirm("Archive this project?")) return
        setActionLoading("archive")
        try {
            await archiveProject(project.id)
            setProject((p) => p ? { ...p, status: "archived" as const, apiStatus: "archived" } : p)
        } catch (err: any) {
            alert(err?.message ?? "Failed to archive project.")
        } finally {
            setActionLoading(null)
        }
    }

    const handleDelete = async () => {
        if (!confirm("Delete this project? This cannot be undone.")) return
        setActionLoading("delete")
        try {
            await deleteProject(project.id)
            navigate("/dashboard")
        } catch (err: any) {
            alert(err?.message ?? "Failed to delete project.")
            setActionLoading(null)
        }
    }

    const handleExportPdf = async () => {
        setActionLoading("pdf")
        setExportMessage(null)
        try {
            const blob = await projectsApi.exportBlob(project.id, "pdf")
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${project.name}-docs.pdf`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err: any) {
            setExportMessage(err?.message ?? "PDF export failed.")
        } finally {
            setActionLoading(null)
        }
    }

    const handleExportYaml = async () => {
        setActionLoading("yaml")
        setExportMessage(null)
        try {
            const blob = await projectsApi.exportBlob(project.id, "yaml")
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${project.name}-workflow.yml`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err: any) {
            setExportMessage(err?.message ?? "YAML export failed.")
        } finally {
            setActionLoading(null)
        }
    }

    const handleExportNotion = async () => {
        setActionLoading("notion")
        setExportMessage(null)
        try {
            const result = await projectsApi.exportNotion(project.id)
            setExportMessage(`✅ Pushed to Notion! View at: ${result.mainPageUrl}`)
        } catch (err: any) {
            setExportMessage(err?.message ?? "Notion export failed.")
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Dashboard
                </Link>
                <span>/</span>
                <span className="text-foreground font-medium">{project.name}</span>
            </div>

            {/* Header card */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                        {getStatusBadge()}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <a
                            href={project.repoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                            <Github className="h-4 w-4" />
                            {project.repoOwner}/{project.name}
                        </a>
                        <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                    {(project.status === "failed") && (
                        <Button onClick={handleRetry} disabled={!!actionLoading} className="w-full md:w-auto">
                            {actionLoading === "retry" ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Retry Analysis
                        </Button>
                    )}
                    {project.status === "analyzing" && (
                        <Button asChild variant="secondary" className="w-full md:w-auto">
                            <Link to={`/projects/${project.id}/live`}>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> View Progress
                            </Link>
                        </Button>
                    )}
                    {project.status === "completed" && (
                        <Button asChild className="w-full md:w-auto">
                            <Link to={`/projects/${project.id}/docs`}>
                                <BookOpen className="mr-2 h-4 w-4" /> View Documentation
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main content */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Project Overview</CardTitle>
                        <CardDescription>Summary of the latest analysis run.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {project.status === "completed" ? (
                            <div className="space-y-4">
                                <p className="text-muted-foreground">
                                    The codebase was successfully analyzed. AI documentation has been generated for all modules.
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                                    {project.readme && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium flex items-center gap-1 text-green-600">
                                                <CheckCircle2 className="h-4 w-4" /> README
                                            </p>
                                            <p className="text-xs text-muted-foreground">Generated</p>
                                        </div>
                                    )}
                                    {project.apiReference && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium flex items-center gap-1 text-green-600">
                                                <CheckCircle2 className="h-4 w-4" /> API Reference
                                            </p>
                                            <p className="text-xs text-muted-foreground">Generated</p>
                                        </div>
                                    )}
                                    {project.schemaDocs && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium flex items-center gap-1 text-green-600">
                                                <CheckCircle2 className="h-4 w-4" /> Schema Docs
                                            </p>
                                            <p className="text-xs text-muted-foreground">Generated</p>
                                        </div>
                                    )}
                                    {project.internalDocs && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium flex items-center gap-1 text-green-600">
                                                <CheckCircle2 className="h-4 w-4" /> Internal Docs
                                            </p>
                                            <p className="text-xs text-muted-foreground">Generated</p>
                                        </div>
                                    )}
                                    {project.securityReport && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium flex items-center gap-1 text-yellow-600">
                                                <AlertTriangle className="h-4 w-4" /> Security Report
                                            </p>
                                            <p className="text-xs text-muted-foreground">Generated</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : project.status === "analyzing" ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    <p>Analysis is currently running. This may take a few minutes.</p>
                                </div>
                                <div className="space-y-2 pt-4">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                    <Skeleton className="h-4 w-[300px]" />
                                </div>
                            </div>
                        ) : project.status === "failed" ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-destructive/30 rounded-lg bg-destructive/5">
                                <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                                <h3 className="font-medium text-destructive">Analysis Failed</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                    The pipeline encountered an error. Click "Retry Analysis" to run it again.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg bg-muted/30">
                                <PlayCircle className="h-10 w-10 text-muted-foreground mb-3" />
                                <h3 className="font-medium">No Analysis Data</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                    Archived project — no new analyses will run.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actions sidebar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Manage exports and project settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {exportMessage && (
                            <div className={`rounded-md p-2 text-xs ${exportMessage.startsWith("✅") ? "bg-green-50 text-green-800 border border-green-200" : "bg-destructive/10 text-destructive"}`}>
                                {exportMessage}
                            </div>
                        )}
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            disabled={project.status !== "completed" || !!actionLoading}
                            onClick={handleExportPdf}
                        >
                            {actionLoading === "pdf" ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            Export to PDF
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            disabled={project.status !== "completed" || !!actionLoading}
                            onClick={handleExportYaml}
                        >
                            {actionLoading === "yaml" ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileCode className="mr-2 h-4 w-4" />
                            )}
                            Export GitHub Actions YAML
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            disabled={project.status !== "completed" || !!actionLoading}
                            onClick={handleExportNotion}
                        >
                            {actionLoading === "notion" ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ExternalLink className="mr-2 h-4 w-4" />
                            )}
                            Push to Notion
                        </Button>
                        <div className="border-t border-border pt-2 space-y-1">
                            {project.status !== "archived" && project.status !== "analyzing" && (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                                    disabled={!!actionLoading}
                                    onClick={handleArchive}
                                >
                                    {actionLoading === "archive" ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Archive className="mr-2 h-4 w-4" />
                                    )}
                                    Archive Project
                                </Button>
                            )}
                            {project.status !== "analyzing" && (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                                    disabled={!!actionLoading}
                                    onClick={handleDelete}
                                >
                                    {actionLoading === "delete" ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    Delete Project
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
