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
    Loader2,
    Search,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
} from "lucide-react"
import { useProjectStore } from "@/store/projects"
import { githubApi, GitHubOrg, GitHubRepo, ApiException } from "@/lib/api"
import { OrgAccountPicker } from "@/components/projects/org-account-picker"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// Organisation selection persistence
// Saves the last-selected org login (or "" for personal account) in
// localStorage so it is pre-selected the next time the modal opens.
// ─────────────────────────────────────────────────────────────────────────────

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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading repositories…
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                </div>
            )}
        </div>
    )
}

interface NewProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function NewProjectModal({ open, onOpenChange }: NewProjectModalProps) {
    const navigate = useNavigate()
    const { createProject } = useProjectStore()

    const [step, setStep] = useState<"source" | "github" | "manual">("source")
    const [isConnecting, setIsConnecting] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)

    // GitHub connection
    const [githubConnected, setGithubConnected] = useState(false)
    const [githubUsername, setGithubUsername] = useState("")

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

    // Check GitHub connection whenever the modal opens
    useEffect(() => {
        if (!open) return
        githubApi.getStatus().then((s) => {
            setGithubConnected(s.connected)
            if (s.githubUsername) setGithubUsername(s.githubUsername)
        }).catch(() => { /* not connected */ })
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
        try {
            const data = await githubApi.getOAuthStartUrl()
            window.location.href = data.url
        } catch (err: any) {
            setApiError(err instanceof ApiException ? err.message : "Failed to start GitHub OAuth.")
            setIsConnecting(false)
        }
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
                            disabled={isConnecting}
                            className="flex items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                {isConnecting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Github className="h-5 w-5" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{githubConnected ? "Select from GitHub" : "Connect GitHub"}</h4>
                                    {githubConnected && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {githubConnected
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
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Import Repository
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
