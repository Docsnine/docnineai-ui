import { DocRenderer } from "@/components/projects/DocRenderer"

interface DocViewerProps {
  content: string
  isLoading: boolean
  isSkeleton?: boolean
}

export function DocViewer({ content, isLoading, isSkeleton }: DocViewerProps) {
  if (isLoading || isSkeleton) {
    return <div className="animate-pulse"><div className="bg-muted h-64 rounded" /></div>
  }

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <DocRenderer content={content} />
    </div>
  )
}
