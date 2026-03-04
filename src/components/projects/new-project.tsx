import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Github,
    Link as LinkIcon,
    Search,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
} from "lucide-react"
import { useProjectStore } from "@/store/projects"
import { githubApi, GitHubOrg, GitHubRepo, ApiException } from "@/lib/api"
import { OrgAccountPicker } from "@/components/projects/org-account-picker"
import { cn } from "@/lib/utils"
import Loader1 from "../ui/loader1"

const SELECTED_ORG_KEY = "docnine:selected-org"

function readSavedOrg(): string | null {
    try { return localStorage.getItem(SELECTED_ORG_KEY) || null } catch { return null }
}

function saveOrg(org: string | null) {
    try { localStorage.setItem(SELECTED_ORG_KEY, org ?? "") } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Form schema
// ─────────────────────────────────────────────────────────────────────────────

const manualProjectSchema = z.object({
    repoUrl: z
        .string()
        .min(1, "Repository URL is required")
        .refine(
            (v) => v.includes("github.com") || /^[\w.-]+\/[\w.-]+$/.test(v),
            "Must be a GitHub URL or owner/repo shorthand",
        ),
})

type ManualProjectFormValues = z.infer<typeof manualProjectSchema>

// ─────────────────────────────────────────────────────────────────────────────
// RepoList — focused sub-component so the modal stays under ~150 lines
// ─────────────────────────────────────────────────────────────────────────────

interface RepoListProps {
    repos: GitHubRepo[]
    loading: boolean
    hasNextPage: boolean
    selectedRepo: GitHubRepo | null
    onSelect: (repo: GitHubRepo) => void
    onLoadMore: () => void
}

function RepoList({ repos, loading, hasNextPage, selectedRepo, onSelect, onLoadMore }: RepoListProps) {
    if (loading && repos.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                <Loader1 className="mr-2 h-4 w-4" /> Loading repositories…
            </div>
        )
    }
    if (repos.length === 0) {
        return <div className="p-4 text-center text-sm text-muted-foreground">No repositories found.</div>
    }
    return (
        <div className="divide-y divide-border">
            {repos.map((repo) => (
                <button
                    key={repo.id}
                    onClick={() => onSelect(repo)}
                    className={cn(
                        "flex w-full items-center justify-between p-3 text-left text-sm transition-colors hover:bg-muted",
                        selectedRepo?.id === repo.id && "bg-primary/5",
                    )}
                >
                    <div className="min-w-0">
                        <span className="font-medium">{repo.full_name}</span>
                        {repo.description && (
                            <p className="mt-0.5 truncate max-w-87.5 text-xs text-muted-foreground">
                                {repo.description}
                            </p>
                        )}
                    </div>
                    {selectedRepo?.id === repo.id && (
                        <CheckCircle2 className="ml-2 h-4 w-4 shrink-0 text-primary" />
                    )}
                </button>
            ))}
            {hasNextPage && !loading && (
                <button
                    className="flex w-full items-center justify-center gap-2 p-3 text-sm text-primary hover:bg-muted transition-colors"
                    onClick={onLoadMore}
                >
                    <RefreshCw className="h-3.5 w-3.5" /> Load more
                </button>
            )}
            {loading && repos.length > 0 && (
                <div className="flex items-center justify-center p-3 text-sm text-muted-foreground">
                    <Loader1 className="mr-2 h-4 w-4" /> Loading…
                </div>
            )}
        </div>
    )
}

interface NewProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    openToGithubStep?: boolean
}

export function NewProjectModal({ open, onOpenChange, openToGithubStep }: NewProjectModalProps) {
    const navigate = useNavigate()
    const { createProject } = useProjectStore()

    const [step, setStep] = useState<"source" | "github" | "manual">("source")
    const [isConnecting, setIsConnecting] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)

    // GitHub connection
    const [githubConnected, setGithubConnected] = useState(false)
    const [githubUsername, setGithubUsername] = useState("")
    // True while the initial status check is in-flight — disables the GitHub
    // button so the user can't start OAuth before we know they're already connected.
    const [githubStatusLoading, setGithubStatusLoading] = useState(false)

    // Org/account selection — persisted in localStorage across opens
    const [orgs, setOrgs] = useState<GitHubOrg[]>([])
    const [orgsLoading, setOrgsLoading] = useState(false)
    const [selectedOrg, setSelectedOrg] = useState<string | null>(readSavedOrg)

    // Repo list
    const [repos, setRepos] = useState<GitHubRepo[]>([])
    const [reposLoading, setReposLoading] = useState(false)
    const [reposPage, setReposPage] = useState(1)
    const [reposHasNext, setReposHasNext] = useState(false)
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const form = useForm<ManualProjectFormValues>({ resolver: zodResolver(manualProjectSchema) })

    // Check GitHub connection every time the modal opens.
    // If already connected, jump straight to the repo picker so the user
    // never has to click through a redundant "Connect GitHub" step.
    useEffect(() => {
        if (!open) return
        setGithubStatusLoading(true)
        githubApi.getStatus().then((s) => {
            setGithubConnected(s.connected)
            if (s.githubUsername) setGithubUsername(s.githubUsername)
            // Always auto-advance when connected — not just after an OAuth callback.
            if (s.connected) setStep("github")
        }).catch(() => {
            setGithubConnected(false)
        }).finally(() => {
            setGithubStatusLoading(false)
        })
    }, [open])

    // Load orgs + first page of repos when entering the github step
    useEffect(() => {
        if (step !== "github" || !githubConnected) return
        loadOrgs()
        loadRepos(1, selectedOrg)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, githubConnected])

    // ── Loaders ──────────────────────────────────────────────

    const loadOrgs = async () => {
        setOrgsLoading(true)
        try {
            const data = await githubApi.getOrgs()
            setOrgs(data.orgs)
        } catch {
            setOrgs([])
        } finally {
            setOrgsLoading(false)
        }
    }

    const loadRepos = async (page: number, org: string | null) => {
        setReposLoading(true)
        setApiError(null)
        try {
            const data = await githubApi.getRepos({ page, perPage: 30, sort: "updated", org: org ?? undefined })
            // Normalise camelCase backend fields → snake_case shape the component expects
            const mapped = data.repos.map((r: any) => ({
                ...r,
                full_name: r.fullName ?? r.full_name,
                html_url: r.url ?? r.html_url,
            }))
            setRepos((prev) => (page === 1 ? mapped : [...prev, ...mapped]))
            setReposPage(page)
            setReposHasNext(data.hasNextPage)
        } catch {
            setApiError("Failed to load repositories.")
        } finally {
            setReposLoading(false)
        }
    }

    // ── Org change — clears repo state and reloads for new scope ─

    const handleOrgChange = (org: string | null) => {
        setSelectedOrg(org)
        saveOrg(org)
        setRepos([])
        setSelectedRepo(null)
        setSearchQuery("")
        setReposPage(1)
        loadRepos(1, org)
    }

    // ── Modal lifecycle ───────────────────────────────────────

    const handleClose = () => {
        onOpenChange(false)
        // Defer reset so the exit animation isn't interrupted.
        // selectedOrg is intentionally NOT reset — it persists across opens.
        setTimeout(() => {
            setStep("source")
            form.reset()
            setSearchQuery("")
            setSelectedRepo(null)
            setRepos([])
            setReposPage(1)
            setApiError(null)
        }, 200)
    }

    // ── Submit handlers ───────────────────────────────────────

    const handleConnectGithub = async () => {
        if (githubConnected) { setStep("github"); return }
        setIsConnecting(true)
        setApiError(null)

        // CRITICAL: open the popup IMMEDIATELY — before any await.
        // Browsers only allow window.open() inside a synchronous user-gesture.
        // On Vercel the API round-trip adds enough latency to expire the gesture,
        // silently blocking the popup and forcing main-tab navigation instead.
        const width = 620, height = 720
        const left = Math.round(window.screenX + (window.outerWidth - width) / 2)
        const top  = Math.round(window.screenY + (window.outerHeight - height) / 2)
        // Unique name prevents reusing a stale cross-origin popup (SecurityError).
        const popupName = `github-oauth-${Date.now()}`
        const popup = window.open(
            "",          // blank — navigated below once we have the URL
            popupName,
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
        )

        let data: { url: string } | null = null
        try {
            data = await githubApi.getOAuthStartUrl()
        } catch (err: any) {
            if (popup && !popup.closed) popup.close()
            setApiError(err instanceof ApiException ? err.message : "Failed to start GitHub OAuth.")
            setIsConnecting(false)
            return
        }

        // Clear any stale result from a previous OAuth attempt.
        localStorage.removeItem("__docnine_github_oauth_result")

        if (!popup || popup.closed) {
            // Popup was blocked — fall back to full-page navigation.
            window.location.href = data.url
            return
        }

        // Navigate the already-open popup to the GitHub OAuth URL.
        try {
            popup.location.href = data.url
        } catch {
            // SecurityError: popup navigated cross-origin before we could set location.
            popup.close()
            window.location.href = data.url
            return
        }

        let settled = false

        const cleanup = (poll: ReturnType<typeof setInterval>) => {
            clearInterval(poll)
            clearTimeout(maxWaitTimer)
            window.removeEventListener("message", onMessage)
            localStorage.removeItem("__docnine_github_oauth_result")
        }

        const applyConnected = (s: { connected: boolean; githubUsername?: string }) => {
            if (s.connected) {
                setGithubConnected(true)
                if (s.githubUsername) setGithubUsername(s.githubUsername)
                setStep("github")
            } else {
                setApiError("GitHub connected but status could not be confirmed. Please try again.")
            }
        }

        const finish = (status: string, user?: string | null, msg?: string | null) => {
            if (settled) return
            settled = true
            cleanup(poll)
            setIsConnecting(false)

            if (status === "connected") {
                githubApi.getStatus().then(applyConnected).catch(() => setApiError("Failed to verify GitHub connection."))
            } else if (status === "error") {
                setApiError(msg ?? "GitHub connection failed. Please try again.")
            }
            // "cancelled" or unknown → just stop the loading spinner
        }

        // Fast path: postMessage when opener is still reachable.
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data?.type !== "github-oauth-complete") return
            finish(event.data.status, event.data.user, event.data.msg)
        }
        window.addEventListener("message", onMessage)

        // Safety net: give up after 5 minutes.
        const maxWaitTimer = setTimeout(() => {
            if (!settled) finish("cancelled")
        }, 5 * 60 * 1000)

        // Primary reliable path: poll localStorage.
        const poll = setInterval(() => {
            const raw = localStorage.getItem("__docnine_github_oauth_result")
            if (raw) {
                try {
                    const { status, user, msg } = JSON.parse(raw)
                    finish(status, user, msg)
                    return
                } catch { /* malformed — ignore */ }
            }

            if (!popup.closed) return

            // Popup closed without a localStorage result — ask the server directly.
            if (settled) return
            settled = true
            cleanup(poll)
            setIsConnecting(false)
            githubApi.getStatus().then((s) => {
                if (s.connected) applyConnected(s)
            }).catch(() => { /* silently stop */ })
        }, 300)
    }

    const onSubmitManual = async (values: ManualProjectFormValues) => {
        setApiError(null)
        try {
            const result = await createProject(values.repoUrl)
            handleClose()
            navigate(`/projects/${result.id}/live`)
        } catch (err: any) {
            setApiError(err instanceof ApiException
                ? (err.code === "DUPLICATE_PROJECT" ? "A pipeline is already running for this repository." : err.message)
                : "Failed to create project. Is the server running?")
        }
    }

    const onSubmitGithub = async () => {
        if (!selectedRepo) return
        setIsConnecting(true)
        setApiError(null)
        try {
            const result = await createProject(selectedRepo.html_url)
            handleClose()
            navigate(`/projects/${result.id}/live`)
        } catch (err: any) {
            setApiError(err instanceof ApiException
                ? (err.code === "DUPLICATE_PROJECT" ? "A pipeline is already running for this repository." : err.message)
                : "Failed to create project.")
        } finally {
            setIsConnecting(false)
        }
    }

    // ── Derived state ─────────────────────────────────────────

    const filteredRepos = repos.filter((r) =>
        r.full_name?.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const githubStepDescription = selectedOrg
        ? `Repositories in @${selectedOrg}`
        : githubUsername
            ? `Repositories from @${githubUsername}`
            : "Select a repository from your GitHub account."

    // ── Render ────────────────────────────────────────────────

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-125">
                <DialogHeader>
                    <DialogTitle>
                        {step === "source" && "Create New Project"}
                        {step === "github" && "Select Repository"}
                        {step === "manual" && "Enter Repository URL"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "source" && "Choose how you want to import your codebase."}
                        {step === "github" && githubStepDescription}
                        {step === "manual" && "Enter a GitHub repository URL or owner/repo shorthand."}
                    </DialogDescription>
                </DialogHeader>

                {apiError && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {apiError}
                    </div>
                )}

                {step === "source" && (
                    <div className="grid gap-4 py-4">
                        <button
                            onClick={handleConnectGithub}
                            disabled={isConnecting || githubStatusLoading}
                            className="flex items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                {(isConnecting || githubStatusLoading) ? <Loader1 className="h-5 w-5" /> : <Github className="h-5 w-5" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{githubConnected ? "Select from GitHub" : "Connect GitHub"}</h4>
                                    {githubConnected && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {githubStatusLoading
                                        ? "Checking connection…"
                                        : githubConnected
                                            ? `Connected as @${githubUsername}. Browse your repositories.`
                                            : "Import repositories directly from your account."}
                                </p>
                            </div>
                        </button>
                        <button
                            onClick={() => setStep("manual")}
                            className="flex items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <LinkIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-medium">Manual Entry</h4>
                                <p className="text-sm text-muted-foreground">Provide a public GitHub repository URL.</p>
                            </div>
                        </button>
                    </div>
                )}

                {step === "manual" && (
                    <form onSubmit={form.handleSubmit(onSubmitManual)}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="repoUrl">GitHub Repository URL</Label>
                                <Input id="repoUrl" placeholder="https://github.com/owner/repo" {...form.register("repoUrl")} />
                                {form.formState.errors.repoUrl && (
                                    <p className="text-sm text-destructive">{form.formState.errors.repoUrl.message}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    e.g. <code>https://github.com/vercel/next.js</code> or <code>vercel/next.js</code>
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setStep("source")}>Back</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader1 className="mr-2 h-4 w-4" />}
                                Create Project
                            </Button>
                        </DialogFooter>
                    </form>
                )}

                {step === "github" && (
                    <div className="grid gap-4 py-4">
                        {/* Account / org switcher */}
                        <OrgAccountPicker
                            username={githubUsername}
                            orgs={orgs}
                            orgsLoading={orgsLoading}
                            selected={selectedOrg}
                            onSelect={handleOrgChange}
                        />

                        {/* Repo search */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search repositories…"
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Repo list */}
                        <div className="max-h-62.5 overflow-y-auto rounded-md border border-border">
                            <RepoList
                                repos={filteredRepos}
                                loading={reposLoading}
                                hasNextPage={reposHasNext}
                                selectedRepo={selectedRepo}
                                onSelect={setSelectedRepo}
                                onLoadMore={() => loadRepos(reposPage + 1, selectedOrg)}
                            />
                        </div>

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setStep("source")}>Back</Button>
                            <Button onClick={onSubmitGithub} disabled={!selectedRepo || isConnecting}>
                                {isConnecting && <Loader1 className="mr-2 h-4 w-4" />}
                                Import Repository
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
