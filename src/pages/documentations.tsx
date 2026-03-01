import { useState, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { projectsApi, ApiProject } from "@/lib/api"
import { mapApiStatus } from "@/store/projects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    BookOpen,
    FileCode2,
    Database,
    ShieldAlert,
    AlertTriangle,
    Search,
    ExternalLink,
    Github,
    Star,
    FileCode,
    Box,
    Network,
    Layers,
    CheckCircle2,
    Clock,
    RefreshCw,
    ArrowRight,
} from "lucide-react"

// ── Security grade colour ────────────────────────────────────────────────────
function gradeColour(grade?: string) {
    switch (grade) {
        case "A": return "text-green-600 dark:text-green-400"
        case "B": return "text-lime-600 dark:text-lime-400"
        case "C": return "text-yellow-600 dark:text-yellow-400"
        case "D": return "text-orange-600 dark:text-orange-400"
        case "F": return "text-red-600 dark:text-red-400"
        default: return "text-muted-foreground"
    }
}

// ── Which doc sections are present ──────────────────────────────────────────
const DOC_SECTIONS = [
    { key: "readme", label: "README", icon: BookOpen },
    { key: "apiReference", label: "API Ref", icon: FileCode2 },
    { key: "schemaDocs", label: "Schema", icon: Database },
    { key: "internalDocs", label: "Internal", icon: FileCode },
    { key: "securityReport", label: "Security", icon: ShieldAlert },
] as const

// ── Project card ─────────────────────────────────────────────────────────────
function DocProjectCard({ project }: { project: ApiProject }) {
    const name = project.meta?.name || project.repoName
    const description = project.meta?.description
    const language = project.meta?.language
    const stars = project.meta?.stars
    const techStack = project.techStack?.slice(0, 4) ?? []
    const stats = project.stats
    const security = project.security
    const updatedAgo = formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })

    return (
        <Card className="flex flex-col hover:border-primary/40 transition-colors group">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <CardTitle className="text-base font-semibold truncate">
                            {project.repoOwner}/{name}
                        </CardTitle>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
                        )}
                    </div>
                    {security?.grade && (
                        <span className={`shrink-0 text-xl font-bold tabular-nums ${gradeColour(security.grade)}`} title="Security grade">
                            {security.grade}
                        </span>
                    )}
                </div>

                {/* Language + stars */}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {language && (
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-primary/70" />
                            {language}
                        </span>
                    )}
                    {stars !== undefined && (
                        <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {stars.toLocaleString()}
                        </span>
                    )}
                    <span className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {updatedAgo}
                    </span>
                </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 pb-3">
                {/* Stats row */}
                {stats && (
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                            { value: stats.filesAnalysed, icon: FileCode, label: "Files" },
                            { value: stats.endpoints, icon: Network, label: "Endpoints" },
                            { value: stats.models, icon: Database, label: "Models" },
                        ].map(({ value, icon: Icon, label }) => (
                            <div key={label} className="bg-muted/50 rounded-lg p-2">
                                <div className="text-lg font-bold">{value ?? 0}</div>
                                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                    <Icon className="h-2.5 w-2.5" />{label}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Security counts */}
                {security?.counts && Object.values(security.counts).some(Boolean) && (
                    <div className="flex items-center gap-2 text-xs">
                        <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => {
                            const n = security.counts[sev]
                            if (!n) return null
                            const colours: Record<string, string> = {
                                CRITICAL: "bg-red-500/20 text-red-600 dark:text-red-400",
                                HIGH: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
                                MEDIUM: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                                LOW: "bg-blue-500/20 text-blue-500",
                            }
                            return (
                                <span key={sev} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colours[sev]}`}>
                                    {n} {sev[0]}
                                </span>
                            )
                        })}
                    </div>
                )}

                {/* Tech stack */}
                {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {techStack.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                {t}
                            </span>
                        ))}
                        {(project.techStack?.length ?? 0) > 4 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                +{project.techStack!.length - 4}
                            </span>
                        )}
                    </div>
                )}

                {/* Available doc sections */}
                <div className="flex flex-wrap gap-1.5">
                    {DOC_SECTIONS.map(({ key, label, icon: Icon }) => (
                        <span
                            key={key}
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground"
                        >
                            <Icon className="h-2.5 w-2.5" />
                            {label}
                        </span>
                    ))}
                </div>
            </CardContent>

            <CardFooter className="pt-3 border-t border-border flex items-center gap-2">
                <Button asChild size="sm" className="flex-1 gap-1.5">
                    <Link to={`/projects/${project._id}/docs`}>
                        <BookOpen className="h-3.5 w-3.5" />
                        View Docs
                    </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <a href={project.repoUrl} target="_blank" rel="noreferrer">
                        <Github className="h-3.5 w-3.5" />
                    </a>
                </Button>
            </CardFooter>
        </Card>
    )
}

// ── Empty state ─────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-primary/10 p-5 mb-5">
                <BookOpen className="h-12 w-12 text-primary/60" />
            </div>
            <h2 className="text-2xl font-bold">No documentation yet</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">
                Create a project and run the analysis pipeline. Once complete, your docs will appear here.
            </p>
            <Button asChild className="mt-6 gap-2">
                <Link to="/dashboard">
                    <ArrowRight className="h-4 w-4" />
                    Go to Dashboard
                </Link>
            </Button>
        </div>
    )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function DocumentationsPage() {
    const [completedProjects, setCompletedProjects] = useState<ApiProject[]>([])
    const [inProgressProjects, setInProgressProjects] = useState<ApiProject[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")

    const loadProjects = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            // Fetch done projects (docs available) and running/queued separately
            const [doneRes, activeRes] = await Promise.all([
                projectsApi.list({ status: "done", limit: 100, sort: "-updatedAt" }),
                projectsApi.list({ limit: 100, sort: "-updatedAt" }),
            ])
            setCompletedProjects(doneRes.projects as unknown as ApiProject[])
            // Running/queued/error that aren't done
            const nonDone = (activeRes.projects as unknown as ApiProject[]).filter(
                (p) => p.status !== "done"
            )
            setInProgressProjects(nonDone)
        } catch (err: any) {
            setError(err?.message ?? "Failed to load projects.")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadProjects()
    }, [loadProjects])

    // Client-side search filter
    const filteredCompleted = completedProjects.filter((p) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
            p.repoName?.toLowerCase().includes(q) ||
            p.repoOwner?.toLowerCase().includes(q) ||
            p.meta?.language?.toLowerCase().includes(q) ||
            p.techStack?.some((t) => t.toLowerCase().includes(q))
        )
    })

    // ── Aggregate stats ──────────────────────────────────────────
    const totalFiles = completedProjects.reduce((s, p) => s + (p.stats?.filesAnalysed ?? 0), 0)
    const totalEndpoints = completedProjects.reduce((s, p) => s + (p.stats?.endpoints ?? 0), 0)
    const totalModels = completedProjects.reduce((s, p) => s + (p.stats?.models ?? 0), 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
                    <p className="text-muted-foreground">
                        All documented projects across your account.
                        {!isLoading && completedProjects.length > 0 && (
                            <span className="text-xs"> ({completedProjects.length} documented)</span>
                        )}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadProjects} className="gap-2 shrink-0">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Stats bar */}
            {!isLoading && completedProjects.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Documented projects", value: completedProjects.length, icon: BookOpen },
                        { label: "Files analysed", value: totalFiles, icon: FileCode },
                        { label: "API endpoints", value: totalEndpoints, icon: Network },
                        { label: "Data models", value: totalModels, icon: Database },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{value.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">{label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Search */}
            {!isLoading && completedProjects.length > 0 && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, language, or tech..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="border border-border rounded-xl p-5 space-y-3">
                            <Skeleton className="h-5 w-2/3" />
                            <Skeleton className="h-3 w-full" />
                            <div className="grid grid-cols-3 gap-2">
                                <Skeleton className="h-12" />
                                <Skeleton className="h-12" />
                                <Skeleton className="h-12" />
                            </div>
                            <Skeleton className="h-8" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && completedProjects.length === 0 && <EmptyState />}

            {/* Completed projects grid */}
            {!isLoading && filteredCompleted.length > 0 && (
                <section>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredCompleted.map((p) => (
                            <DocProjectCard key={p._id} project={p} />
                        ))}
                    </div>
                    {search && filteredCompleted.length === 0 && (
                        <p className="text-center text-muted-foreground py-12">No projects match "{search}".</p>
                    )}
                </section>
            )}

            {/* In-progress / error projects */}
            {!isLoading && inProgressProjects.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        Other projects
                    </h2>
                    <div className="space-y-2">
                        {inProgressProjects.map((p) => {
                            const uiStatus = mapApiStatus(p.status)
                            return (
                                <div key={p._id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Github className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="font-medium text-sm truncate">
                                            {p.repoOwner}/{p.repoName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                            variant={
                                                uiStatus === "analyzing" ? "warning"
                                                    : uiStatus === "failed" ? "destructive"
                                                        : uiStatus === "archived" ? "secondary"
                                                            : "default"
                                            }
                                            className="text-xs"
                                        >
                                            {p.status}
                                        </Badge>
                                        {uiStatus === "analyzing" && (
                                            <Link to={`/projects/${p._id}/live`} className="text-xs text-primary hover:underline">
                                                View live
                                            </Link>
                                        )}
                                        {(uiStatus === "failed" || uiStatus === "archived") && (
                                            <Link to={`/projects/${p._id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                                                Details <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}
        </div>
    )
}
