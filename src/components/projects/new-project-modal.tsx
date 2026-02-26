import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Github, Link as LinkIcon, Loader2, Search, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import { useProjectStore } from "@/store/projects"
import { githubApi, GitHubRepo, ApiException } from "@/lib/api"
import { cn } from "@/lib/utils"

const manualProjectSchema = z.object({
    repoUrl: z
        .string()
        .min(1, "Repository URL is required")
        .refine(
            (v) => v.includes("github.com") || /^[\w.-]+\/[\w.-]+$/.test(v),
            "Must be a GitHub URL or owner/repo shorthand"
        ),
})

type ManualProjectFormValues = z.infer<typeof manualProjectSchema>

interface NewProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function NewProjectModal({ open, onOpenChange }: NewProjectModalProps) {
    const navigate = useNavigate()
    const [step, setStep] = useState<"source" | "github" | "manual">("source")
    const [isConnecting, setIsConnecting] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
    const [apiError, setApiError] = useState<string | null>(null)

    // GitHub connection state
    const [githubConnected, setGithubConnected] = useState(false)
    const [githubUsername, setGithubUsername] = useState<string | null>(null)
    const [repos, setRepos] = useState<GitHubRepo[]>([])
    const [reposLoading, setReposLoading] = useState(false)
    const [reposPage, setReposPage] = useState(1)
    const [reposHasNext, setReposHasNext] = useState(false)

    const { createProject } = useProjectStore()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ManualProjectFormValues>({
        resolver: zodResolver(manualProjectSchema),
    })

    // When modal opens, check GitHub connection status
    useEffect(() => {
        if (!open) return
        githubApi.getStatus().then((status) => {
            setGithubConnected(status.connected)
            if (status.githubUsername) setGithubUsername(status.githubUsername)
        }).catch(() => {
            // Not authenticated or GitHub not connected — ignore
        })
    }, [open])

    // Fetch repos when entering GitHub step
    useEffect(() => {
        if (step !== "github" || !githubConnected) return
        loadRepos(1)
    }, [step, githubConnected])

    const loadRepos = async (page: number) => {
        setReposLoading(true);
        setApiError(null);
        try {
            const data = await githubApi.getRepos({ page, perPage: 30, sort: "updated" });
            // Map API fields to expected frontend fields
            const mappedRepos = data.repos.map((repo: any) => ({
                ...repo,
                full_name: repo.fullName,
                description: repo.description,
                html_url: repo.url,
            }));
            setRepos(page === 1 ? mappedRepos : (prev) => [...prev, ...mappedRepos]);
            setReposPage(page);
            setReposHasNext(data.hasNextPage);
        } catch (err: any) {
            setApiError("Failed to load repositories.");
        } finally {
            setReposLoading(false);
        }
    }

    const handleClose = () => {
        onOpenChange(false)
        setTimeout(() => {
            setStep("source")
            reset()
            setSearchQuery("")
            setSelectedRepo(null)
            setRepos([])
            setReposPage(1)
            setApiError(null)
        }, 200)
    }

    /** Start GitHub OAuth flow: call /github/oauth/start, redirect browser. */
    const handleConnectGithub = async () => {
        if (githubConnected) {
            // Already connected — go straight to repo picker
            setStep("github")
            return
        }
        setIsConnecting(true)
        setApiError(null)
        try {
            const data = await githubApi.getOAuthStartUrl()
            // Redirect browser to GitHub authorization page
            window.location.href = data.url
        } catch (err: any) {
            setApiError(err instanceof ApiException ? err.message : "Failed to start GitHub OAuth.")
            setIsConnecting(false)
        }
    }

    const onSubmitManual = async (data: ManualProjectFormValues) => {
        setApiError(null)
        try {
            const result = await createProject(data.repoUrl)
            handleClose()
            navigate(`/projects/${result.id}/live`)
        } catch (err: any) {
            if (err instanceof ApiException) {
                if (err.code === "DUPLICATE_PROJECT") {
                    setApiError("A pipeline is already running for this repository.")
                } else {
                    setApiError(err.message)
                }
            } else {
                setApiError("Failed to create project. Is the server running?")
            }
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
            if (err instanceof ApiException) {
                if (err.code === "DUPLICATE_PROJECT") {
                    setApiError("A pipeline is already running for this repository.")
                } else {
                    setApiError(err.message)
                }
            } else {
                setApiError("Failed to create project.")
            }
        } finally {
            setIsConnecting(false)
        }
    }

    const filteredRepos = repos.filter((r) => {
        if (!r.full_name) return false;
        return r.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {step === "source" && "Create New Project"}
                        {step === "github" && "Select Repository"}
                        {step === "manual" && "Enter Repository URL"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "source" && "Choose how you want to import your codebase."}
                        {step === "github" && (githubUsername ? `Repositories from @${githubUsername}` : "Select a repository from your GitHub account.")}
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
                                    <h4 className="font-medium">
                                        {githubConnected ? "Select from GitHub" : "Connect GitHub"}
                                    </h4>
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
                    <form onSubmit={handleSubmit(onSubmitManual)}>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="repoUrl">GitHub Repository URL</Label>
                                <Input
                                    id="repoUrl"
                                    placeholder="https://github.com/owner/repo"
                                    {...register("repoUrl")}
                                />
                                {errors.repoUrl && <p className="text-sm text-destructive">{errors.repoUrl.message}</p>}
                                <p className="text-xs text-muted-foreground">
                                    e.g. <code>https://github.com/vercel/next.js</code> or <code>vercel/next.js</code>
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setStep("source")}>
                                Back
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Project
                            </Button>
                        </DialogFooter>
                    </form>
                )}

                {step === "github" && (
                    <div className="grid gap-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search repositories..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="max-h-[250px] overflow-y-auto rounded-md border border-border">
                            {reposLoading && repos.length === 0 ? (
                                <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading repositories…
                                </div>
                            ) : filteredRepos.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">No repositories found.</div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {filteredRepos.map((repo) => (
                                        <button
                                            key={repo.id}
                                            onClick={() => setSelectedRepo(repo)}
                                            className={cn(
                                                "flex w-full items-center justify-between p-3 text-left text-sm transition-colors hover:bg-muted",
                                                selectedRepo?.id === repo.id && "bg-primary/5"
                                            )}
                                        >
                                            <div>
                                                <span className="font-medium">{repo.full_name}</span>
                                                {repo.description && (
                                                    <p className="text-xs text-muted-foreground truncate max-w-[350px] mt-0.5">
                                                        {repo.description}
                                                    </p>
                                                )}
                                            </div>
                                            {selectedRepo?.id === repo.id && (
                                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />
                                            )}
                                        </button>
                                    ))}
                                    {/* Load more */}
                                    {reposHasNext && !reposLoading && (
                                        <button
                                            className="flex w-full items-center justify-center gap-2 p-3 text-sm text-primary hover:bg-muted transition-colors"
                                            onClick={() => loadRepos(reposPage + 1)}
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" /> Load more
                                        </button>
                                    )}
                                    {reposLoading && repos.length > 0 && (
                                        <div className="flex items-center justify-center p-3 text-sm text-muted-foreground">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setStep("source")}>
                                Back
                            </Button>
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
