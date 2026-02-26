import { useState } from "react"
import { Link } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { useProjectStore, ProjectStatus } from "@/store/projects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { NewProjectModal } from "@/components/projects/new-project-modal"
import { Search, Plus, Github, Link as LinkIcon, Clock, AlertCircle, CheckCircle2, Loader2, MoreVertical } from "lucide-react"

export function DashboardPage() {
    const projects = useProjectStore(state => state.projects)
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
    const [sourceFilter, setSourceFilter] = useState<"all" | "github" | "manual">("all")
    const [sortBy, setSortBy] = useState<"updated" | "created">("updated")

    const filteredProjects = projects
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter(p => statusFilter === "all" ? true : p.status === statusFilter)
        .filter(p => sourceFilter === "all" ? true : p.source === sourceFilter)
        .sort((a, b) => {
            if (sortBy === "updated") {
                return new Date(b.lastAnalyzed || b.createdAt).getTime() - new Date(a.lastAnalyzed || a.createdAt).getTime()
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

    const getStatusBadge = (status: ProjectStatus) => {
        switch (status) {
            case "completed":
                return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>
            case "analyzing":
                return <Badge variant="warning" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Analyzing</Badge>
            case "failed":
                return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Failed</Badge>
            default:
                return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Idle</Badge>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground">Manage and analyze your codebases.</p>
                </div>
                <Button onClick={() => setIsNewProjectModalOpen(true)} className="shrink-0">
                    <Plus className="mr-2 h-4 w-4" /> New Project
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border">
                <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-[130px]"
                    >
                        <option value="all">All Status</option>
                        <option value="idle">Idle</option>
                        <option value="analyzing">Analyzing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                    </Select>
                    <Select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value as any)}
                        className="w-[130px]"
                    >
                        <option value="all">All Sources</option>
                        <option value="github">GitHub</option>
                        <option value="manual">Manual</option>
                    </Select>
                    <Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-[130px]"
                    >
                        <option value="updated">Last Updated</option>
                        <option value="created">Created Date</option>
                    </Select>
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl bg-card/50">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                        <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">No projects found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                        We couldn't find any projects matching your current filters. Try adjusting your search or create a new project.
                    </p>
                    <Button variant="outline" className="mt-6" onClick={() => setIsNewProjectModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create Project
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map((project) => (
                        <Card key={project.id} className="flex flex-col transition-all shadow-none hover:shadow-md hover:border-primary/20">
                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg line-clamp-1" title={project.name}>
                                            <Link to={`/projects/${project.id}`} className="hover:underline hover:text-primary">
                                                {project.name}
                                            </Link>
                                        </CardTitle>
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            {project.source === "github" ? (
                                                <Github className="mr-1 h-3 w-3" />
                                            ) : (
                                                <LinkIcon className="mr-1 h-3 w-3" />
                                            )}
                                            <span className="truncate max-w-[200px]" title={project.repoUrl}>
                                                {project.repoUrl.replace("https://github.com/", "")}
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="flex items-center justify-between">
                                    {getStatusBadge(project.status)}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground flex justify-between">
                                <span>
                                    {project.lastAnalyzed
                                        ? `Analyzed ${formatDistanceToNow(new Date(project.lastAnalyzed), { addSuffix: true })}`
                                        : `Created ${formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}`}
                                </span>
                                <Link to={`/projects/${project.id}`} className="font-medium text-primary hover:underline">
                                    View Details
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <NewProjectModal open={isNewProjectModalOpen} onOpenChange={setIsNewProjectModalOpen} />
        </div>
    )
}
