import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { useProjectStore, mapApiStatus } from "@/store/projects"
import { projectsApi, ApiException, ApiProject } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Book,
  ShieldAlert,
  FileCode2,
  Database,
  BookOpen,
  Menu,
  Download,
  AlertTriangle,
  Edit3,
  Bot,
  Save,
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  Loader2,
  Info,
  FileCode,
  ExternalLink,
} from "lucide-react"
import Markdown from "react-markdown"
import { cn } from "@/lib/utils"
import { AIChatPanel } from "@/components/projects/ai-chat"
import { DocRenderer } from "@/components/projects/DocRenderer"

// ── Tab definitions ──────────────────────────────────────────────────────────
type DocTab = "readme" | "api" | "schema" | "internal" | "security" | "other_docs"

interface TabDef {
  key: DocTab
  label: string
  icon: React.ElementType
  field: "readme" | "apiReference" | "schemaDocs" | "internalDocs" | "securityReport" | "otherDocs"
}

const TABS: TabDef[] = [
  { key: "readme", label: "README", icon: Book, field: "readme" },
  { key: "api", label: "API Reference", icon: FileCode2, field: "apiReference" },
  { key: "schema", label: "Schema Docs", icon: Database, field: "schemaDocs" },
  { key: "internal", label: "Internal Docs", icon: BookOpen, field: "internalDocs" },
  { key: "security", label: "Security", icon: ShieldAlert, field: "securityReport" },
  { key: "other_docs", label: "Other Docs", icon: FileCode, field: "otherDocs" },
]

// ── Markdown editor toolbar ──────────────────────────────────────────────────

function MarkdownToolbar({ onInsert }: { onInsert: (prefix: string, suffix?: string) => void }) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert("**", "**")} title="Bold">
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert("*", "*")} title="Italic">
        <Italic className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert("- ")} title="Bullet List">
        <List className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert("1. ")} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert("`", "`")} title="Inline Code">
        <Code className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onInsert("[", "](url)")} title="Link">
        <LinkIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function DocumentationViewerPage() {
  const { id } = useParams<{ id: string }>()
  const { getProjectData } = useProjectStore()

  type EffectiveOutput = {
    readme?: string;
    apiReference?: string;
    schemaDocs?: string;
    internalDocs?: string;
    securityReport?: string;
  };

  const [project, setProject] = useState<ApiProject | null>(null);
  const [effectiveOutput, setEffectiveOutput] = useState<EffectiveOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<DocTab>("readme")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  // Editable content per tab (initialized from project data)
  const [editedContent, setEditedContent] = useState<Record<DocTab, string>>({
    readme: "",
    api: "",
    schema: "",
    internal: "",
    security: "",
    other_docs: "",
  })

  // Load project on mount
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getProjectData(id)
      .then((data) => {
        setProject(data.project);
        setEffectiveOutput(data.effectiveOutput);
        setEditedContent({
          readme: data.effectiveOutput?.readme ?? "",
          api: data.effectiveOutput?.apiReference ?? "",
          schema: data.effectiveOutput?.schemaDocs ?? "",
          internal: data.effectiveOutput?.internalDocs ?? "",
          security: data.effectiveOutput?.securityReport ?? "",
          other_docs: data.effectiveOutput?.otherDocs ?? "",
        });
      })
      .finally(() => setIsLoading(false));
  }, [id, getProjectData])

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getCurrentContent = () => editedContent[activeTab] ?? ""

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("markdown-editor") as HTMLTextAreaElement
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = editedContent[activeTab]
    const selected = text.substring(start, end)
    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end)
    setEditedContent((c) => ({ ...c, [activeTab]: newText }))
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, end + prefix.length)
    }, 0)
  }

  const handleSave = () => setIsEditMode(false)

  const handleCancelEdit = () => {
    if (project) {
      const effective = (project as any).effectiveOutput || project;
      setEditedContent({
        readme: effective.readme ?? "",
        api: effective.apiReference ?? "",
        schema: effective.schemaDocs ?? "",
        internal: effective.internalDocs ?? "",
        security: effective.securityReport ?? "",
        other_docs: effective.otherDocs ?? "",
      });
    }
    setIsEditMode(false);
  }

  // ── Exports ────────────────────────────────────────────────────────────────

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = async () => {
    if (!id) return
    setActionLoading("pdf")
    setExportMessage(null)
    try {
      const blob = await projectsApi.exportBlob(id, "pdf")
      triggerDownload(blob, `${project?.meta?.name ?? id}-docs.pdf`)
    } catch (err: any) {
      setExportMessage("PDF export failed: " + (err?.message ?? "unknown error"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleExportYaml = async () => {
    if (!id) return
    setActionLoading("yaml")
    setExportMessage(null)
    try {
      const blob = await projectsApi.exportBlob(id, "yaml")
      triggerDownload(blob, `${project?.meta?.name ?? id}-workflow.yml`)
    } catch (err: any) {
      setExportMessage("YAML export failed: " + (err?.message ?? "unknown error"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleExportNotion = async () => {
    if (!id) return
    setActionLoading("notion")
    setExportMessage(null)
    try {
      const result = await projectsApi.exportNotion(id)
      setExportMessage(`Pushed to Notion \u2014 ${result.mainPageUrl}`)
    } catch (err: any) {
      setExportMessage("Notion export failed: " + (err?.message ?? "unknown error"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleExportGoogleDocs = async () => {
    if (!id) return
    setActionLoading("googleDocs")
    setExportMessage(null)
    try {
      const result = await projectsApi.exportGoogleDocs(id)
      // Open the created doc in a new tab
      window.open(result.documentUrl, "_blank", "noopener,noreferrer")
      setExportMessage(`\u2705 Exported to Google Docs \u2014 doc opened in new tab`)
    } catch (err: any) {
      if (err?.code === "GOOGLE_NOT_CONNECTED") {
        // Offer to connect — fetch the OAuth URL and redirect
        setExportMessage("Connect Google Drive first. Redirecting to authorise...")
        try {
          const { url } = await projectsApi.getGoogleDocsConnectUrl(id)
          setTimeout(() => { window.location.href = url }, 1500)
        } catch {
          setExportMessage("\u274C Connect Google Drive in Settings \u2192 Export Connections.")
        }
      } else {
        setExportMessage("Google Docs export failed: " + (err?.message ?? "unknown error"))
      }
    } finally {
      setActionLoading(null)
    }
  }

  // ── Render loaders / errors ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 shrink-0" />
        <div className="flex flex-1 gap-4 overflow-hidden">
          <Skeleton className="w-52 shrink-0 rounded-xl" />
          <Skeleton className="flex-1 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Project not found</h2>
        <Button asChild className="mt-6"><Link to="/dashboard">Back to Dashboard</Link></Button>
      </div>
    )
  }

  // Show all tabs if pipeline is done, else only those with content
  const availableTabs = project && mapApiStatus(project.status) === "completed"
    ? TABS
    : TABS.filter((t) => !!editedContent[t.key]);

  function getEffectiveOutputTabContent(effectiveOutput: any, tab: DocTab) {
    const tabDef = TABS.find(t => t.key === tab);
    if (!tabDef) return "";
    return effectiveOutput[tabDef.field] ?? "";
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-7xl mx-auto">
      {/* Topbar */}
      <div className="flex items-center justify-between shrink-0 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="-ml-2">
            <Link to={`/projects/${project._id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
            <p className="text-sm text-muted-foreground">{project.meta?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export message */}
          {exportMessage && (
            <span className={`text-xs px-2 py-1 rounded ${exportMessage.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-destructive/10 text-destructive"}`}>
              {exportMessage}
            </span>
          )}

          {activeTab !== "security" && (
            isEditMode ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit
              </Button>
            )
          )}
          <Button
            variant={isChatOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsChatOpen((o) => !o)}
          >
            <Bot className="mr-2 h-4 w-4" /> Ask AI
          </Button>

          {/* Export dropdown */}
          <div className="relative group">
            <Button variant="outline" size="sm" disabled={!!actionLoading}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export
            </Button>
            <div className="absolute right-0 top-9 z-50 hidden group-hover:block w-44 rounded-md border border-border bg-popover shadow-md text-sm overflow-hidden">
              <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors" onClick={handleExportPdf}>
                <Download className="h-4 w-4" /> PDF
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors" onClick={handleExportYaml}>
                <FileCode className="h-4 w-4" /> GitHub Actions YAML
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors" onClick={handleExportNotion}>
                <ExternalLink className="h-4 w-4" /> Push to Notion
              </button>
              <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted transition-colors" onClick={handleExportGoogleDocs}>
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#4285F4" opacity=".3"/><path d="M14 2v6h6" fill="none" stroke="#4285F4" strokeWidth="1.5"/><path d="M16 13H8M16 17H8M10 9H8" fill="none" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Export to Google Docs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout: sidebar + content + chat */}
      <div className="flex flex-1 overflow-hidden border border-border rounded-xl bg-card shadow-sm">
        {/* Sidebar */}
        {isSidebarOpen && (
          <div className="w-56 border-r border-border bg-muted/20 flex flex-col shrink-0">
            <div className="p-4 border-b border-border font-semibold flex items-center justify-between text-sm">
              Contents
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsSidebarOpen(false)}>
                <Menu className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
              {availableTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setIsEditMode(false) }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                      activeTab === tab.key
                        ? tab.key === "security"
                          ? "bg-destructive/10 text-destructive font-medium"
                          : "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
              {availableTabs.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 pt-2">No documentation available yet.</p>
              )}
            </nav>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {!isSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 left-4 z-10 h-8 w-8 rounded-full shadow-sm"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          <div className={cn("flex-1 overflow-y-auto", !isEditMode && "p-6 md:p-10")}>
            <div className={cn("mx-auto", "h-full flex flex-col")}>
              {/* Markdown tabs (readme, api, schema, internal) */}
              {["readme", "api", "schema", "internal"].includes(activeTab) && (
                isEditMode ? (
                  <div className="flex flex-col h-full border-0">
                    <MarkdownToolbar onInsert={insertMarkdown} />
                    <textarea
                      id="markdown-editor"
                      className="flex-1 w-full p-6 font-mono text-sm bg-background border-0 focus:outline-none resize-none"
                      value={editedContent[activeTab]}
                      onChange={(e) => setEditedContent((c) => ({ ...c, [activeTab]: e.target.value }))}
                    />
                  </div>
                ) : effectiveOutput && getEffectiveOutputTabContent(effectiveOutput, activeTab) ? (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <DocRenderer content={getEffectiveOutputTabContent(effectiveOutput, activeTab)} />
                  </div>
                ) : project && mapApiStatus(project.status) === "completed" ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                    <Info className="h-10 w-10 mb-3" />
                    <p>No content generated for this section.</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Waiting for content…
                  </div>
                )
              )}

              {/* Security tab */}
              {activeTab === "security" && (
                editedContent.security ? (
                  <div className="space-y-6">
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <DocRenderer content={editedContent.security} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                    <ShieldAlert className="h-10 w-10 mb-3" />
                    <p>No security report available.</p>
                  </div>
                )
              )}

              {/* Security tab */}
              {activeTab === "other_docs" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Other Documentation</h2>
                    <p className="text-muted-foreground">Attached documentation for this project.</p>
                  </div>
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <DocRenderer content={editedContent.other_docs} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Chat panel */}
        {isChatOpen && (
          <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
            <AIChatPanel context={getCurrentContent()} onClose={() => setIsChatOpen(false)} />
          </div>
        )}
      </div>
    </div>
  )
}
