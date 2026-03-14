import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { ProjectStatus } from "@/store/projects"

interface DashboardFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: ProjectStatus | "all"
  onStatusChange: (value: ProjectStatus | "all") => void
  sortBy: "updated" | "created" | "name"
  onSortChange: (value: "updated" | "created" | "name") => void
}

export function DashboardFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
      <div className="relative w-full md:max-w-sm">
        <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          className="pl-9 rounded-2xl"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        <Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as ProjectStatus | "all")}
          className="w-[130px] !rounded-2xl"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="analyzing">Analyzing</option>
          <option value="failed">Failed</option>
          <option value="archived">Archived</option>
        </Select>
        <Select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as "updated" | "created" | "name")}
          className="w-[130px] !rounded-2xl"
        >
          <option value="updated">Last Updated</option>
          <option value="created">Created Date</option>
          <option value="name">Name</option>
        </Select>
      </div>
    </div>
  )
}
