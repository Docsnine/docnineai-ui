import { useState, useEffect, useCallback } from "react"
import {
    Globe, Lock, Eye, EyeOff, Copy, Check, ExternalLink,
    Settings, ChevronDown, Palette, FileText, Link as LinkIcon,
    AlertTriangle, Globe2, Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
    portalApi,
    type ApiPortal,
    type PortalBranding,
    type PortalSectionConfig,
    type PortalSectionKey,
    type PortalSectionVisibility,
    type PortalAccessMode,
    PORTAL_SECTION_KEYS,
    PORTAL_SECTION_LABELS,
    type CustomTab,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import Loader1 from "../ui/loader1"

// ── Constants ──────────────────────────────────────────────────────────────

const TAB_IDS = ["general", "sections", "branding", "domain"] as const
type TabId = typeof TAB_IDS[number]

const TAB_LABELS: Record<TabId, string> = {
    general: "General",
    sections: "Sections",
    branding: "Branding",
    domain: "Custom Domain",
}

const VISIBILITY_OPTIONS: { value: PortalSectionVisibility; label: string; description: string }[] = [
    { value: "public", label: "Public", description: "Visible to all portal visitors" },
    { value: "internal", label: "Internal only", description: "Hidden from the portal entirely" },
    { value: "coming_soon", label: "Coming soon", description: "Shows as locked in the sidebar" },
]

const FRONTEND_ORIGIN = import.meta.env.VITE_APP_URL || window.location.origin

// ── Helpers ────────────────────────────────────────────────────────────────

function buildPortalUrl(slug: string): string {
    return `${FRONTEND_ORIGIN}/docs/${slug}`
}

function getEffectiveVisibility(sections: PortalSectionConfig[], key: PortalSectionKey): PortalSectionVisibility {
    return sections.find((s) => s.sectionKey === key)?.visibility ?? "public"
}

// ── Component ──────────────────────────────────────────────────────────────

interface PortalSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    /** Optional initial portal data (to avoid an extra fetch when already loaded) */
    initialPortal?: ApiPortal | null
    /** Optional custom tabs from the project (to include in publishable sections) */
    customTabs?: CustomTab[]
    onPublishChange?: (portal: ApiPortal) => void
}

export function PortalSettingsModal({
    isOpen,
    onClose,
    projectId,
    initialPortal,
    customTabs = [],
    onPublishChange,
}: PortalSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<TabId>("general")
    const [portal, setPortal] = useState<ApiPortal | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)

    // Draft state — uncommitted edits
    const [draftSections, setDraftSections] = useState<PortalSectionConfig[]>([])
    const [draftBranding, setDraftBranding] = useState<PortalBranding>({})
    const [draftSeo, setDraftSeo] = useState<{ seoTitle: string; seoDescription: string }>({
        seoTitle: "",
        seoDescription: "",
    })
    const [draftDomain, setDraftDomain] = useState("")
    const [draftAccessMode, setDraftAccessMode] = useState<PortalAccessMode>("public")
    const [draftPassword, setDraftPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [passwordChanged, setPasswordChanged] = useState(false)

    // ── Load portal settings ──────────────────────────────────────
    const loadPortal = useCallback(async () => {
        if (!projectId) return
        setLoading(true)
        setError(null)
        try {
            const res = await portalApi.get(projectId)
            const p = res.portal
            setPortal(p)
            if (p) {
                setDraftSections(p.sections ?? [])
                setDraftBranding(p.branding ?? {})
                setDraftSeo({ seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "" })
                setDraftDomain(p.customDomain ?? "")
                setDraftAccessMode(p.accessMode ?? "public")
            }
        } catch {
            setError("Could not load portal settings.")
        } finally {
            setLoading(false)
        }
    }, [projectId])

    useEffect(() => {
        if (!isOpen) return
        if (initialPortal !== undefined) {
            // Prefer the caller-provided data to avoid redundant API call
            setPortal(initialPortal)
            if (initialPortal) {
                setDraftSections(initialPortal.sections ?? [])
                setDraftBranding(initialPortal.branding ?? {})
                setDraftSeo({ seoTitle: initialPortal.seoTitle ?? "", seoDescription: initialPortal.seoDescription ?? "" })
                setDraftDomain(initialPortal.customDomain ?? "")
                setDraftAccessMode(initialPortal.accessMode ?? "public")
            }
        } else {
            loadPortal()
        }
    }, [isOpen, initialPortal, loadPortal])

    // ── Section visibility setter ──────────────────────────────────
    function setSectionVisibility(key: PortalSectionKey | string, vis: PortalSectionVisibility) {
        setDraftSections((prev) => {
            const existing = prev.find((s) => s.sectionKey === key)
            if (existing) return prev.map((s) => s.sectionKey === key ? { ...s, visibility: vis } : s)
            return [...prev, { sectionKey: key as PortalSectionKey, visibility: vis }]
        })
    }

    // ── Get all publishable sections (native + custom tabs) ──────
    const getAllPublishableSections = () => {
        const sections: Array<{ key: string; label: string; isCustom: boolean }> = []
        // Add native sections
        PORTAL_SECTION_KEYS.forEach((key) => {
            sections.push({ key, label: PORTAL_SECTION_LABELS[key], isCustom: false })
        })
        // Add custom tabs
        customTabs.forEach((tab) => {
            sections.push({ key: `custom_${tab._id}`, label: tab.name, isCustom: true })
        })
        return sections
    }

    // ── Save settings ──────────────────────────────────────────────
    async function handleSave() {
        setSaving(true)
        setError(null)
        setSaveSuccess(false)
        try {
            const body: Parameters<typeof portalApi.update>[1] = {
                branding: draftBranding,
                sections: draftSections,
                seoTitle: draftSeo.seoTitle || undefined,
                seoDescription: draftSeo.seoDescription || undefined,
                customDomain: draftDomain || undefined,
                accessMode: draftAccessMode,
            }
            if (passwordChanged) {
                body.password = draftPassword || null
                setPasswordChanged(false)
            }
            const res = await portalApi.update(projectId, body)
            setPortal(res.portal)
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 2500)
        } catch {
            setError("Failed to save portal settings.")
        } finally {
            setSaving(false)
        }
    }

    // ── Toggle publish ─────────────────────────────────────────────
    async function handleTogglePublish() {
        setPublishing(true)
        setError(null)
        try {
            const res = await portalApi.togglePublish(projectId)
            setPortal(res.portal)
            onPublishChange?.(res.portal)
        } catch {
            setError("Failed to update publish state.")
        } finally {
            setPublishing(false)
        }
    }

    // ── Copy URL ───────────────────────────────────────────────────
    function handleCopy() {
        if (!portal?.slug) return
        navigator.clipboard.writeText(buildPortalUrl(portal.slug))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // ── Render ─────────────────────────────────────────────────────
    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl w-full p-0 gap-0">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <DialogHeader className="space-y-0">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Globe className="h-4 w-4 text-primary" />
                            Public Portal Settings
                        </DialogTitle>
                    </DialogHeader>

                    {/* Publish toggle */}
                    <div className="flex items-center gap-3">
                        {portal?.isPublished && portal.slug && (
                            <a
                                href={buildPortalUrl(portal.slug)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View portal
                            </a>
                        )}
                        <Button
                            size="sm"
                            variant={portal?.isPublished ? "destructive" : "default"}
                            onClick={handleTogglePublish}
                            disabled={publishing || loading}
                            className="min-w-[110px]"
                        >
                            {publishing ? (
                                <Loader1 className="h-3.5 w-3.5 mr-1.5 " />
                            ) : portal?.isPublished ? (
                                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                            ) : (
                                <Globe className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {portal?.isPublished ? "Unpublish" : "Publish"}
                        </Button>
                    </div>
                </div>

                {/* Published URL banner */}
                {portal?.isPublished && portal.slug && (
                    <div className="flex items-center gap-2 px-6 py-2.5 bg-primary/5 border-b border-border">
                        <Globe2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs text-muted-foreground flex-1 truncate">{buildPortalUrl(portal.slug)}</span>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                        >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                )}

                {/* Loading / error */}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader1 className="h-6 w-6  text-muted-foreground" />
                    </div>
                )}

                {!loading && (
                    <>
                        {/* Tabs */}
                        <div className="flex gap-0 border-b border-border px-6 overflow-x-auto">
                            {TAB_IDS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                        activeTab === tab
                                            ? "border-primary text-foreground"
                                            : "border-transparent text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {TAB_LABELS[tab]}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[55vh]">

                            {/* ── General tab ── */}
                            {activeTab === "general" && (
                                <div className="space-y-5">
                                    {/* Access mode */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Access</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: "public" as PortalAccessMode, label: "Fully Public", desc: "Anyone with the URL can read", icon: Globe },
                                                { value: "password" as PortalAccessMode, label: "Password Protected", desc: "Visitors must enter a password", icon: Lock },
                                            ].map(({ value, label, desc, icon: Icon }) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => setDraftAccessMode(value)}
                                                    className={cn(
                                                        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                                                        draftAccessMode === value
                                                            ? "border-primary bg-primary/5"
                                                            : "border-border hover:border-primary/50",
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon className={cn("h-3.5 w-3.5", draftAccessMode === value ? "text-primary" : "text-muted-foreground")} />
                                                        <span className="text-sm font-medium">{label}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Password field */}
                                    {draftAccessMode === "password" && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="portal-password" className="text-sm font-medium">Portal Password</Label>
                                            <div className="relative">
                                                <Input
                                                    id="portal-password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder={portal?.accessMode === "password" ? "Leave blank to keep existing" : "Set a password…"}
                                                    value={draftPassword}
                                                    onChange={(e) => { setDraftPassword(e.target.value); setPasswordChanged(true) }}
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword((v) => !v)}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* SEO */}
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">SEO Title <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                        <Input
                                            placeholder="e.g. My API Documentation"
                                            value={draftSeo.seoTitle}
                                            onChange={(e) => setDraftSeo((s) => ({ ...s, seoTitle: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">SEO Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                        <Input
                                            placeholder="Brief description shown in search results…"
                                            value={draftSeo.seoDescription}
                                            onChange={(e) => setDraftSeo((s) => ({ ...s, seoDescription: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── Sections tab ── */}
                            {activeTab === "sections" && (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground">
                                        Control which documentation sections appear in the public portal and how they are displayed.
                                    </p>
                                    {getAllPublishableSections().map(({ key, label, isCustom }) => {
                                        const vis = getEffectiveVisibility(draftSections, key as PortalSectionKey)
                                        return (
                                            <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3 gap-4">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <span className="text-sm font-medium truncate">{label}</span>
                                                </div>
                                                {/* Visibility selector */}
                                                <div className="relative group/vis shrink-0">
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-colors",
                                                            vis === "public" ? "border-green-500/40 text-green-600 bg-green-500/10" :
                                                                vis === "internal" ? "border-border text-muted-foreground bg-muted" :
                                                                    "border-yellow-500/40 text-yellow-600 bg-yellow-500/10",
                                                        )}
                                                    >
                                                        {vis === "public" ? <Globe className="h-3 w-3" /> :
                                                            vis === "internal" ? <EyeOff className="h-3 w-3" /> :
                                                                <AlertTriangle className="h-3 w-3" />}
                                                        {VISIBILITY_OPTIONS.find((o) => o.value === vis)?.label}
                                                        <ChevronDown className="h-3 w-3" />
                                                    </button>
                                                    <div className="absolute right-0 top-8 z-20 hidden group-hover/vis:flex flex-col w-48 rounded-lg border border-border bg-popover shadow-lg overflow-hidden text-sm">
                                                        {VISIBILITY_OPTIONS.map((opt) => (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                onClick={() => setSectionVisibility(key, opt.value)}
                                                                className={cn(
                                                                    "flex flex-col items-start px-3 py-2.5 hover:bg-muted transition-colors text-left",
                                                                    vis === opt.value && "bg-muted",
                                                                )}
                                                            >
                                                                <span className="font-medium text-xs">{opt.label}</span>
                                                                <span className="text-[11px] text-muted-foreground">{opt.description}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* ── Branding tab ── */}
                            {activeTab === "branding" && (
                                <div className="space-y-4">
                                    <p className="text-xs text-muted-foreground">
                                        Customize the look of your public portal. All fields are optional — a clean default theme is applied when not set.
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium">Logo URL</Label>
                                            <Input
                                                placeholder="https://..."
                                                value={draftBranding.logo ?? ""}
                                                onChange={(e) => setDraftBranding((b) => ({ ...b, logo: e.target.value || undefined }))}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium">Favicon URL</Label>
                                            <Input
                                                placeholder="https://..."
                                                value={draftBranding.favicon ?? ""}
                                                onChange={(e) => setDraftBranding((b) => ({ ...b, favicon: e.target.value || undefined }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        {(
                                            [
                                                { field: "primaryColor", label: "Primary Color" },
                                                { field: "bgColor", label: "Background Color" },
                                                { field: "accentColor", label: "Accent Color" },
                                            ] as const
                                        ).map(({ field, label }) => (
                                            <div key={field} className="space-y-1.5">
                                                <Label className="text-sm font-medium">{label}</Label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={draftBranding[field] ?? "#6366f1"}
                                                        onChange={(e) => setDraftBranding((b) => ({ ...b, [field]: e.target.value }))}
                                                        className="h-9 w-10 rounded-md border border-input p-0.5 cursor-pointer bg-background"
                                                    />
                                                    <Input
                                                        placeholder="#6366f1"
                                                        value={draftBranding[field] ?? ""}
                                                        onChange={(e) => setDraftBranding((b) => ({ ...b, [field]: e.target.value || undefined }))}
                                                        className="font-mono text-xs"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Header Tagline <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                        <Input
                                            placeholder="e.g. Developer Documentation"
                                            value={draftBranding.headerText ?? ""}
                                            onChange={(e) => setDraftBranding((b) => ({ ...b, headerText: e.target.value || undefined }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Footer Text <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                        <Input
                                            placeholder="e.g. © 2025 Acme Corp. All rights reserved."
                                            value={draftBranding.footerText ?? ""}
                                            onChange={(e) => setDraftBranding((b) => ({ ...b, footerText: e.target.value || undefined }))}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── Domain tab ── */}
                            {activeTab === "domain" && (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Custom Domain <span className="font-normal text-muted-foreground">(optional)</span></Label>
                                        <Input
                                            placeholder="docs.yourcompany.com"
                                            value={draftDomain}
                                            onChange={(e) => setDraftDomain(e.target.value.trim())}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Add your domain above, then follow the DNS setup instructions below.
                                        </p>
                                    </div>

                                    {draftDomain && (
                                        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                                            <p className="text-sm font-medium flex items-center gap-2">
                                                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                                DNS Configuration
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Add the following CNAME record with your DNS provider:
                                            </p>
                                            <div className="font-mono text-xs rounded-md bg-background border border-border p-3 space-y-1.5">
                                                <div className="grid grid-cols-[80px_1fr] gap-x-4 gap-y-1">
                                                    <span className="text-muted-foreground">Type</span>
                                                    <span className="text-foreground">CNAME</span>
                                                    <span className="text-muted-foreground">Name</span>
                                                    <span className="text-foreground">{draftDomain}</span>
                                                    <span className="text-muted-foreground">Value</span>
                                                    <span className="text-foreground">cname.docnine.app</span>
                                                    <span className="text-muted-foreground">TTL</span>
                                                    <span className="text-foreground">3600</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-yellow-500" />
                                                DNS propagation can take up to 48 hours. SSL is provisioned automatically once the CNAME is active.
                                            </p>
                                        </div>
                                    )}

                                    {!draftDomain && (
                                        <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-1">
                                            <Globe2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                            <p className="text-sm text-muted-foreground">Enter a custom domain above to see DNS setup instructions.</p>
                                            <p className="text-xs text-muted-foreground/60">Your portal URL is always available at <code className="font-mono">/docs/{portal?.slug ?? "your-slug"}</code></p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Footer */}
                {!loading && (
                    <div className="flex items-center justify-between border-t border-border px-6 py-4">
                        <div className="text-xs text-muted-foreground">
                            {portal?.isPublished ? (
                                <span className="flex items-center gap-1.5 text-green-600">
                                    <Globe className="h-3.5 w-3.5" />
                                    Portal is live
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <EyeOff className="h-3.5 w-3.5" />
                                    Portal is private
                                </span>
                            )}
                        </div>
                        {error && <p className="text-xs text-destructive">{error}</p>}
                        {saveSuccess && <p className="text-xs text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> Saved</p>}
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader1 className="h-3.5 w-3.5 mr-1.5 " /> : null}
                                Save Settings
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
