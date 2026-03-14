import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

interface DocHeaderProps {
  title: string
  isSidebarOpen: boolean
  onSidebarToggle: () => void
  onBack: () => void
}

export function DocHeader({ title, isSidebarOpen, onSidebarToggle, onBack }: DocHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6 border-b border-border pb-4">
      <Button variant="ghost" size="icon" onClick={onBack}>
        ←
      </Button>
      <h1 className="text-2xl font-bold flex-1">{title}</h1>
      <Button variant="ghost" size="icon" onClick={onSidebarToggle}>
        {isSidebarOpen ? "Close" : "Open"} Sidebar
      </Button>
    </div>
  )
}
