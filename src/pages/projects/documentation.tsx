import { useState, useEffect, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { useProjectStore, mapApiStatus } from "@/store/projects"
import { projectsApi, versionsApi, customTabsApi, ApiException, ApiProject, ApiShare, sharingApi, portalApi, apiSpecApi, type ApiPortal, type ApiSpec, type ApiProjectEditedSection, type CustomTab } from "@/lib/api"
import { prepareExportData, getExportSummary, getFormattedTabContent } from "@/lib/export-utils"
import { generatePDFHTML } from "@/lib/pdf-generator"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Menu,
  Edit3,
  Bot,
  Save,
  X,
  Info,
  MoreHorizontal,
  FileClock,
  FileDown,
  GitBranch,
  BookMarked,
  Globe,
  Lock,
  Plus,
  AlertTriangle,
  ShieldAlert,
  File,
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreateTabModal } from "@/components/projects/custom-tabs-modals"
import { StatusChangeModal } from "@/components/projects/status-change-modal"
import { StaleSectionBanner } from "@/components/projects/stale-section-banner"
import { StaleDiffModal } from "@/components/projects/stale-diff-modal"
import { MarkdownToolbar } from "@/components/projects/markdown-toolbar"
import { buildTabList, NATIVE_TABS, TAB_TO_SECTION, type NativeTab, type DocTab, type TabDef } from "@/components/projects/documentation-tabs"

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
  const [createTabModalOpen, setCreateTabModalOpen] = useState(false)

  // Global search
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Record<string, { label: string; matches: number; highlights: string[]; firstMatchLine: number }>>({})
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [highlightedText, setHighlightedText] = useState<string>("") // Track text to highlight
  const searchInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Status-change modal
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false)
  const moreDropdownRef = useRef<HTMLDivElement>(null)

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
  const [editedContent, setEditedContent] = useState<Record<string, string>>({
    readme: "",
    api: "",
    schema: "",
    internal: "",
    security: "",
    other_docs: "",
  })

  // Dynamic tabs list (native + custom)
  const [allTabs, setAllTabs] = useState<TabDef[]>(NATIVE_TABS)

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

        // Build dynamic tab list (native + custom)
        const customTabs = data.project.customTabs ?? [];
        const tabs = buildTabList(customTabs);
        setAllTabs(tabs);

        // Fetch portal settings for owners
        if (owner) {
          portalApi.get(data.project._id)
            .then((r) => setPortal(r.portal))
            .catch(() => { })
        }

        // Initialize edited content for native tabs
        const newEditedContent: Record<string, string> = {
          readme: data.effectiveOutput?.readme ?? "",
          api: data.effectiveOutput?.apiReference ?? "",
          schema: data.effectiveOutput?.schemaDocs ?? "",
          internal: data.effectiveOutput?.internalDocs ?? "",
          security: data.effectiveOutput?.securityReport ?? "",
          other_docs: data.effectiveOutput?.otherDocs ?? "",
        };

        // Initialize edited content for custom tabs
        customTabs.forEach((ct) => {
          const tabKey = `custom_${ct._id}`;
          newEditedContent[tabKey] = ct.content ?? "";
        });

        setEditedContent(newEditedContent);

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

        // Fetch version counts for custom tabs
        customTabs.forEach((ct) => {
          const sectionName = `custom_${ct._id}`;
        });

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
    const isCustomTab = activeTab.startsWith("custom_");
    const sectionName = isCustomTab ? activeTab : TAB_TO_SECTION[activeTab as NativeTab];

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
    if (!id || !activeTabDef) return;

    const content = editedContent[activeTab];
    setActionLoading("save");

    try {
      // Handle custom tabs
      if (activeTabDef.isCustom && activeTabDef.customTab) {
        const tabId = activeTabDef.customTab._id;
        const data = await customTabsApi.update(id, tabId, { content });
        setProject(data.project);
        // Reload tabs since content may have changed
        if (data.project.customTabs) {
          setAllTabs(buildTabList(data.project.customTabs));
        }
      } else if (activeTabDef.field) {
        // Handle native tabs
        const sectionName = activeTabDef.field;
        const data = await projectsApi.saveEdit(id, sectionName, content);
        setProject(data.project);
        setEffectiveOutput(data.effectiveOutput as any);
        setEditedSections((data.editedSections as ApiProjectEditedSection[]) ?? []);

        // Update version count for this section
        const vSection = TAB_TO_SECTION[activeTab as NativeTab];
        if (vSection) {
          versionsApi.list(id, vSection).then((r) => {
            setVersionCounts((prev) => ({ ...prev, [vSection]: r.total }));
          }).catch(() => { });
        }
      }

      setIsEditMode(false);
    } catch (err: any) {
      alert(err?.message ?? "Failed to save. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEdit = () => {
    if (project) {
      const effective = (project as any).effectiveOutput || project;
      const newEditedContent: Record<string, string> = {
        readme: effective.readme ?? "",
        api: effective.apiReference ?? "",
        schema: effective.schemaDocs ?? "",
        internal: effective.internalDocs ?? "",
        security: effective.securityReport ?? "",
        other_docs: effective.otherDocs ?? "",
      };

      // Restore custom tab content from project
      if (project.customTabs) {
        project.customTabs.forEach((ct) => {
          const key = `custom_${ct._id}`;
          newEditedContent[key] = ct.content ?? "";
        });
      }

      setEditedContent(newEditedContent);
    }
    setIsEditMode(false);
  };

  // Handle creating a new custom tab
  const handleCreateTab = async (data: { name: string; description: string }) => {
    if (!id) return;

    setActionLoading("create-tab");

    try {
      const result = await customTabsApi.create(id, { name: data.name, description: data.description });
      if (result.project?.customTabs) {
        const tabs = buildTabList(result.project.customTabs);

        setAllTabs(tabs);

        const newTabId = result.project.customTabs[result.project.customTabs.length - 1]?._id;

        if (newTabId) {
          setEditedContent((prev) => ({
            ...prev,
            [`custom_${newTabId}`]: "",
          }));
        }

        setProject(result.project);
        setCreateTabModalOpen(false);
      }
    } catch (err: any) {
      alert(err?.message ?? "Failed to create tab");
    } finally {
      setActionLoading(null);
    }
  };

  // Global search function
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults({});
      setShowSearchResults(false);
      setHighlightedText("");
      return;
    }

    const searchTerm = query.toLowerCase();
    const results: Record<string, { label: string; matches: number; highlights: string[]; firstMatchLine: number }> = {};

    // Search through all tabs
    allTabs.forEach((tab) => {
      const tabContent = editedContent[tab.key] ?? "";
      const tabLabel = tab.label;

      // Search in tab name
      const nameMatches = tabLabel.toLowerCase().includes(searchTerm) ? 1 : 0;

      // Search in content (find matching lines/highlights)
      const highlights: string[] = [];
      let firstMatchLine = -1;
      if (tabContent) {
        const lines = tabContent.split("\n");
        lines.forEach((line, lineIndex) => {
          if (line.toLowerCase().includes(searchTerm)) {
            if (firstMatchLine === -1) firstMatchLine = lineIndex; // Track first match line
            const preview = line.length > 100 ? line.substring(0, 100) + "..." : line;
            highlights.push(preview);
          }
        });
      }

      const contentMatches = highlights.length;
      const totalMatches = nameMatches + contentMatches;

      if (totalMatches > 0) {
        results[tab.key] = {
          label: tabLabel,
          matches: totalMatches,
          highlights: highlights.slice(0, 2), // Show first 2 highlights
          firstMatchLine: firstMatchLine >= 0 ? firstMatchLine : 0,
        };
      }
    });

    setSearchResults(results);
    setShowSearchResults(Object.keys(results).length > 0);
    setHighlightedText(query); // Store search term for highlighting
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    performSearch(value);
  };

  // Handle search result click
  const handleSearchResultClick = (tabKey: DocTab, firstMatchLine: number = 0) => {
    setActiveTab(tabKey);
    setIsEditMode(false);

    // Scroll to the first match after a short delay (to allow tab switch to complete)
    setTimeout(() => {
      scrollToSearchResult(firstMatchLine);
    }, 100);
  };

  // Helper function to scroll to search result
  const scrollToSearchResult = (lineNumber: number) => {
    const content = document.querySelector("[data-content-viewer]");
    if (!content) return;

    // Try to find the text in the content
    const searchTerm = searchQuery.toLowerCase();
    if (!searchTerm) return;

    const walker = document.createTreeWalker(
      content as Node,
      NodeFilter.SHOW_TEXT
    );

    let node;
    let found = false;
    while ((node = walker.nextNode())) {
      if (node.textContent?.toLowerCase().includes(searchTerm)) {
        const range = document.createRange();
        const index = node.textContent.toLowerCase().indexOf(searchTerm);
        range.setStart(node, index);
        range.setEnd(node, index + searchTerm.length);
        range.getBoundingClientRect(); // Get position

        // Scroll into view
        const element = node.parentElement;
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          // Add temporary highlight effect
          const originalBg = element.style.backgroundColor;
          element.style.backgroundColor = "rgba(255, 193, 7, 0.3)";
          setTimeout(() => {
            element.style.backgroundColor = originalBg;
          }, 1500);
          found = true;
          break;
        }
      }
    }
  };

  // ── Version history callbacks ────────────────────────────────────────────

  const handleVersionRestored = (newEffectiveOutput: any, newEditedSections: any[]) => {
    setEffectiveOutput(newEffectiveOutput);
    setEditedSections((newEditedSections as ApiProjectEditedSection[]) ?? []);
    const tabDef = allTabs.find((t: TabDef) => t.key === activeTab);
    if (tabDef) {
      let content = "";
      if (tabDef.isCustom && tabDef.customTab) {
        content = tabDef.customTab.content ?? "";
      } else if (tabDef.field) {
        content = newEffectiveOutput?.[tabDef.field] ?? "";
      }
      setEditedContent((prev) => ({ ...prev, [activeTab]: content }));
    }
    // Refresh the version count for the restored section
    const isCustom = activeTab.startsWith("custom_");
    const sectionName = isCustom ? activeTab : (TAB_TO_SECTION[activeTab as NativeTab] ?? null);
    if (id && sectionName) {
      versionsApi.list(id, sectionName).then((r) => {
        setVersionCounts((prev) => ({ ...prev, [sectionName]: r.total }));
      }).catch(() => { });
    }
  }

  const handleAcceptAI = async () => {
    const isCustom = activeTab.startsWith("custom_");
    const sectionName = isCustom ? activeTab : (TAB_TO_SECTION[activeTab as NativeTab] ?? null);
    if (!id || !sectionName) return;
    setAcceptingAI(true);
    try {
      const result = await projectsApi.acceptAI(id, sectionName);
      setProject(result.project);
      setEffectiveOutput(result.effectiveOutput);
      setEditedSections((result.editedSections as ApiProjectEditedSection[]) ?? []);
      const tabDef = allTabs.find((t: TabDef) => t.key === activeTab);
      if (tabDef) {
        let content = "";
        if (tabDef.isCustom && tabDef.customTab) {
          content = tabDef.customTab.content ?? "";
        } else if (tabDef.field) {
          content = (result.effectiveOutput as any)?.[tabDef.field] ?? "";
        }
        setEditedContent((prev) => ({
          ...prev,
          [activeTab]: content,
        }));
      }
      setShowStaleDiff(false);
      setDismissedStaleTabs((prev) => new Set([...prev, activeTab as string]));
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
    if (!id || !project) return
    setActionLoading("pdf")
    setExportMessage(null)
    try {
      // Prepare comprehensive export data with all tabs
      const exportData = prepareExportData(
        project.meta?.name ?? id,
        (project.meta?.description || "") as string,
        editedContent,
        allTabs
      )

      const summary = getExportSummary(exportData)
      console.debug("📊 PDF Export:", summary)

      // Generate formatted PDF HTML with all sections
      const pdfHtml = generatePDFHTML(exportData, {
        includeTableOfContents: true,
        includeTimestamp: true,
        pageNumbers: true,
        headerFooter: true,
      })

      // Save as HTML file (users can print to PDF from browser)
      const blob = new Blob([pdfHtml], { type: "text/html;charset=utf-8" })
      triggerDownload(blob, `${project?.meta?.name ?? id}-documentation.html`)

      // Show message with count of all sections being exported
      const message = `✓ PDF exported`
      setExportMessage(message)
    } catch (err: any) {
      setExportMessage("PDF export failed: " + (err?.message ?? "unknown error"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleExportYaml = async () => {
    if (!id || !project) return
    setActionLoading("yaml")
    setExportMessage(null)
    try {
      // Prepare comprehensive export data with all tabs (with cleaned content)
      const exportData = prepareExportData(
        project.meta?.name ?? id,
        (project.meta?.description || "") as string,
        editedContent,
        allTabs
      )

      // Format content to remove markdown for cleaner export
      const formattedTabs = getFormattedTabContent(exportData.tabs, "formatted")
      const cleanExportData = {
        ...exportData,
        tabs: formattedTabs,
      }

      const summary = getExportSummary(cleanExportData)
      console.debug("📊 YAML Export:", summary)

      // Export with cleaned data (backend will use it if provided)
      const blob = await projectsApi.exportBlob(id, "yaml", cleanExportData)
      triggerDownload(blob, `${project?.meta?.name ?? id}-workflow.yml`)

      // Show message with count of all sections exported
      const nativeCount = cleanExportData.tabs.filter((t) => !t.isCustom).length
      const customCount = cleanExportData.tabs.filter((t) => t.isCustom).length
      const message = customCount > 0
        ? `✓ Exported to YAML (${nativeCount} sections + ${customCount} custom tab${customCount !== 1 ? "s" : ""})`
        : `✓ Exported to YAML (${cleanExportData.totalTabs} section${cleanExportData.totalTabs !== 1 ? "s" : ""})`
      setExportMessage(message)
    } catch (err: any) {
      setExportMessage("YAML export failed: " + (err?.message ?? "unknown error"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleExportNotion = async () => {
    if (!id || !project) return
    setActionLoading("notion")
    setExportMessage(null)
    try {
      // Prepare comprehensive export data with all tabs
      const exportData = prepareExportData(
        project.meta?.name ?? id,
        (project.meta?.description || "") as string,
        editedContent,
        allTabs
      )

      // Format content to remove markdown for cleaner Notion export
      const formattedTabs = getFormattedTabContent(exportData.tabs, "plain")
      const cleanExportData = {
        ...exportData,
        tabs: formattedTabs,
      }

      const summary = getExportSummary(cleanExportData)
      console.debug("📊 Notion Export:", summary)

      // Log clean data for backend integration
      console.log("📋 Notion export prepared with", cleanExportData.tabs.length, "sections")

      // Export to Notion with cleaned data (backend will use it if provided)
      const result = await projectsApi.exportNotion(id, cleanExportData)

      // Show message with count of all sections exported
      const nativeCount = cleanExportData.tabs.filter((t) => !t.isCustom).length
      const customCount = cleanExportData.tabs.filter((t) => t.isCustom).length
      const message = customCount > 0
        ? `✓ Pushed to Notion (${nativeCount} sections + ${customCount} custom tab${customCount !== 1 ? "s" : ""})`
        : `✓ Pushed to Notion (${cleanExportData.totalTabs} section${cleanExportData.totalTabs !== 1 ? "s" : ""})`
      setExportMessage(message)
    } catch (err: any) {
      setExportMessage("Notion export failed: " + (err?.message ?? "unknown error"))
    } finally {
      setActionLoading(null)
    }
  }

  const handleExportGoogleDocs = async () => {
    if (!id || !project) return
    setActionLoading("googleDocs")
    setExportMessage(null)
    try {
      // Prepare comprehensive export data with all tabs (with cleaned content)
      const exportData = prepareExportData(
        project.meta?.name ?? id,
        (project.meta?.description || "") as string,
        editedContent,
        allTabs
      )

      // Format content to remove markdown for cleaner Google Docs export
      const formattedTabs = getFormattedTabContent(exportData.tabs, "plain")
      const cleanExportData = {
        ...exportData,
        tabs: formattedTabs,
      }

      const summary = getExportSummary(cleanExportData)
      console.debug("Google Docs Export:", summary)

      // Log clean data for backend integration
      console.log("Google Docs export prepared with", cleanExportData.tabs.length, "sections")

      // Export to Google Docs with comprehensive data
      // Pass cleaned data to backend so it exports without markdown
      const result = await projectsApi.exportGoogleDocs(id, cleanExportData)
      // Open the created doc in a new tab
      window.open(result.documentUrl, "_blank", "noopener,noreferrer")

      // Show message with count of all sections exported
      const nativeCount = cleanExportData.tabs.filter((t) => !t.isCustom).length
      const customCount = cleanExportData.tabs.filter((t) => t.isCustom).length
      const message = customCount > 0
        ? `✓ Exported (${nativeCount} sections + ${customCount} custom tab${customCount !== 1 ? "s" : ""})`
        : `✓ Exported (${cleanExportData.totalTabs} section${cleanExportData.totalTabs !== 1 ? "s" : ""})`
      setExportMessage(message)
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
    ? allTabs
    : allTabs.filter((t) => !!editedContent[t.key as string]);

  // Stale section derived state
  const isCustomTab = activeTab.startsWith("custom_");
  const activeSectionName = isCustomTab ? activeTab : (TAB_TO_SECTION[activeTab as NativeTab] ?? null);
  const activeTabDef = allTabs.find((t: TabDef) => t.key === activeTab);
  const staleEntry = activeSectionName
    ? editedSections.find((e) => e.section === activeSectionName && e.stale)
    : null;
  const showStaleBanner = !!staleEntry && !dismissedStaleTabs.has(activeTab as string) && !isEditMode;
  const aiSnapshotContent = activeTabDef && activeTabDef.field && !isCustomTab ? (project?.output as any)?.[activeTabDef.field] ?? "" : "";
  const userEditContent = activeTabDef && activeTabDef.field && !isCustomTab ? (project?.editedOutput as any)?.[activeTabDef.field] ?? "" : "";

  function getEffectiveOutputTabContent(effectiveOutput: any, tab: DocTab) {
    const tabDef = allTabs.find((t: TabDef) => t.key === tab);
    if (!tabDef) return "";

    // For custom tabs, get from the customTab.content directly
    if (tabDef.isCustom && tabDef.customTab) {
      return tabDef.customTab.content ?? "";
    }

    // For native tabs, use field mapping
    if (tabDef.field) {
      return effectiveOutput[tabDef.field] ?? "";
    }

    return "";
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div>
      {/* Top bar */}
      <div className="relative z-20 md:flex items-center justify-between border-b border-border/90 bg-background/50 backdrop-blur-sm container mx-auto max-w-7xl pb-6">
        <div className="flex items-center gap-6 flex-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
            <p className="text-sm text-muted-foreground">{project.meta?.name}</p>
          </div>

          {/* Global Search */}
          <div className="relative flex-1 max-w-xs">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              className="h-10 text-sm rounded-2xl"
            />
            {showSearchResults && Object.keys(searchResults).length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-md border border-border bg-background shadow-lg max-h-64 overflow-y-auto">
                {Object.entries(searchResults).map(([tabKey, { label, matches, highlights, firstMatchLine }]) => (
                  <button
                    key={tabKey}
                    onClick={() => handleSearchResultClick(tabKey as DocTab, firstMatchLine)}
                    className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm border-b border-border/50 last:border-b-0 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{label}</span>
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {matches}
                      </span>
                    </div>
                    {highlights.length > 0 && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{highlights[0]}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {searchQuery && !showSearchResults && (
              <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-md border border-border bg-background shadow-lg p-3 text-center text-sm text-muted-foreground">
                No matches found
              </div>
            )}
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

          {/* ── Primary: Create Custom Tab ── */}
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => setCreateTabModalOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Contents</span>
            </Button>
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
                  <File className="h-4 w-4 text-muted-foreground shrink-0" /> Google Docs
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
                  const isCustomTab = tab.key.startsWith("custom_");
                  const sectionName = isCustomTab ? tab.key : (TAB_TO_SECTION[tab.key as NativeTab] ?? null);
                  const vCount = sectionName && !isCustomTab ? (versionCounts[sectionName] ?? 0) : 0;
                  const isStale = sectionName
                    ? editedSections.some((e) => e.section === sectionName && e.stale)
                    : false;
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
                      {!isCustomTab && sectionName && (() => {
                        const de = getDocEntry(id ?? "", sectionName)
                        return de && de.status !== "draft" ? <DocStatusDot status={de.status} /> : null
                      })()}
                      {isStale && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Stale — AI has newer content" />
                      )}
                      {!isCustomTab && vCount > 1 && (
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
              <div className={cn("flex-1 overflow-y-auto", !isEditMode && "p-6 md:p-10")} data-content-viewer>
                <div className={cn("mx-auto", "h-full flex flex-col")}>
                  {/* Markdown tabs (readme, api, schema, internal, custom) */}
                  {(["readme", "api", "schema", "internal"].includes(activeTab) || activeTab.startsWith("custom_")) && (
                    isEditMode ? (
                      <div className="flex flex-col h-full border-0">
                        <MarkdownToolbar onInsert={insertMarkdown} />
                        <textarea
                          id="markdown-editor"
                          className="flex-1 w-full p-6 font-mono text-sm bg-background border-0 focus:outline-none resize-none"
                          value={editedContent[activeTab as string] ?? ""}
                          onChange={(e) => setEditedContent((c) => ({ ...c, [activeTab]: e.target.value }))}
                        />
                      </div>
                    ) : effectiveOutput && getEffectiveOutputTabContent(effectiveOutput, activeTab) ? (
                      <div className="prose prose-slate dark:prose-invert max-w-none">
                        <DocRenderer content={getEffectiveOutputTabContent(effectiveOutput, activeTab)} />
                      </div>
                    ) : project && mapApiStatus(project.status) === "completed" && !activeTab.startsWith("custom_") ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                        <Info className="h-10 w-10 mb-3" />
                        <p>No content generated for this section.</p>
                      </div>
                    ) : activeTab.startsWith("custom_") ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                        <Info className="h-10 w-10 mb-3" />
                        <p>No content in this tab yet. Click Edit to add content.</p>
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
            customTabs={project?.customTabs}
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

      <CreateTabModal
        isOpen={createTabModalOpen}
        onClose={() => setCreateTabModalOpen(false)}
        onCreate={handleCreateTab}
        isLoading={actionLoading === "create-tab"}
      />
    </div>
  )
}
