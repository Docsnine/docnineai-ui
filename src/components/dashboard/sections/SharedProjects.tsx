import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users2, ArrowRight } from "lucide-react"
import { Project } from "@/store/projects"

interface SharedProjectsProps {
    projects: Project[]
    isLoading: boolean
}

export function SharedProjects({ projects, isLoading }: SharedProjectsProps) {
    if (!isLoading && projects.length === 0) {
        return null
    }

    return (
        <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
                <Users2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Shared with Me</h2>
                <span className="text-sm text-muted-foreground">
                    ({projects.length})
                </span>
            </div>

            {isLoading ? (
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
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <Card
                            key={project.id}
                            className="flex flex-col transition-all shadow-none hover:shadow-md hover:border-primary/20"
                        >
                            <CardHeader className="pb-4">
                                <h3 className="font-semibold text-sm truncate" title={project.name}>
                                    {project.name}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate">
                                    {project.repoOwner} / {project.name}
                                </p>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <Button size="sm" asChild className="w-full">
                                    <Link to={`/projects/${project.id}`}>
                                        View Project <ArrowRight className="ml-2 h-3 w-3" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
