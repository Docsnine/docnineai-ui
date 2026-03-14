import { CustomTab } from "@/lib/api"

export interface DocumentationTabState {
  activeTab: string
  isEditMode: boolean
  isChatOpen: boolean
  isHistoryOpen: boolean
}

export interface DocumentationViewerState {
  project: any | null
  editedContent: Record<string, string>
  editedSections: any[]
  portals: any[]
  isOwner: boolean
}
