import { Button } from "@/components/ui/button"

interface DocStatusFilterProps {
  filters: string[]
  activeFilter: string
  onFilterChange: (filter: string) => void
  counts: Record<string, number>
}

export function DocStatusFilter({
  filters,
  activeFilter,
  onFilterChange,
  counts,
}: DocStatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button
        onClick={() => onFilterChange("all")}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
          activeFilter === "all"
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card"
        }`}
      >
        All
      </button>
      {filters.map((filter) => {
        const count = counts[filter] ?? 0
        if (count === 0) return null
        const isActive = activeFilter === filter
        return (
          <button
            key={filter}
            onClick={() => onFilterChange(isActive ? "all" : filter)}
            className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full border transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            }`}
          >
            <span className="capitalize">{filter.replace("_", " ")}</span>
            <span className="font-tabular">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
