import { useState } from "react"
import { Link } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { Project, ProjectStatus } from "@/store/projects"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  MoreVertical,
  Archive,
  Trash2,
  RefreshCw,
  Github,
  FolderGitIcon,
  PencilLineIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react"
import Loader1 from "@/components/ui/loader1"

interface ProjectsGridProps {
  projects: Project[]
  isLoading: boolean
  onDelete: (id: string, e: React.MouseEvent) => void
  onArchive: (id: string, e: React.MouseEvent) => void
  onRetry: (id: string, e: React.MouseEvent) => void
  actionLoading: string | null
  debouncedSearch: string
  statusFilter: ProjectStatus | "all"
}

function getStatusBadge(status: ProjectStatus) {
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

export function ProjectsGrid({
  projects,
  isLoading,
  onDelete,
  onArchive,
  onRetry,
  actionLoading,
  debouncedSearch,
  statusFilter,
}: ProjectsGridProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  if (isLoading) {
    return (
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
    )
  }

  if (projects.length === 0) {
    return null
  }

  return (
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
                        onClick={(e) => {
                          onRetry(project.id, e)
                          setOpenMenuId(null)
                        }}
                      >
                        <RefreshCw className="h-4 w-4 text-primary" /> Retry Pipeline
                      </button>
                    )}
                    {project.status !== "archived" && project.status !== "analyzing" && (
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
                        onClick={(e) => {
                          onArchive(project.id, e)
                          setOpenMenuId(null)
                        }}
                      >
                        <Archive className="h-4 w-4 text-muted-foreground" /> Archive
                      </button>
                    )}
                    {project.status !== "analyzing" && (
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-destructive/10 text-destructive transition-colors"
                        onClick={(e) => {
                          onDelete(project.id, e)
                          setOpenMenuId(null)
                        }}
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
  )
}
