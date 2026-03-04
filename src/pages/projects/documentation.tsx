import { useState, useEffect, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { useProjectStore, mapApiStatus } from "@/store/projects"
import { projectsApi, versionsApi, ApiException, ApiProject, ApiShare, sharingApi, portalApi, apiSpecApi, type ApiPortal, type ApiSpec, type ApiProjectEditedSection } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  ArrowLeft,
  Book,
  ShieldAlert,
  FileCode2,
  Database,
  BookOpen,
  Menu,
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
  Info,
  FileCode,
  Eye,
  MoreHorizontal,
  FileClock,
  FileDown,
  GitBranch,
  BookMarked,
  Globe,
  Lock,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Markdown from "react-markdown"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { AIChatPanel } from "@/components/projects/ai-chat"
import { DocRenderer } from "@/components/projects/DocRenderer"
import { DocStatusDot, DOC_STATUS_ORDER, DOC_STATUS_CONFIG } from "@/components/projects/doc-status"
import { VersionHistoryPanel } from "@/components/projects/version-history-panel"
import { OtherDocsPanel } from "@/components/projects/other-docs-panel"
import { useDocTrackerStore } from "@/store/doc-tracker"
import { useAuthStore } from "@/store/auth"
import { PortalSettingsModal } from "@/components/projects/portal-settings-modal"
import { ApiSpecImportModal } from "@/components/projects/api-spec-import-modal"
import { ApiReferenceViewer } from "@/components/projects/api-reference-viewer"
import { useSubscriptionStore, meetsMinPlan } from "@/store/subscription"
import { UpgradeModal } from "@/components/billing/UpgradeModal"
import Loader1 from "@/components/ui/loader1"

// ── Status-change modal ───────────────────────────────────────────────────────
interface StatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  pendingStatus: import("@/store/doc-tracker").DocStatus | null
  onConfirm: (note: string, taggedMember?: string) => void
  members: ApiShare[]
  loadingMembers: boolean
}

function StatusChangeModal({ isOpen, onClose, pendingStatus, onConfirm, members, loadingMembers }: StatusChangeModalProps) {
  const [note, setNote] = useState("")
  const [tagged, setTagged] = useState<string>("")

  // reset fields each time the modal opens
  useEffect(() => {
    if (isOpen) { setNote(""); setTagged("") }
  }, [isOpen])

  if (!pendingStatus) return null
  const cfg = DOC_STATUS_CONFIG[pendingStatus]
  const isChangesRequested = pendingStatus === "changes_requested"
  const Icon = cfg.icon

  const activeMembers = members.filter((m) => m.status === "accepted")

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4 shrink-0", cfg.iconClass)} />
            Set status to "{cfg.label}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none min-h-[80px] placeholder:text-muted-foreground"
              placeholder={isChangesRequested ? "Describe what needs to change..." : "Add a note for this status change..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Tag member — only for changes_requested */}
          {isChangesRequested && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assign to <span className="text-muted-foreground font-normal">(optional)</span></label>
              {loadingMembers ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader1 className="h-3 w-3" /> Loading members...
                </div>
              ) : activeMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No invited members yet.</p>
              ) : (
                <div className="space-y-1">
                  {activeMembers.map((m) => {
                    const display = m.inviteeUser?.name ?? m.inviteeEmail
                    const val = m.inviteeEmail
                    return (
                      <label
                        key={m._id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                          tagged === val
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted",
                        )}
                      >
                        <input
                          type="radio"
                          name="tagged-member"
                          className="h-3.5 w-3.5 accent-primary"
                          checked={tagged === val}
                          onChange={() => setTagged(tagged === val ? "" : val)}
                          onClick={() => { if (tagged === val) setTagged("") }}
                        />
                        <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-primary">{display[0].toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{display}</div>
                          {m.inviteeUser?.name && <div className="text-xs text-muted-foreground truncate">{m.inviteeEmail}</div>}
                        </div>
                        <span className="ml-auto text-[10px] text-muted-foreground capitalize">{m.role}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(note.trim(), tagged || undefined)}>
            <Icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            {cfg.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

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

// Section key → DocumentVersion section name (null = not versioned)
const TAB_TO_SECTION: Partial<Record<DocTab, string>> = {
  readme: "readme",
  api: "apiReference",
  schema: "schemaDocs",
  internal: "internalDocs",
  security: "securityReport",
}

// ── Stale section banner ──────────────────────────────────────────────────────────────
function StaleSectionBanner({
  changeSummary,
  onViewDiff,
  onAcceptAI,
  onDismiss,
  accepting,
}: {
  changeSummary: string | null
  onViewDiff: () => void
  onAcceptAI: () => void
  onDismiss: () => void
  accepting: boolean
}) {
  return (
    <div className="mx-6 mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col gap-2 shrink-0">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            AI has updated this section since your last edit
          </p>
          {changeSummary && (
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5 line-clamp-2">{changeSummary}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 pl-6 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-amber-500/30 hover:bg-amber-500/10"
          onClick={onViewDiff}
        >
          <Eye className="mr-1.5 h-3 w-3" /> View AI version
        </Button>
        <Button size="sm" className="h-7 text-xs" disabled={accepting} onClick={onAcceptAI}>
          {accepting && <Loader1 className="mr-1.5 h-3 w-3 " />}
          Accept AI version
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onDismiss}>
          Keep my edit
        </Button>
      </div>
    </div>
  )
}

// ── Stale diff modal ─────────────────────────────────────────────────────────────
function StaleDiffModal({
  sectionLabel,
  userContent,
  aiContent,
  onClose,
  onAcceptAI,
  accepting,
}: {
  sectionLabel: string
  userContent: string
  aiContent: string
  onClose: () => void
  onAcceptAI: () => void
  accepting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h2 className="font-semibold text-sm">Compare versions — {sectionLabel}</h2>
          <p className="text-xs text-muted-foreground">Left: your edit · Right: new AI version</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={accepting} onClick={onAcceptAI}>
            {accepting && <Loader1 className="mr-1.5 h-3 w-3 " />}
            Accept AI version
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto border-r border-border p-6">
          <div className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Edit</div>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <DocRenderer content={userContent} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-primary/[0.02]">
          <div className="mb-3 text-xs font-semibold text-primary uppercase tracking-wider">New AI Version</div>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <DocRenderer content={aiContent} />
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const { getEntry: getDocEntry, setStatus: setDocStatus, setAssignee: setDocAssignee } = useDocTrackerStore()
  const { user } = useAuthStore()

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [editedSections, setEditedSections] = useState<ApiProjectEditedSection[]>([])
  const [versionCounts, setVersionCounts] = useState<Record<string, number>>({})
  const [dismissedStaleTabs, setDismissedStaleTabs] = useState<Set<string>>(new Set())
  const [showStaleDiff, setShowStaleDiff] = useState(false)
  const [staleSummary, setStaleSummary] = useState<string | null>(null)
  const [acceptingAI, setAcceptingAI] = useState(false)

  // Status-change modal
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!statusDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false)
      }
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [statusDropdownOpen])
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false)
  const moreDropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!moreDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false)
      }
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [moreDropdownOpen])
  const [statusModal, setStatusModal] = useState<{
    open: boolean
    pendingStatus: import("@/store/doc-tracker").DocStatus | null
  }>({ open: false, pendingStatus: null })
  const [projectMembers, setProjectMembers] = useState<ApiShare[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Portal
  const [portal, setPortal] = useState<ApiPortal | null>(null)
  const [portalModalOpen, setPortalModalOpen] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

  // Subscription gates
  const { subscription } = useSubscriptionStore()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<{ name: string; plan: string; description?: string }>({ name: "", plan: "starter" })
  function requirePlan(featureName: string, plan: string, description: string, cb: () => void) {
    if (!meetsMinPlan(subscription, plan)) {
      setUpgradeFeature({ name: featureName, plan, description })
      setUpgradeOpen(true)
      return
    }
    cb()
  }

  // API Spec (FT4)
  const [apiSpec, setApiSpec] = useState<ApiSpec | null>(null)
  const [apiSpecLoading, setApiSpecLoading] = useState(false)
  const [apiSpecImportOpen, setApiSpecImportOpen] = useState(false)
  const [apiSubTab, setApiSubTab] = useState<"document" | "spec">("document")
  const [syncingSpec, setSyncingSpec] = useState(false)

  // Editable content per tab (initialized from project data)
  const [editedContent, setEditedContent] = useState<Record<DocTab, string>>({
    readme: "",
    api: "",
    schema: "",
    internal: "",
    security: "",
    other_docs: "",
  })

  // Load project on mount + fetch version counts
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getProjectData(id)
      .then(async (data) => {
        setProject(data.project);
        setEffectiveOutput(data.effectiveOutput);
        setEditedSections((data.editedSections as ApiProjectEditedSection[]) ?? []);
        const owner = data.shareRole === 'owner'
        setIsOwner(owner)
        // Fetch portal settings for owners
        if (owner) {
          portalApi.get(data.project._id)
            .then((r) => setPortal(r.portal))
            .catch(() => { })
        }
        setEditedContent({
          readme: data.effectiveOutput?.readme ?? "",
          api: data.effectiveOutput?.apiReference ?? "",
          schema: data.effectiveOutput?.schemaDocs ?? "",
          internal: data.effectiveOutput?.internalDocs ?? "",
          security: data.effectiveOutput?.securityReport ?? "",
          other_docs: data.effectiveOutput?.otherDocs ?? "",
        });
        // Pre-fetch version counts for all versioned sections
        const sections = ["readme", "internalDocs", "apiReference", "schemaDocs", "securityReport"];
        const counts: Record<string, number> = {};
        await Promise.allSettled(
          sections.map(async (s) => {
            try {
              const r = await versionsApi.list(data.project._id, s);
              if (r.total > 0) counts[s] = r.total;
            } catch { /* ignore */ }
          }),
        );
        setVersionCounts(counts);

        // Load API spec (FT4)
        apiSpecApi.get(data.project._id)
          .then((r) => setApiSpec(r.spec))
          .catch(() => { }) // not fatal if spec not found
      })
      .finally(() => setIsLoading(false));
  }, [id, getProjectData])

  // Fetch change summary for stale section when it becomes active
  useEffect(() => {
    const sectionName = TAB_TO_SECTION[activeTab];
    const isStale = sectionName
      ? editedSections.some((e) => e.section === sectionName && e.stale)
      : false;
    if (!isStale || !id || !sectionName) { setStaleSummary(null); return; }
    versionsApi
      .list(id, sectionName)
      .then((r) => {
        const latestAi = r.versions.find((v) => v.source !== "user");
        setStaleSummary(latestAi?.meta?.changeSummary ?? null);
      })
      .catch(() => setStaleSummary(null));
  }, [activeTab, editedSections, id])

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

  const handleSave = async () => {
    if (!id || !activeTabDef) return
    const sectionName = activeTabDef.field  // e.g. "apiReference", "readme"
    const content = editedContent[activeTab]
    setActionLoading("save")
    try {
      const data = await projectsApi.saveEdit(id, sectionName, content)
      setProject(data.project)
      setEffectiveOutput(data.effectiveOutput as any)
      setEditedSections((data.editedSections as ApiProjectEditedSection[]) ?? [])
      // update version count for this section
      const vSection = TAB_TO_SECTION[activeTab]
      if (vSection) {
        versionsApi.list(id, vSection).then((r) => {
          setVersionCounts((prev) => ({ ...prev, [vSection]: r.total }))
        }).catch(() => { })
      }
      setIsEditMode(false)
    } catch (err: any) {
      alert(err?.message ?? "Failed to save. Please try again.")
    } finally {
      setActionLoading(null)
    }
  }

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

  // ── Version history callbacks ────────────────────────────────────────────

  const handleVersionRestored = (newEffectiveOutput: any, newEditedSections: any[]) => {
    setEffectiveOutput(newEffectiveOutput);
    setEditedSections((newEditedSections as ApiProjectEditedSection[]) ?? []);
    const tabDef = TABS.find((t) => t.key === activeTab);
    if (tabDef) {
      setEditedContent((prev) => ({ ...prev, [activeTab]: newEffectiveOutput?.[tabDef.field] ?? "" }));
    }
    // Refresh the version count for the restored section
    const sectionName = TAB_TO_SECTION[activeTab];
    if (id && sectionName) {
      versionsApi.list(id, sectionName).then((r) => {
        setVersionCounts((prev) => ({ ...prev, [sectionName]: r.total }));
      }).catch(() => { });
    }
  }

  const handleAcceptAI = async () => {
    const sectionName = TAB_TO_SECTION[activeTab];
    if (!id || !sectionName) return;
    setAcceptingAI(true);
    try {
      const result = await projectsApi.acceptAI(id, sectionName);
      setProject(result.project);
      setEffectiveOutput(result.effectiveOutput);
      setEditedSections((result.editedSections as ApiProjectEditedSection[]) ?? []);
      const tabDef = TABS.find((t) => t.key === activeTab);
      if (tabDef) {
        setEditedContent((prev) => ({
          ...prev,
          [activeTab]: (result.effectiveOutput as any)?.[tabDef.field] ?? "",
        }));
      }
      setShowStaleDiff(false);
      setDismissedStaleTabs((prev) => new Set([...prev, activeTab]));
    } catch { /* ignore */ }
    finally { setAcceptingAI(false); }
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

  // Stale section derived state
  const activeSectionName = TAB_TO_SECTION[activeTab] ?? null
  const activeTabDef = TABS.find((t) => t.key === activeTab)
  const staleEntry = activeSectionName
    ? editedSections.find((e) => e.section === activeSectionName && e.stale)
    : null
  const showStaleBanner = !!staleEntry && !dismissedStaleTabs.has(activeTab) && !isEditMode
  const aiSnapshotContent = activeTabDef ? (project?.output as any)?.[activeTabDef.field] ?? "" : ""
  const userEditContent = activeTabDef ? (project?.editedOutput as any)?.[activeTabDef.field] ?? "" : ""

  function getEffectiveOutputTabContent(effectiveOutput: any, tab: DocTab) {
    const tabDef = TABS.find(t => t.key === tab);
    if (!tabDef) return "";
    return effectiveOutput[tabDef.field] ?? "";
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div>
      {/* Top bar */}
      <div className="relative z-20 md:flex items-center justify-between border-b border-border/90 bg-background/50 backdrop-blur-sm container mx-auto max-w-7xl pb-6">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
            <p className="text-sm text-muted-foreground">{project.meta?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export / action feedback message */}
          {exportMessage && (
            <span className={`text-xs px-2 py-1 rounded ${exportMessage.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-destructive/10 text-destructive"}`}>
              {exportMessage}
            </span>
          )}

          {/* ── Primary: Edit / Cancel / Save ── */}
          {activeTab !== "security" && activeTab !== "other_docs" && (
            isEditMode ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1.5">Cancel</span>
                </Button>
                <Button size="sm" onClick={handleSave} disabled={actionLoading === "save"}>
                  {actionLoading === "save"
                    ? <Loader1 className="h-4 w-4 " />
                    : <Save className="h-4 w-4" />}
                  <span className="hidden sm:inline ml-1.5">Save</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                <Edit3 className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">Edit</span>
              </Button>
            )
          )}

          {/* ── Primary: Ask AI ── */}
          <Button
            variant={isChatOpen ? "default" : "outline"}
            size="sm"
            onClick={() => requirePlan("AI Assistant", "pro", "Chat with your codebase using AI to get instant answers and generate documentation.", () => {
              setIsChatOpen((o) => !o)
              if (isHistoryOpen) setIsHistoryOpen(false)
            })}
          >
            {!meetsMinPlan(subscription, "pro") && <Lock className="h-3.5 w-3.5 mr-1 opacity-50" />}
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline ml-1.5">Ask AI</span>
          </Button>

          {/* ── Primary: Status selector ── */}
          {activeSectionName && id && (() => {
            const currentStatus = getDocEntry(id, activeSectionName)?.status ?? "draft"
            const cfg = DOC_STATUS_CONFIG[currentStatus]
            const StatusIcon = cfg.icon

            return (
              <div className="relative" ref={statusDropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setStatusDropdownOpen((o) => !o)}
                >
                  <StatusIcon className={cn("h-4 w-4", cfg.iconClass)} />
                  <span className="hidden sm:inline">{cfg.label}</span>
                </Button>

                {statusDropdownOpen && (
                  <div className="absolute left-0 top-9 z-50 flex flex-col w-48 rounded-lg border border-border bg-background shadow-lg text-sm overflow-hidden">
                    {DOC_STATUS_ORDER.map((s) => {
                      const c = DOC_STATUS_CONFIG[s]
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setStatusDropdownOpen(false)

                            // load members once per project
                            if (projectMembers.length === 0 && !loadingMembers) {
                              setLoadingMembers(true)
                              sharingApi.listAccess(id)
                                .then((r) => setProjectMembers(r.shares))
                                .catch(() => { })
                                .finally(() => setLoadingMembers(false))
                            }

                            setStatusModal({ open: true, pendingStatus: s })
                          }}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted text-left",
                            s === currentStatus && "bg-muted font-medium",
                          )}
                        >
                          <c.icon className={cn("h-3.5 w-3.5 shrink-0", c.iconClass)} />
                          <span>{c.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Primary: Portal Publish button (owners only) ── */}
          {isOwner && id && (
            <Button
              variant={portal?.isPublished ? "default" : "outline"}
              size="sm"
              onClick={() => requirePlan("Public Portal", "starter", "Publish your documentation as a shareable public portal.", () => setPortalModalOpen(true))}
              className="gap-1.5"
            >
              {!meetsMinPlan(subscription, "starter") && <Lock className="h-3.5 w-3.5 opacity-50" />}
              <Globe className={cn("h-4 w-4", portal?.isPublished && "animate-none")} />
              <span className="hidden sm:inline">{portal?.isPublished ? "Published" : "Publish"}</span>
            </Button>
          )}

          {/* ── More dropdown (History + exports) ── */}
          <div className="relative" ref={moreDropdownRef}>
            <Button
              variant="outline"
              size="sm"
              disabled={!!actionLoading}
              className="gap-1.5"
              onClick={() => setMoreDropdownOpen((o) => !o)}
            >
              {actionLoading
                ? <Loader1 className="h-4 w-4 " />
                : <MoreHorizontal className="h-4 w-4" />}
            </Button>

            {moreDropdownOpen && (
              <div className="absolute right-0 top-9 z-50 flex flex-col w-62 rounded-lg border border-border bg-background shadow-lg text-sm overflow-hidden">
                {/* History */}
                <button
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors",
                    !activeSectionName && "opacity-40 pointer-events-none",
                    isHistoryOpen && "bg-muted font-medium",
                  )}
                  onClick={() => {
                    setMoreDropdownOpen(false)
                    requirePlan("Version History", "starter", "Access the full version history for each documentation section.", () => {
                      setIsHistoryOpen((o) => !o)
                      if (isChatOpen) setIsChatOpen(false)
                    })
                  }}
                  disabled={!activeSectionName}
                >
                  <FileClock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-left">History</span>
                  {activeSectionName && (versionCounts[activeSectionName] ?? 0) > 0 && (
                    <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-muted-foreground/15 text-muted-foreground">
                      {versionCounts[activeSectionName]}
                    </span>
                  )}
                </button>

                <div className="mx-3 my-1 border-t border-border" />
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Export</div>

                <button className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors" onClick={() => { setMoreDropdownOpen(false); requirePlan("PDF Export", "starter", "Export your documentation as a PDF file.", handleExportPdf) }}>
                  <FileDown className="h-4 w-4 text-muted-foreground shrink-0" /> PDF
                  {!meetsMinPlan(subscription, "starter") && <Lock className="h-3 w-3 ml-auto opacity-40" />}
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors" onClick={() => { setMoreDropdownOpen(false); requirePlan("GitHub Actions Export", "team", "Export your documentation as a GitHub Actions YAML workflow.", handleExportYaml) }}>
                  <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" /> GitHub Actions (YAML)
                  {!meetsMinPlan(subscription, "team") && <Lock className="h-3 w-3 ml-auto opacity-40" />}
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors" onClick={() => { setMoreDropdownOpen(false); requirePlan("Notion Export", "team", "Push your documentation directly to Notion.", handleExportNotion) }}>
                  <BookMarked className="h-4 w-4 text-muted-foreground shrink-0" /> Push to Notion
                  {!meetsMinPlan(subscription, "team") && <Lock className="h-3 w-3 ml-auto opacity-40" />}
                </button>
                <button className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors" onClick={() => { setMoreDropdownOpen(false); requirePlan("Google Docs Export", "pro", "Export your documentation to Google Docs.", handleExportGoogleDocs) }}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#4285F4" opacity=".3" /><path d="M14 2v6h6" fill="none" stroke="#4285F4" strokeWidth="1.5" /><path d="M16 13H8M16 17H8M10 9H8" fill="none" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  Google Docs
                  {!meetsMinPlan(subscription, "pro") && <Lock className="h-3 w-3 ml-auto opacity-40" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-7xl mx-auto z-10">
        {/* Main layout: sidebar + content + chat */}
        <div className="flex flex-1 overflow-hidden border border-border rounded-2xl bg-card mt-6">
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
                  const sectionName = TAB_TO_SECTION[tab.key]
                  const vCount = sectionName ? (versionCounts[sectionName] ?? 0) : 0
                  const isStale = sectionName
                    ? editedSections.some((e) => e.section === sectionName && e.stale)
                    : false
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
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{tab.label}</span>
                      {sectionName && (() => {
                        const de = getDocEntry(id ?? "", sectionName)
                        return de && de.status !== "draft" ? <DocStatusDot status={de.status} /> : null
                      })()}
                      {isStale && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Stale — AI has newer content" />
                      )}
                      {vCount > 1 && (
                        <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-muted-foreground/15 text-muted-foreground shrink-0">
                          {vCount > 20 ? "20+" : vCount}
                        </span>
                      )}
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

            {/* Stale section banner */}
            {showStaleBanner && (
              <StaleSectionBanner
                changeSummary={staleSummary}
                accepting={acceptingAI}
                onViewDiff={() => setShowStaleDiff(true)}
                onAcceptAI={handleAcceptAI}
                onDismiss={() => setDismissedStaleTabs((prev) => new Set([...prev, activeTab]))}
              />
            )}

            {/* ── API sub-tabs: Document / Api Spec ── */}
            {activeTab === "api" && (
              <div className="flex border-b border-border px-4 shrink-0 mt-3">
                <button
                  onClick={() => setApiSubTab("document")}
                  className={cn(
                    "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                    apiSubTab === "document"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Document
                </button>
                <button
                  onClick={() => setApiSubTab("spec")}
                  className={cn(
                    "px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                    apiSubTab === "spec"
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Api Spec
                </button>
              </div>
            )}

            {/* ── API Spec viewer (shown when Api Spec sub-tab is active) ── */}
            {activeTab === "api" && apiSubTab === "spec" && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {apiSpec ? (
                  <ApiReferenceViewer
                    spec={apiSpec}
                    projectId={id ?? ""}
                    canEdit={true}
                    onReimport={() => requirePlan("API Spec Importer", "pro", "Import and manage OpenAPI specifications.", () => setApiSpecImportOpen(true))}
                    onSync={apiSpec.source === "url" ? async () => {
                      if (!id) return
                      setSyncingSpec(true)
                      try { const r = await apiSpecApi.sync(id); setApiSpec(r.spec) }
                      catch { /* ignore */ } finally { setSyncingSpec(false) }
                    } : undefined}
                    onDelete={isOwner ? async () => {
                      if (!id) return
                      await apiSpecApi.delete(id).catch(() => { })
                      setApiSpec(null)
                    } : undefined}
                    isSyncing={syncingSpec}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground">
                    <Info className="h-8 w-8" />
                    <p className="text-sm">No API spec imported yet.</p>
                    <Button size="sm" variant="outline" onClick={() => requirePlan("API Spec Importer", "pro", "Import and manage OpenAPI specifications for your project.", () => setApiSpecImportOpen(true))}>
                      {!meetsMinPlan(subscription, "pro") && <Lock className="h-3.5 w-3.5 mr-1 opacity-50" />}
                      Import Spec
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Normal content (all tabs; hidden when API Spec sub-tab is open) */}
            {!(activeTab === "api" && apiSubTab === "spec") && (
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
                        <Loader1 className="h-5 w-5  mr-2" /> Waiting for content…
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

                  {/* Other Docs tab — file attachments panel */}
                  {activeTab === "other_docs" && project && (
                    <OtherDocsPanel projectId={project._id} />
                  )}
                </div>
              </div>
            )} {/* end: !(api && apiSubTab === spec) */}
          </div>

          {/* Version history panel */}
          {isHistoryOpen && project && activeSectionName && (
            <div className="w-80 shrink-0 flex flex-col overflow-hidden">
              <VersionHistoryPanel
                projectId={project._id}
                section={activeSectionName}
                sectionLabel={activeTabDef?.label ?? activeTab}
                onClose={() => setIsHistoryOpen(false)}
                onRestored={handleVersionRestored}
              />
            </div>
          )}

          {/* AI Chat panel */}
          {isChatOpen && project && (
            <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
              <AIChatPanel
                project={project}
                activeSection={activeSectionName ?? ""}
                activeSectionContent={getCurrentContent()}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          )}
        </div>

        {/* Stale diff modal (full-screen overlay) */}
        {showStaleDiff && activeTabDef && (
          <StaleDiffModal
            sectionLabel={activeTabDef.label}
            userContent={userEditContent}
            aiContent={aiSnapshotContent}
            accepting={acceptingAI}
            onClose={() => setShowStaleDiff(false)}
            onAcceptAI={handleAcceptAI}
          />
        )}

        {/* Portal settings modal */}
        {isOwner && id && (
          <PortalSettingsModal
            isOpen={portalModalOpen}
            onClose={() => setPortalModalOpen(false)}
            projectId={id}
            initialPortal={portal}
            onPublishChange={(updated) => setPortal(updated)}
          />
        )}

        {/* Status-change modal */}
        {id && (
          <ApiSpecImportModal
            projectId={id}
            open={apiSpecImportOpen}
            onClose={() => setApiSpecImportOpen(false)}
            existingSpec={apiSpec}
            onImported={(spec) => {
              setApiSpec(spec)
              setApiSubTab("spec")
            }}
          />
        )}

        <StatusChangeModal
          isOpen={statusModal.open}
          pendingStatus={statusModal.pendingStatus}
          members={projectMembers}
          loadingMembers={loadingMembers}
          onClose={() => setStatusModal({ open: false, pendingStatus: null })}
          onConfirm={(note, taggedMember) => {
            if (!id || !activeSectionName || !statusModal.pendingStatus) return
            setDocStatus(id, activeSectionName, statusModal.pendingStatus, user?.name ?? user?.email, note || undefined)
            if (taggedMember) setDocAssignee(id, activeSectionName, taggedMember)
            setStatusModal({ open: false, pendingStatus: null })
          }}
        />

        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          featureName={upgradeFeature.name}
          requiredPlan={upgradeFeature.plan}
          description={upgradeFeature.description}
        />
      </div>
    </div>
  )
}
