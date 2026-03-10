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
    Upload,
    Plus,
} from "lucide-react"
import { useProjectStore } from "@/store/projects"
import {
    githubApi,
    gitlabApi,
    bitbucketApi,
    azureApi,
    projectsApi,
    GitHubOrg,
    ApiException,
} from "@/lib/api"
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

const manualProjectSchema = z.object({
    repoUrl: z
        .string()
        .min(1, "Repository URL is required")
        .refine(
            (v) =>
                v.includes("github.com") ||
                v.includes("gitlab.com") ||
                v.includes("bitbucket.org") ||
                v.includes("dev.azure.com") ||
                /^[\w.-]+\/[\w.-]+$/.test(v),
            "Must be a valid repository URL or owner/repo shorthand",
        ),
})

const fromScratchSchema = z.object({
    projectName: z.string().min(1, "Project name is required").min(3, "Project name must be at least 3 characters"),
})

type ManualProjectFormValues = z.infer<typeof manualProjectSchema>
type FromScratchFormValues = z.infer<typeof fromScratchSchema>
type Step = "source" | "github" | "gitlab" | "bitbucket" | "azure" | "manual" | "zip" | "from-scratch"
type ProviderKey = "github" | "gitlab" | "bitbucket" | "azure"

interface RepoListProps {
    repos: any[]
    loading: boolean
    hasNextPage: boolean
    selectedRepo: any | null
    onSelect: (repo: any) => void
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
            {repos.map((repo) => {
                const displayName = repo.full_name || repo.path_with_namespace || repo.full_slug || repo.name
                const isSelected =
                    selectedRepo?.id === repo.id ||
                    selectedRepo?.uuid === repo.uuid ||
                    selectedRepo?.path_with_namespace === repo.path_with_namespace

                return (
                    <button
                        key={repo.id || repo.uuid}
                        onClick={() => onSelect(repo)}
                        className={cn(
                            "flex w-full items-center justify-between p-3 text-left text-sm transition-colors hover:bg-muted",
                            isSelected && "bg-primary/5",
                        )}
                    >
                        <div className="min-w-0">
                            <span className="font-medium">{displayName}</span>
                            {repo.description && (
                                <p className="mt-0.5 truncate max-w-87.5 text-xs text-muted-foreground">
                                    {repo.description}
                                </p>
                            )}
                        </div>
                        {isSelected && <CheckCircle2 className="ml-2 h-4 w-4 shrink-0 text-primary" />}
                    </button>
                )
            })}
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
}

const PROVIDER_CONFIG: Record<
    ProviderKey,
    { label: string; description: string; emoji: string }
> = {
    github: { label: "GitHub", description: "Connect repo", emoji: "🐙" },
    gitlab: { label: "GitLab", description: "Connect repo", emoji: "🦊" },
    bitbucket: { label: "Bitbucket", description: "Connect repo", emoji: "🪣" },
    azure: { label: "Azure DevOps", description: "Connect repo", emoji: "☁️" },
}

export function NewProjectModal({ open, onOpenChange }: NewProjectModalProps) {
    const navigate = useNavigate()
    const { createProject } = useProjectStore()

    const [step, setStep] = useState<Step>("source")
    const [isConnecting, setIsConnecting] = useState(false)
    const [apiError, setApiError] = useState<string | null>(null)

    const [providerStatus, setProviderStatus] = useState<Record<ProviderKey, boolean>>({
        github: false,
        gitlab: false,
        bitbucket: false,
        azure: false,
    })
    const [providerUsernames, setProviderUsernames] = useState<Record<ProviderKey, string>>({
        github: "",
        gitlab: "",
        bitbucket: "",
        azure: "",
    })
    const [checkingStatus, setCheckingStatus] = useState<Record<ProviderKey, boolean>>({
        github: false,
        gitlab: false,
        bitbucket: false,
        azure: false,
    })

    const [githubOrgs, setGithubOrgs] = useState<GitHubOrg[]>([])
    const [githubOrgsLoading, setGithubOrgsLoading] = useState(false)
    const [githubSelectedOrg, setGithubSelectedOrg] = useState<string | null>(readSavedOrg)

    const [repos, setRepos] = useState<any[]>([])
    const [reposLoading, setReposLoading] = useState(false)
    const [reposPage, setReposPage] = useState(1)
    const [reposHasNext, setReposHasNext] = useState(false)
    const [selectedRepo, setSelectedRepo] = useState<any | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const manualForm = useForm<ManualProjectFormValues>({
        resolver: zodResolver(manualProjectSchema),
    })
    const fromScratchForm = useForm<FromScratchFormValues>({
        resolver: zodResolver(fromScratchSchema),
    })

    const [zipFile, setZipFile] = useState<File | null>(null)
    const [zipValidating, setZipValidating] = useState(false)
    const [zipError, setZipError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return

        const checkAllProviders = async () => {
            const providers: ProviderKey[] = ["github", "gitlab", "bitbucket", "azure"]

            for (const provider of providers) {
                setCheckingStatus((prev) => ({ ...prev, [provider]: true }))
                try {
                    let status: any
                    let username = ""
                    if (provider === "github") {
                        const s = await githubApi.getStatus()
                        status = s
                        username = s.githubUsername || ""
                    } else if (provider === "gitlab") {
                        const s = await gitlabApi.getStatus()
                        status = s
                        username = s.gitlabUsername || ""
                    } else if (provider === "bitbucket") {
                        const s = await bitbucketApi.getStatus()
                        status = s
                        username = s.bitbucketUsername || ""
                    } else if (provider === "azure") {
                        const s = await azureApi.getStatus()
                        status = s
                        username = s.azureUsername || ""
                    }

                    if (status) {
                        setProviderStatus((prev) => ({ ...prev, [provider]: status.connected }))
                        setProviderUsernames((prev) => ({ ...prev, [provider]: username }))
                    }
                } catch (err) {
                    setProviderStatus((prev) => ({ ...prev, [provider]: false }))
                } finally {
                    setCheckingStatus((prev) => ({ ...prev, [provider]: false }))
                }
            }
        }

        checkAllProviders()
    }, [open])

    const loadProviderRepos = async (provider: ProviderKey, page: number, org?: string | null) => {
        setReposLoading(true)
        setApiError(null)
        try {
            let data
            if (provider === "github") {
                data = await githubApi.getRepos({ page, perPage: 30, sort: "updated", org: org ?? undefined })
            } else if (provider === "gitlab") {
                data = await gitlabApi.getRepos({ page, perPage: 30 })
            } else if (provider === "bitbucket") {
                data = await bitbucketApi.getRepos({ page, perPage: 30 })
            } else {
                data = await azureApi.getRepos({ page, perPage: 30 })
            }

            if (data) {
                const mapped = data.repos.map((r: any) => ({
                    ...r,
                    full_name: r.full_name || r.path_with_namespace || r.full_slug || r.name,
                    html_url: r.html_url || r.web_url || r.links?.html?.href || r.webUrl || "",
                }))
                setRepos((prev) => (page === 1 ? mapped : [...prev, ...mapped]))
                setReposPage(page)
                setReposHasNext(data.hasNextPage)
            }
        } catch (err) {
            setApiError(`Failed to load ${provider} repositories.`)
        } finally {
            setReposLoading(false)
        }
    }

    const loadGithubOrgs = async () => {
        setGithubOrgsLoading(true)
        try {
            const data = await githubApi.getOrgs()
            setGithubOrgs(data.orgs)
        } catch {
            setGithubOrgs([])
        } finally {
            setGithubOrgsLoading(false)
        }
    }

    const handleEnterProvider = async (provider: ProviderKey) => {
        if (!providerStatus[provider]) {
            await handleConnectProvider(provider)
        } else {
            if (provider === "github") {
                await loadGithubOrgs()
                await loadProviderRepos(provider, 1, githubSelectedOrg)
            } else {
                await loadProviderRepos(provider, 1)
            }
            setStep(provider)
        }
    }

    const handleConnectProvider = async (provider: ProviderKey) => {
        setIsConnecting(true)
        setApiError(null)

        const width = 620,
            height = 720
        const left = Math.round(window.screenX + (window.outerWidth - width) / 2)
        const top = Math.round(window.screenY + (window.outerHeight - height) / 2)
        const popupName = `${provider}-oauth-${Date.now()}`

        const popup = window.open(
            "",
            popupName,
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
        )

        let data: { url: string } | null = null
        try {
            if (provider === "github") data = await githubApi.getOAuthStartUrl()
            else if (provider === "gitlab") data = await gitlabApi.getOAuthStartUrl()
            else if (provider === "bitbucket") data = await bitbucketApi.getOAuthStartUrl()
            else data = await azureApi.getOAuthStartUrl()
        } catch (err: any) {
            if (popup && !popup.closed) popup.close()
            setApiError(
                err instanceof ApiException ? err.message : `Failed to start ${provider} OAuth.`,
            )
            setIsConnecting(false)
            return
        }

        if (!popup || popup.closed) {
            window.location.href = data?.url || ""
            return
        }

        try {
            popup.location.href = data?.url || ""
        } catch {
            popup.close()
            window.location.href = data?.url || ""
            return
        }

        let settled = false
        const cleanup = (poll: ReturnType<typeof setInterval>) => {
            clearInterval(poll)
            clearTimeout(maxWaitTimer)
            window.removeEventListener("message", onMessage)
            localStorage.removeItem(`__docnine_${provider}_oauth_result`)
        }

        const finish = (status: string, user?: string | null, msg?: string | null) => {
            if (settled) return
            settled = true
            cleanup(poll)
            setIsConnecting(false)

            if (status === "connected") {
                handleEnterProvider(provider)
            } else if (status === "error") {
                setApiError(msg ?? `${provider} connection failed. Please try again.`)
            }
        }

        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data?.type !== `${provider}-oauth-complete`) return
            finish(event.data.status, event.data.user, event.data.msg)
        }
        window.addEventListener("message", onMessage)

        const maxWaitTimer = setTimeout(() => {
            if (!settled) finish("cancelled")
        }, 5 * 60 * 1000)

        const poll = setInterval(() => {
            const raw = localStorage.getItem(`__docnine_${provider}_oauth_result`)
            if (raw) {
                try {
                    const { status, user, msg } = JSON.parse(raw)
                    finish(status, user, msg)
                    return
                } catch {
                    /* malformed */
                }
            }

            if (!popup.closed) return

            if (settled) return
            settled = true
            cleanup(poll)
            setIsConnecting(false)
            const statusCheck =
                provider === "github"
                    ? githubApi.getStatus()
                    : provider === "gitlab"
                        ? gitlabApi.getStatus()
                        : provider === "bitbucket"
                            ? bitbucketApi.getStatus()
                            : azureApi.getStatus()

            statusCheck
                .then((s) => {
                    if (s.connected) {
                        setProviderStatus((prev) => ({ ...prev, [provider]: true }))
                        handleEnterProvider(provider)
                    }
                })
                .catch(() => {
                    /* network error */
                })
        }, 300)
    }

    const handleGithubOrgChange = (org: string | null) => {
        setGithubSelectedOrg(org)
        saveOrg(org)
        setRepos([])
        setSelectedRepo(null)
        setSearchQuery("")
        setReposPage(1)
        loadProviderRepos("github", 1, org)
    }

    const onSubmitManual = async (values: ManualProjectFormValues) => {
        setApiError(null)
        setIsConnecting(true)
        try {
            const result = await createProject(values.repoUrl)
            handleClose()
            navigate(`/projects/${result.id}/live`)
        } catch (err: any) {
            setApiError(
                err instanceof ApiException
                    ? err.code === "DUPLICATE_PROJECT"
                        ? "A pipeline is already running for this repository."
                        : err.message
                    : "Failed to create project. Is the server running?",
            )
        } finally {
            setIsConnecting(false)
        }
    }

    const onSubmitProvider = async (provider: ProviderKey) => {
        if (!selectedRepo) return
        setApiError(null)
        setIsConnecting(true)
        try {
            const repoUrl =
                selectedRepo.html_url || selectedRepo.web_url || selectedRepo.links?.html?.href || selectedRepo.webUrl
            const result = await createProject(repoUrl)
            handleClose()
            navigate(`/projects/${result.id}/live`)
        } catch (err: any) {
            setApiError(
                err instanceof ApiException
                    ? err.code === "DUPLICATE_PROJECT"
                        ? "A pipeline is already running for this repository."
                        : err.message
                    : "Failed to create project.",
            )
        } finally {
            setIsConnecting(false)
        }
    }

    const onSubmitZip = async () => {
        if (!zipFile) return
        setApiError(null)
        setIsConnecting(true)
        try {
            const result = await projectsApi.uploadZip(zipFile)
            handleClose()
            navigate(`/projects/${result.project._id}/live`)
        } catch (err: any) {
            setApiError(
                err instanceof ApiException ? err.message : "Failed to upload ZIP. Is the server running?",
            )
        } finally {
            setIsConnecting(false)
        }
    }

    const onSubmitFromScratch = async (values: FromScratchFormValues) => {
        setApiError("From Scratch projects coming soon!")
    }

    const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith(".zip")) {
            setZipError("Please select a .zip file")
            return
        }

        if (file.size > 100 * 1024 * 1024) {
            setZipError("ZIP file must be smaller than 100MB")
            return
        }

        setZipFile(file)
        setZipError(null)

        setZipValidating(true)
        try {
            const result = await projectsApi.validateZip(file)
            if (!result.valid) {
                setZipError(result.message || "ZIP file validation failed")
                setZipFile(null)
            }
        } catch (err) {
            setZipError("Failed to validate ZIP file")
            setZipFile(null)
        } finally {
            setZipValidating(false)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
        setTimeout(() => {
            setStep("source")
            manualForm.reset()
            fromScratchForm.reset()
            setSearchQuery("")
            setSelectedRepo(null)
            setRepos([])
            setReposPage(1)
            setApiError(null)
            setZipFile(null)
            setZipError(null)
        }, 200)
    }

    const filteredRepos = repos.filter((r) =>
        (r.full_name || r.path_with_namespace || r.full_slug || r.name)
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
    )

    const currentProvider = step as ProviderKey
    const currentProviderConfig = PROVIDER_CONFIG[currentProvider]

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-125">
                <DialogHeader>
                    <DialogTitle>
                        {step === "source" && "Create New Project"}
                        {step === "manual" && "Enter Repository URL"}
                        {step === "zip" && "Upload Project ZIP"}
                        {step === "from-scratch" && "Create From Scratch"}
                        {step === "github" && "Select GitHub Repository"}
                        {step === "gitlab" && "Select GitLab Repository"}
                        {step === "bitbucket" && "Select Bitbucket Repository"}
                        {step === "azure" && "Select Azure Repository"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "source" && "How would you like to add your project?"}
                        {step === "manual" &&
                            "Enter a repository URL for GitHub, GitLab, Bitbucket, or Azure DevOps."}
                        {step === "zip" && "Upload a ZIP file containing your project source code."}
                        {step === "from-scratch" && "Create a new empty project to set up manually."}
                        {(step === "github" || step === "gitlab" || step === "bitbucket" || step === "azure") &&
                            `Select a repository from your ${currentProviderConfig?.label} account.`}
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
                        <div className="grid grid-cols-3 gap-3">
                            {(["github", "gitlab", "bitbucket"] as const).map((provider) => {
                                const config = PROVIDER_CONFIG[provider]
                                const checking = checkingStatus[provider]
                                return (
                                    <button
                                        key={provider}
                                        onClick={() => handleEnterProvider(provider)}
                                        disabled={checking || isConnecting}
                                        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        <div className="text-2xl">{config.emoji}</div>
                                        <div className="font-medium text-sm">{config.label}</div>
                                        <div className="text-xs text-muted-foreground">{config.description}</div>
                                        {providerStatus[provider] && (
                                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-1" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => handleEnterProvider("azure")}
                                disabled={checkingStatus.azure || isConnecting}
                                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <div className="text-2xl">☁️</div>
                                <div className="font-medium text-sm">Azure DevOps</div>
                                <div className="text-xs text-muted-foreground">Connect repo</div>
                                {providerStatus.azure && (
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-1" />
                                )}
                            </button>

                            <button
                                onClick={() => setStep("zip")}
                                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <Upload className="h-6 w-6" />
                                <div className="font-medium text-sm">Upload ZIP</div>
                                <div className="text-xs text-muted-foreground">Upload folder</div>
                            </button>

                            <button
                                onClick={() => setStep("from-scratch")}
                                className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <Plus className="h-6 w-6" />
                                <div className="font-medium text-sm">From Scratch</div>
                                <div className="text-xs text-muted-foreground">Write manually</div>
                            </button>
                        </div>

                        <button
                            onClick={() => setStep("manual")}
                            className="w-full flex items-center gap-2 rounded-lg border border-border/50 p-3 text-left text-sm transition-colors hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        >
                            <LinkIcon className="h-4 w-4" />
                            Or paste a repository URL manually
                        </button>
                    </div>
                )}

                {step === "manual" && (
                    <form onSubmit={manualForm.handleSubmit(onSubmitManual)}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="repoUrl">Repository URL</Label>
                                <Input
                                    id="repoUrl"
                                    placeholder="https://github.com/owner/repo"
                                    {...manualForm.register("repoUrl")}
                                />
                                {manualForm.formState.errors.repoUrl && (
                                    <p className="text-sm text-destructive">
                                        {manualForm.formState.errors.repoUrl.message}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Supports GitHub, GitLab, Bitbucket, or Azure DevOps
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setStep("source")}>
                                Back
                            </Button>
                            <Button type="submit" disabled={manualForm.formState.isSubmitting}>
                                {manualForm.formState.isSubmitting && (
                                    <Loader1 className="mr-2 h-4 w-4" />
                                )}
                                Create Project
                            </Button>
                        </DialogFooter>
                    </form>
                )}

                {step === "zip" && (
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="zipFile">Project ZIP File</Label>
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                                <input
                                    id="zipFile"
                                    type="file"
                                    accept=".zip"
                                    onChange={handleZipFileChange}
                                    className="hidden"
                                />
                                {zipFile ? (
                                    <div className="space-y-2">
                                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                                        <p className="font-medium text-sm">{zipFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(zipFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setZipFile(null)}
                                            className="text-xs text-primary hover:underline mt-2"
                                        >
                                            Choose different file
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm font-medium">Drag and drop your ZIP here</p>
                                        <p className="text-xs text-muted-foreground">or</p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                document.getElementById("zipFile")?.click()
                                            }
                                            className="text-sm text-primary hover:underline"
                                        >
                                            browse files
                                        </button>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Max 100 MB
                                        </p>
                                    </>
                                )}
                            </div>
                            {zipError && (
                                <p className="text-sm text-destructive flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {zipError}
                                </p>
                            )}
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setStep("source")}>
                                Back
                            </Button>
                            <Button onClick={onSubmitZip} disabled={!zipFile || isConnecting || zipValidating}>
                                {isConnecting && <Loader1 className="mr-2 h-4 w-4" />}
                                {zipValidating && <Loader1 className="mr-2 h-4 w-4" />}
                                Upload & Create Project
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {step === "from-scratch" && (
                    <form onSubmit={fromScratchForm.handleSubmit(onSubmitFromScratch)}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="projectName">Project Name</Label>
                                <Input
                                    id="projectName"
                                    placeholder="My Project"
                                    {...fromScratchForm.register("projectName")}
                                />
                                {fromScratchForm.formState.errors.projectName && (
                                    <p className="text-sm text-destructive">
                                        {fromScratchForm.formState.errors.projectName.message}
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setStep("source")}>
                                Back
                            </Button>
                            <Button
                                type="submit"
                                disabled={fromScratchForm.formState.isSubmitting}
                            >
                                Create Project
                            </Button>
                        </DialogFooter>
                    </form>
                )}

                {(step === "github" ||
                    step === "gitlab" ||
                    step === "bitbucket" ||
                    step === "azure") && (
                        <div className="grid gap-4 py-4">
                            {step === "github" && (
                                <OrgAccountPicker
                                    username={providerUsernames.github}
                                    orgs={githubOrgs}
                                    orgsLoading={githubOrgsLoading}
                                    selected={githubSelectedOrg}
                                    onSelect={handleGithubOrgChange}
                                />
                            )}

                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search repositories…"
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="max-h-62.5 overflow-y-auto rounded-md border border-border">
                                <RepoList
                                    repos={filteredRepos}
                                    loading={reposLoading}
                                    hasNextPage={reposHasNext}
                                    selectedRepo={selectedRepo}
                                    onSelect={setSelectedRepo}
                                    onLoadMore={() =>
                                        loadProviderRepos(
                                            currentProvider,
                                            reposPage + 1,
                                            step === "github" ? githubSelectedOrg : undefined,
                                        )
                                    }
                                />
                            </div>

                            <DialogFooter className="mt-4">
                                <Button type="button" variant="ghost" onClick={() => setStep("source")}>
                                    Back
                                </Button>
                                <Button
                                    onClick={() => onSubmitProvider(currentProvider)}
                                    disabled={!selectedRepo || isConnecting}
                                >
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
