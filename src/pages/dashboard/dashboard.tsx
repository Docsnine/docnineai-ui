import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { useProjectStore, ProjectStatus } from "@/store/projects"
import { useSubscriptionStore } from "@/store/subscription"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { NewProjectModal } from "@/components/projects/new-project"
import { UpgradeModal } from "@/components/billing/UpgradeModal"
import {
    Search,
    Plus,
    Github,
    Link as LinkIcon,
    Clock,
    AlertCircle,
    CheckCircle2,
    MoreVertical,
    Archive,
    Trash2,
    RefreshCw,
    Users2,
    Eye,
    Pencil,
    FolderGitIcon,
    PencilLineIcon,
} from "lucide-react"
import TopBar from "@/components/projects/top-bar"
import Loader1 from "@/components/ui/loader1"

// Debounces value changes by `delay` ms to avoid hammering the API on every keystroke
function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(t)
    }, [value, delay])
    return debounced
}

// Map UI status filter values → API status query values
const STATUS_API_MAP: Record<string, string> = {
    all: "",
    analyzing: "queued,running",
    completed: "done",
    failed: "error",
    archived: "archived",
}

// Map UI sort values → API sort params
const SORT_API_MAP: Record<string, string> = {
    updated: "-updatedAt",
    created: "-createdAt",
    name: "repoName",
}

export function DashboardPage() {
    const { projects, total, totalPages, page, isLoading, error, fetchProjects, deleteProject, archiveProject, retryProject, sharedProjects, sharedLoading, fetchSharedProjects } =
        useProjectStore()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const { subscription, usage } = useSubscriptionStore()
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
    const [openModalToGithubStep, setOpenModalToGithubStep] = useState(false)
    const [githubNotice, setGithubNotice] = useState<{ type: "success" | "error"; message: string } | null>(null)
    const [upgradeOpen, setUpgradeOpen] = useState(false)

    // Returns true if the user has hit their project limit
    const isAtProjectLimit = () => {
        if (!subscription || !usage) return false
        const limit = subscription.limits.projects
        if (limit === null) return false // unlimited
        return usage.projectCount >= limit
    }

    const handleNewProject = () => {
        if (isAtProjectLimit()) {
            setUpgradeOpen(true)
            return
        }
        setIsNewProjectModalOpen(true)
    }

    // Search is driven by the ?q= URL param so the navbar search stays in sync.
    const searchQuery = searchParams.get("q") ?? ""
    const [statusFilter, setStatusFilter] = useState("all")
    const [sortBy, setSortBy] = useState("updated")
    const [currentPage, setCurrentPage] = useState(1)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const debouncedSearch = useDebounce(searchQuery, 400)

    // Handle GitHub OAuth return (?github=connected or ?github=error)
    useEffect(() => {
        const githubStatus = searchParams.get("github")
        if (!githubStatus) return
        const user = searchParams.get("user")
        const msg = searchParams.get("msg")
        setSearchParams({}, { replace: true }) // clean URL
        if (githubStatus === "connected") {
            setGithubNotice({ type: "success", message: `GitHub connected${user ? ` as @${user}` : ""}! Select a repository to continue.` })
            setOpenModalToGithubStep(true)
            setIsNewProjectModalOpen(true)
            setTimeout(() => setGithubNotice(null), 6000)
        } else if (githubStatus === "error") {
            setGithubNotice({ type: "error", message: msg ?? "GitHub connection failed. Please try again." })
            setTimeout(() => setGithubNotice(null), 8000)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch whenever filters change
    const doFetch = useCallback(() => {
        fetchProjects({
            page: currentPage,
            limit: 20,
            status: STATUS_API_MAP[statusFilter] || undefined,
            sort: SORT_API_MAP[sortBy],
            search: debouncedSearch || undefined,
        })
    }, [currentPage, statusFilter, sortBy, debouncedSearch, fetchProjects])

    useEffect(() => {
        doFetch()
        fetchSharedProjects()
    }, [doFetch, fetchSharedProjects])

    // Reset page to 1 whenever filters (not page) change.
    useEffect(() => {
        setCurrentPage(1)
    }, [statusFilter, sortBy, debouncedSearch])

    // Close menu when clicking outside
    useEffect(() => {
        const handle = () => setOpenMenuId(null)
        document.addEventListener("click", handle)
        return () => document.removeEventListener("click", handle)
    }, [])

    const getStatusBadge = (status: ProjectStatus) => {
        switch (status) {
            case "completed":
                return (
                    <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                    </Badge>
                )
            case "analyzing":
                return (
                    <Badge variant="warning" className="flex items-center gap-1">
                        <Loader1 className="h-3 w-3 " /> Analyzing
                    </Badge>
                )
            case "failed":
                return (
                    <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Failed
                    </Badge>
                )
            case "archived":
                return (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Archive className="h-3 w-3" /> Archived
                    </Badge>
                )
            default:
                return (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Idle
                    </Badge>
                )
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("Delete this project? This cannot be undone.")) return
        setActionLoading(id)
        try {
            await deleteProject(id)
        } catch (err: any) {
            alert(err?.message ?? "Failed to delete project.")
        } finally {
            setActionLoading(null)
            setOpenMenuId(null)
        }
    }

    const handleArchive = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setActionLoading(id)
        try {
            await archiveProject(id)
        } catch (err: any) {
            alert(err?.message ?? "Failed to archive project.")
        } finally {
            setActionLoading(null)
            setOpenMenuId(null)
        }
    }

    const handleRetry = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setActionLoading(id)
        try {
            const result = await retryProject(id)
            navigate(`/projects/${result.id}/live`)
        } catch (err: any) {
            alert(err?.message ?? "Failed to retry project.")
        } finally {
            setActionLoading(null)
            setOpenMenuId(null)
        }
    }

    return (
        <div>
            <TopBar title="Projects" description="Manage Your projects and Collaborations.">
                <Button onClick={handleNewProject} className="shrink-0">
                    <Plus className="mr-2 h-4 w-4" /> New Project
                </Button>
            </TopBar>

            <div className="space-y-6">
                {/* GitHub OAuth return banner */}
                {githubNotice && (
                    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${githubNotice.type === "success"
                        ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
                        : "border-destructive/20 bg-destructive/10 text-destructive"
                        }`}>
                        <span className="text-base">{githubNotice.type === "success" ? "✅" : "❌"}</span>
                        <span>{githubNotice.message}</span>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search projects..."
                            className="pl-9 rounded-2xl"
                            value={searchQuery}
                            onChange={(e) => {
                                const val = e.target.value
                                setSearchParams(
                                    (prev) => {
                                        if (val) prev.set("q", val)
                                        else prev.delete("q")
                                        return prev
                                    },
                                    { replace: true },
                                )
                            }}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-[130px] !rounded-2xl"
                        >
                            <option value="all">All Status</option>
                            <option value="analyzing">Analyzing</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="archived">Archived</option>
                        </Select>
                        <Select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-[130px] !rounded-2xl"
                        >
                            <option value="updated">Last Updated</option>
                            <option value="created">Created Date</option>
                            <option value="name">Name</option>
                        </Select>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive flex items-center justify-between">
                        <span>{error}</span>
                        <Button size="sm" variant="outline" onClick={doFetch}>
                            <RefreshCw className="mr-1 h-3 w-3" /> Retry
                        </Button>
                    </div>
                )}

                {/* Loading skeleton */}
                {isLoading && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i} className="flex flex-col shadow-none">
                                <CardHeader className="pb-4">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2 mt-1" />
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <Skeleton className="h-6 w-24" />
                                </CardContent>
                                <CardFooter className="pt-4 border-t border-border/50">
                                    <Skeleton className="h-4 w-full" />
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && projects.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl bg-card/50">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                            <Search className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">No projects found</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mt-1">
                            {debouncedSearch || statusFilter !== "all"
                                ? "No projects match your current filters. Try adjusting your search."
                                : "You haven't created any projects yet."}
                        </p>
                        <Button variant="outline" className="mt-6" onClick={handleNewProject}>
                            <Plus className="mr-2 h-4 w-4" /> Create Project
                        </Button>
                    </div>
                )}

                {/* Project grid */}
                {!isLoading && projects.length > 0 && (
                    <>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {projects.map((project) => (
                                <Card
                                    key={project.id}
                                    className="flex flex-col transition-all shadow-none hover:shadow-md hover:border-primary/20"
                                >
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <CardTitle className="text-lg line-clamp-1" title={project.name}>
                                                    <Link to={`/projects/${project.id}`} className="hover:underline hover:text-primary">
                                                        {project.name}
                                                    </Link>
                                                </CardTitle>
                                                <div className="flex items-center text-sm text-muted-foreground">
                                                    {project.repoUrl && project.repoUrl.includes("github.com") && (
                                                        <Github className="mr-1 h-3 w-3 shrink-0" />
                                                    )}

                                                    {project.repoOwner && project.repoOwner.includes("local") && (
                                                        <FolderGitIcon className="mr-1 h-3 w-3 shrink-0" />
                                                    )}

                                                    {project.repoOwner && project.repoOwner.includes("manual") && (
                                                        <PencilLineIcon className="mr-1 h-3 w-3 shrink-0" />
                                                    )}

                                                    <span className="truncate max-w-[200px]" title={project.repoUrl}>
                                                        {project.repoOwner} / {project.name}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action menu */}
                                            <div className="relative shrink-0 ml-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setOpenMenuId(openMenuId === project.id ? null : project.id)
                                                    }}
                                                    disabled={actionLoading === project.id}
                                                >
                                                    {actionLoading === project.id ? (
                                                        <Loader1 className="h-4 w-4 " />
                                                    ) : (
                                                        <MoreVertical className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                {openMenuId === project.id && (
                                                    <div
                                                        className="absolute right-0 top-8 z-50 w-44 rounded-md border border-border bg-secondary text-sm overflow-hidden"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {project.status === "failed" && (
                                                            <button
                                                                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
                                                                onClick={(e) => handleRetry(project.id, e)}
                                                            >
                                                                <RefreshCw className="h-4 w-4 text-primary" /> Retry Pipeline
                                                            </button>
                                                        )}
                                                        {project.status !== "archived" && project.status !== "analyzing" && (
                                                            <button
                                                                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
                                                                onClick={(e) => handleArchive(project.id, e)}
                                                            >
                                                                <Archive className="h-4 w-4 text-muted-foreground" /> Archive
                                                            </button>
                                                        )}
                                                        {project.status !== "analyzing" && (
                                                            <button
                                                                className="flex w-full items-center gap-2 px-3 py-2 hover:bg-destructive/10 text-destructive transition-colors"
                                                                onClick={(e) => handleDelete(project.id, e)}
                                                            >
                                                                <Trash2 className="h-4 w-4" /> Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <div className="flex items-center justify-between">
                                            {getStatusBadge(project.status)}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-4 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground flex justify-between">
                                        <span>
                                            {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                                        </span>
                                        <Link to={`/projects/${project.id}`} className="font-medium text-primary hover:underline">
                                            View Details
                                        </Link>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}

                <NewProjectModal
                    open={isNewProjectModalOpen}
                    onOpenChange={(v) => {
                        setIsNewProjectModalOpen(v)
                        if (!v) setOpenModalToGithubStep(false)
                    }}
                />
                
                <UpgradeModal
                    open={upgradeOpen}
                    onClose={() => setUpgradeOpen(false)}
                    featureName="More Projects"
                    requiredPlan="starter"
                    description={`You've reached the ${subscription?.limits.projects ?? 3} project limit on the ${subscription?.planName ?? 'Free'} plan. Upgrade to create unlimited projects.`}
                />

                {/* ── Shared with Me ────────────────────────────────── */}
                {(sharedLoading || sharedProjects.length > 0) && (
                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                            <Users2 className="h-5 w-5 text-muted-foreground" />
                            <h2 className="text-xl font-semibold">Shared with Me</h2>
                            <span className="text-sm text-muted-foreground">
                                ({sharedProjects.length})
                            </span>
                        </div>

                        {sharedLoading ? (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Card key={i} className="flex flex-col shadow-none">
                                        <CardHeader className="pb-4">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2 mt-1" />
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <Skeleton className="h-6 w-24" />
                                        </CardContent>
                                        <CardFooter className="pt-4 border-t border-border/50">
                                            <Skeleton className="h-4 w-full" />
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {sharedProjects.map((project) => (
                                    <Card
                                        key={project.id}
                                        className="flex flex-col transition-all shadow-none hover:shadow-md hover:border-primary/20"
                                    >
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <CardTitle className="text-lg line-clamp-1" title={project.name}>
                                                        <Link
                                                            to={`/projects/${project.id}`}
                                                            className="hover:underline hover:text-primary"
                                                        >
                                                            {project.name}
                                                        </Link>
                                                    </CardTitle>
                                                    <div className="flex items-center text-sm text-muted-foreground">
                                                        <Github className="mr-1 h-3 w-3 shrink-0" />
                                                        <span className="truncate max-w-[200px]" title={project.repoUrl}>
                                                            {project.repoOwner}/{project.name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary" className="flex items-center gap-1 text-xs shrink-0">
                                                    {project.shareRole === "editor" ? (
                                                        <><Pencil className="h-3 w-3" /> Editor</>
                                                    ) : (
                                                        <><Eye className="h-3 w-3" /> Viewer</>
                                                    )}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <div className="flex items-center justify-between">
                                                {getStatusBadge(project.status)}
                                            </div>
                                        </CardContent>
                                        <CardFooter className="pt-4 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground flex justify-between">
                                            <span>
                                                {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                                            </span>
                                            <Link
                                                to={`/projects/${project.id}`}
                                                className="font-medium text-primary hover:underline"
                                            >
                                                View Details
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
