import { useParams, Link } from "react-router-dom"
import { useProjectStore } from "@/store/projects"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { ArrowLeft, BookOpen, Download, Share2, Settings, Github, Link as LinkIcon, AlertTriangle, CheckCircle2, Loader2, Clock, PlayCircle } from "lucide-react"

export function ProjectOverviewPage() {
    const { id } = useParams<{ id: string }>()
    const project = useProjectStore(state => state.projects.find(p => p.id === id))

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-2xl font-bold">Project Not Found</h2>
                <p className="text-muted-foreground mt-2">The project you are looking for does not exist or has been deleted.</p>
                <Button asChild className="mt-6">
                    <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
            </div>
        )
    }

    const getStatusBadge = () => {
        switch (project.status) {
            case "completed":
                return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Analysis Completed</Badge>
            case "analyzing":
                return <Badge variant="warning" className="flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing Codebase...</Badge>
            case "failed":
                return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Analysis Failed</Badge>
            default:
                return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-4 w-4" /> Ready for Analysis</Badge>
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

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                        {getStatusBadge()}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <a href={project.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                            {project.source === "github" ? <Github className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                            {project.repoUrl.replace("https://github.com/", "")}
                        </a>
                        <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {project.lastAnalyzed
                                ? `Last analyzed ${formatDistanceToNow(new Date(project.lastAnalyzed), { addSuffix: true })}`
                                : `Created ${formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}`}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {project.status === "idle" || project.status === "failed" ? (
                        <Button asChild className="w-full md:w-auto">
                            <Link to={`/projects/${project.id}/live`}>
                                <PlayCircle className="mr-2 h-4 w-4" /> Start Analysis
                            </Link>
                        </Button>
                    ) : project.status === "analyzing" ? (
                        <Button asChild variant="secondary" className="w-full md:w-auto">
                            <Link to={`/projects/${project.id}/live`}>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> View Progress
                            </Link>
                        </Button>
                    ) : (
                        <Button asChild className="w-full md:w-auto">
                            <Link to={`/projects/${project.id}/docs`}>
                                <BookOpen className="mr-2 h-4 w-4" /> View Documentation
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Project Overview</CardTitle>
                        <CardDescription>Summary of the latest analysis run.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {project.status === "completed" ? (
                            <div className="space-y-4">
                                <p className="text-muted-foreground">
                                    The codebase was successfully analyzed. We found 42 components, 15 API endpoints, and generated comprehensive documentation.
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold text-primary">42</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Components</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold text-primary">15</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Endpoints</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold text-yellow-600">3</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Warnings</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-2xl font-bold text-green-600">98%</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Health Score</p>
                                    </div>
                                </div>
                            </div>
                        ) : project.status === "analyzing" ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    <p>Analysis is currently running. This may take a few minutes depending on the repository size.</p>
                                </div>
                                <div className="space-y-2 pt-4">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                    <Skeleton className="h-4 w-[300px]" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg bg-muted/30">
                                <PlayCircle className="h-10 w-10 text-muted-foreground mb-3" />
                                <h3 className="font-medium">No Analysis Data</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                    Run an analysis to generate documentation and insights for this repository.
                                </p>
                                <Button asChild variant="outline" className="mt-4">
                                    <Link to={`/projects/${project.id}/live`}>Start Analysis</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Manage project settings and exports.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button variant="outline" className="w-full justify-start" disabled={project.status !== "completed"}>
                            <Download className="mr-2 h-4 w-4" /> Export to PDF
                        </Button>
                        <Button variant="outline" className="w-full justify-start" disabled={project.status !== "completed"}>
                            <Share2 className="mr-2 h-4 w-4" /> Share Project
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <Settings className="mr-2 h-4 w-4" /> Project Settings
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
