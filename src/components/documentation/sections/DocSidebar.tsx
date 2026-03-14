import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface DocSidebarProps {
  sections: Array<{
    key: string
    label: string
    icon: React.ElementType
  }>
  activeTab: string
  onTabChange: (tab: string) => void
  isLoading: boolean
}

export function DocSidebar({
  sections,
  activeTab,
  onTabChange,
  isLoading,
}: DocSidebarProps) {
  if (isLoading) {
    return (
      <Card className="shadow-none h-full">
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-none h-full">
      <CardHeader>
        <CardTitle className="text-sm">Sections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Button
              key={section.key}
              variant={activeTab === section.key ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => onTabChange(section.key)}
            >
              <Icon className="h-4 w-4" />
              {section.label}
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
