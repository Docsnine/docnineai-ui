import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Github, Link as LinkIcon, Loader2, Search } from "lucide-react"
import { useProjectStore } from "@/store/projects"
import { cn } from "@/lib/utils"

const manualProjectSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    repoUrl: z.string().url("Must be a valid URL").includes("github.com", { message: "Must be a GitHub URL" }),
})

type ManualProjectFormValues = z.infer<typeof manualProjectSchema>

interface NewProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function NewProjectModal({ open, onOpenChange }: NewProjectModalProps) {
    const [step, setStep] = useState<"source" | "github" | "manual">("source")
    const [isConnecting, setIsConnecting] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
    const addProject = useProjectStore(state => state.addProject)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ManualProjectFormValues>({
        resolver: zodResolver(manualProjectSchema),
    })

    // Mock GitHub repos
    const mockRepos = [
        { id: 1, name: "user/frontend-app", url: "https://github.com/user/frontend-app" },
        { id: 2, name: "user/backend-api", url: "https://github.com/user/backend-api" },
        { id: 3, name: "user/utils-library", url: "https://github.com/user/utils-library" },
        { id: 4, name: "user/docs-site", url: "https://github.com/user/docs-site" },
    ].filter(repo => repo.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const handleClose = () => {
        onOpenChange(false)
        setTimeout(() => {
            setStep("source")
            reset()
            setSearchQuery("")
            setSelectedRepo(null)
        }, 200)
    }

    const handleConnectGithub = async () => {
        setIsConnecting(true)
        // Simulate OAuth flow
        await new Promise(resolve => setTimeout(resolve, 1500))
        setIsConnecting(false)
        setStep("github")
    }

    const onSubmitManual = async (data: ManualProjectFormValues) => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        addProject({
            name: data.name,
            repoUrl: data.repoUrl,
            source: "manual",
        })
        handleClose()
    }

    const onSubmitGithub = async () => {
        if (!selectedRepo) return
        const repo = mockRepos.find(r => r.name === selectedRepo)
        if (!repo) return

        setIsConnecting(true)
        await new Promise(resolve => setTimeout(resolve, 1000))
        addProject({
            name: repo.name.split("/")[1],
            repoUrl: repo.url,
            source: "github",
        })
        setIsConnecting(false)
        handleClose()
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {step === "source" && "Create New Project"}
                        {step === "github" && "Select Repository"}
                        {step === "manual" && "Manual Configuration"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "source" && "Choose how you want to import your codebase."}
                        {step === "github" && "Select a repository from your connected GitHub account."}
                        {step === "manual" && "Enter your repository details manually."}
                    </DialogDescription>
                </DialogHeader>

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
                                <h4 className="font-medium">Connect GitHub</h4>
                                <p className="text-sm text-muted-foreground">Import repositories directly from your account.</p>
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
                                <Label htmlFor="name">Project Name</Label>
                                <Input id="name" placeholder="My Project" {...register("name")} />
                                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="repoUrl">GitHub Repository URL</Label>
                                <Input id="repoUrl" placeholder="https://github.com/username/repo" {...register("repoUrl")} />
                                {errors.repoUrl && <p className="text-sm text-destructive">{errors.repoUrl.message}</p>}
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
                            {mockRepos.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">No repositories found.</div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {mockRepos.map((repo) => (
                                        <button
                                            key={repo.id}
                                            onClick={() => setSelectedRepo(repo.name)}
                                            className={cn(
                                                "flex w-full items-center justify-between p-3 text-left text-sm transition-colors hover:bg-muted",
                                                selectedRepo === repo.name && "bg-primary/5"
                                            )}
                                        >
                                            <span className="font-medium">{repo.name}</span>
                                            {selectedRepo === repo.name && (
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="button" variant="ghost" onClick={() => setStep("source")}>
                                Back
                            </Button>
                            <Button
                                onClick={onSubmitGithub}
                                disabled={!selectedRepo || isConnecting}
                            >
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
