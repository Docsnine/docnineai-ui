import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon = Search,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl bg-card/50 ${className ?? ""}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-1">{description}</p>
      {(actionLabel && (actionHref || onAction)) && (
        <div className="mt-6">
          {actionHref ? (
            <Button asChild variant="outline">
              <Link to={actionHref}>
                <Plus className="mr-2 h-4 w-4" /> {actionLabel}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={onAction}>
              <Plus className="mr-2 h-4 w-4" /> {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
