import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useProjectStore, ProjectStatus, Project } from "@/store/projects"
import { useSubscriptionStore } from "@/store/subscription"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { NewProjectModal } from "@/components/projects/new-project"
import { UpgradeModal } from "@/components/billing/UpgradeModal"
import TopBar from "@/components/projects/top-bar"
import { ErrorBanner, EmptyState } from "@/components/common"
import { useSearchAndFilter, usePagination } from "@/hooks"
import { DashboardFilters, ProjectsGrid, SharedProjects } from "./sections"
import type { GithubNotice } from "./types"

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

// Debounces value changes by `delay` ms to avoid hammering the API on every keystroke
function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(t)
    }, [value, delay])
    return debounced
}

export function DashboardPage() {
    const { projects, total, totalPages, page, isLoading, error, fetchProjects, deleteProject, archiveProject, retryProject, sharedProjects, sharedLoading, fetchSharedProjects } =
        useProjectStore()
    const navigate = useNavigate()
    const { subscription, usage } = useSubscriptionStore()

    // State management
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
    const [openModalToGithubStep, setOpenModalToGithubStep] = useState(false)
    const [githubNotice, setGithubNotice] = useState<GithubNotice | null>(null)
    const [upgradeOpen, setUpgradeOpen] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
    const [sortBy, setSortBy] = useState<"updated" | "created" | "name">("updated")

    // Pagination
    const { currentPage, totalPages: paginationTotalPages, goToPrevious, goToNext, setTotalPages } = usePagination({ initialPage: 1 })

    // Search with URL param sync
    const { query: searchQuery, debouncedQuery: debouncedSearch, setQuery: setSearchQuery } = useSearchAndFilter()

    // Update total pages when they change
    useEffect(() => {
        setTotalPages(totalPages)
    }, [totalPages, setTotalPages])

    // Check if user is at project limit
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

    // Fetch projects whenever filters change
    const doFetch = useCallback(() => {
        fetchProjects({
            page: currentPage,
            limit: 20,
            status: STATUS_API_MAP[statusFilter] || undefined,
            sort: SORT_API_MAP[sortBy],
            search: debouncedSearch || undefined,
        })
    }, [currentPage, statusFilter, sortBy, debouncedSearch, fetchProjects])

    // Fetch on mount and when filters change
    useEffect(() => {
        doFetch()
        fetchSharedProjects()
    }, [doFetch, fetchSharedProjects])

    // Handle GitHub OAuth return
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const githubStatus = params.get("github")
        if (!githubStatus) return

        const user = params.get("user")
        const msg = params.get("msg")
        window.history.replaceState({}, document.title, window.location.pathname)

        if (githubStatus === "connected") {
            setGithubNotice({ type: "success", message: `GitHub connected${user ? ` as @${user}` : ""}! Select a repository to continue.` })
            setOpenModalToGithubStep(true)
            setIsNewProjectModalOpen(true)
            setTimeout(() => setGithubNotice(null), 6000)
        } else if (githubStatus === "error") {
            setGithubNotice({ type: "error", message: msg ?? "GitHub connection failed. Please try again." })
            setTimeout(() => setGithubNotice(null), 8000)
        }
    }, [])

    // Handle project actions
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
                    <div
                        className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${githubNotice.type === "success"
                            ? "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400"
                            : "border-destructive/20 bg-destructive/10 text-destructive"
                            }`}
                    >
                        <span className="text-base">{githubNotice.type === "success" ? "✅" : "❌"}</span>
                        <span>{githubNotice.message}</span>
                    </div>
                )}

                {/* Filters */}
                <DashboardFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                />

                {/* Error handling */}
                {error && <ErrorBanner message={error} onRetry={doFetch} />}

                {/* Empty state */}
                {!isLoading && projects.length === 0 && !error && (
                    <EmptyState
                        title="No projects found"
                        description={
                            debouncedSearch || statusFilter !== "all"
                                ? "No projects match your current filters. Try adjusting your search."
                                : "You haven't created any projects yet."
                        }
                        actionLabel="Create Project"
                        onAction={handleNewProject}
                    />
                )}

                {/* Projects grid */}
                {projects.length > 0 && (
                    <>
                        <ProjectsGrid
                            projects={projects}
                            isLoading={isLoading}
                            onDelete={handleDelete}
                            onArchive={handleArchive}
                            onRetry={handleRetry}
                            actionLoading={actionLoading}
                            debouncedSearch={debouncedSearch}
                            statusFilter={statusFilter}
                        />

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage <= 1}
                                    onClick={goToPrevious}
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
                                    onClick={goToNext}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {/* Modals */}
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
                    description={`You've reached the ${subscription?.limits.projects ?? 3} project limit on the ${subscription?.planName ?? "Free"} plan. Upgrade to create unlimited projects.`}
                />

                {/* Shared projects */}
                <SharedProjects projects={sharedProjects} isLoading={sharedLoading} />
            </div>
        </div>
    )
}
