/**
 * Component: Repository List
 * Displays paginated list of repositories
 */

import { CheckCircle2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import Loader1 from "@/components/ui/loader1"
import type { RepoListProps } from "../../../types/ProjectTypes"

export function RepoList({
    repos,
    loading,
    hasNextPage,
    selectedRepo,
    onSelect,
    onLoadMore,
}: RepoListProps) {
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
                const displayName = repo.full_name
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
