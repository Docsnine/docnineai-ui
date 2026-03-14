import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface DocumentationsSearchProps {
  search: string
  onSearchChange: (value: string) => void
}

export function DocumentationsSearch({ search, onSearchChange }: DocumentationsSearchProps) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search by name, language, or tech..."
        className="pl-9 rounded-2xl"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  )
}
