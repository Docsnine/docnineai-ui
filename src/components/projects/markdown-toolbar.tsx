import { useRef, useState } from "react"
import { Bold, Italic, List, ListOrdered, Code, Link as LinkIcon, Heading1, Heading2, ImageIcon, Quote, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export interface MarkdownToolbarProps {
  onInsert: (prefix: string, suffix?: string) => void
}

export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const [headingsOpen, setHeadingsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const headingsRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30 flex-wrap">
      {/* Text Formatting */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onInsert("**", "**")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onInsert("*", "*")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onInsert("~~", "~~")}
        title="Strikethrough"
      >
        <span className="text-sm font-bold">S</span>
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Headings Dropdown */}
      <div ref={headingsRef} className="relative">
        <DropdownMenu open={headingsOpen} onOpenChange={setHeadingsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Headings"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-max">
            <DropdownMenuItem onClick={() => { onInsert("# "); setHeadingsOpen(false) }}>
              <Heading1 className="h-4 w-4 mr-2" />
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onInsert("## "); setHeadingsOpen(false) }}>
              <Heading2 className="h-4 w-4 mr-2" />
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onInsert("### "); setHeadingsOpen(false) }}>
              <span className="text-xs font-bold mr-2">H3</span>
              Heading 3
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onInsert("#### "); setHeadingsOpen(false) }}>
              <span className="text-xs font-bold mr-2">H4</span>
              Heading 4
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onInsert("- ")}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onInsert("1. ")}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Code */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onInsert("`", "`")}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onInsert("```\n", "\n```")}
        title="Code Block"
      >
        <span className="text-xs font-bold">&lt;&gt;</span>
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Links & Media */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onInsert("[", "](url)")}
        title="Link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onInsert("![alt text](", ")")}
        title="Image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* More Options */}
      <div ref={moreRef} className="relative">
        <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="More formatting options"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-max">
            <DropdownMenuItem onClick={() => { onInsert("> "); setMoreOpen(false) }}>
              <Quote className="h-4 w-4 mr-2" />
              Blockquote
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { onInsert("---"); setMoreOpen(false) }}>
              <span className="text-xs mr-2">—</span>
              Horizontal Line
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onInsert("| ", " |"); setMoreOpen(false) }} title="Table Header">
              <span className="text-xs font-bold mr-2">⊞</span>
              Table
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { onInsert("- [ ] "); setMoreOpen(false) }}>
              <span className="text-xs mr-2">☐</span>
              Checkbox
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onInsert("::: note\n", "\n:::"); setMoreOpen(false) }} title="Callout/Note">
              <span className="text-xs font-bold mr-2">!</span>
              Note Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
