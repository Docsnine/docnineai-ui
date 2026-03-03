import { useState, useMemo } from "react"
import {
    ChevronDown, ChevronRight, Search, Terminal, Edit3, Check, X,
    AlertTriangle, Info, RefreshCw, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { apiSpecApi, type ApiSpec, type ApiSpecEndpoint, type ApiSpecParameter } from "@/lib/api"
import { TryItConsole, METHOD_COLORS } from "./try-it-console"

// ── Method badge ───────────────────────────────────────────────────────────

function MethodBadge({ method, className }: { method: string; className?: string }) {
    return (
        <span className={cn(
            "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-bold font-mono shrink-0",
            METHOD_COLORS[method] ?? "bg-muted text-muted-foreground",
            className,
        )}>
            {method}
        </span>
    )
}

// ── Schema display ─────────────────────────────────────────────────────────

interface SchemaProps { schema: Record<string, unknown>; depth?: number }

function SchemaDisplay({ schema, depth = 0 }: SchemaProps) {
    const [expanded, setExpanded] = useState(depth < 2)

    if (!schema || typeof schema !== "object") {
        return <span className="text-muted-foreground text-[11px] font-mono">any</span>
    }

    const type = schema.type as string | undefined
    const ref = schema.$ref as string | undefined

    if (ref) {
        const name = ref.split("/").pop() ?? ref
        return <span className="text-primary text-[11px] font-mono">{name}</span>
    }

    if (type === "object" || schema.properties) {
        const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>
        const required = (schema.required ?? []) as string[]
        return (
            <div className="font-mono text-[11px]">
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="text-foreground font-semibold">object</span>
                    {schema.description != null ? (
                        <span className="text-muted-foreground/70 ml-1">{String(schema.description)}</span>
                    ) : null}
                </button>
                {expanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                        {Object.entries(props).map(([key, val]) => (
                            <div key={key} className="flex items-start gap-1.5 flex-wrap">
                                <span className={cn("shrink-0", required.includes(key) ? "text-foreground font-semibold" : "text-muted-foreground")}>
                                    {key}{required.includes(key) && <span className="text-destructive">*</span>}:
                                </span>
                                <SchemaDisplay schema={val} depth={depth + 1} />
                                {(val.description as string | undefined) && (
                                    <span className="text-muted-foreground/60">{String(val.description)}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    if (type === "array") {
        return (
            <div className="flex items-start gap-1 font-mono text-[11px]">
                <span className="text-amber-600 dark:text-amber-400">array</span>
                {schema.items != null ? (
                    <>
                        <span className="text-muted-foreground">of</span>
                        <SchemaDisplay schema={schema.items as Record<string, unknown>} depth={depth + 1} />
                    </>
                ) : null}
            </div>
        )
    }

    const colorMap: Record<string, string> = {
        string: "text-green-600 dark:text-green-400",
        number: "text-blue-600 dark:text-blue-400",
        integer: "text-blue-600 dark:text-blue-400",
        boolean: "text-purple-600 dark:text-purple-400",
    }

    return (
        <span className={cn("font-mono text-[11px]", colorMap[type ?? ""] ?? "text-muted-foreground")}>
            {type ?? "any"}
            {schema.format != null ? <span className="text-muted-foreground/60">({String(schema.format)})</span> : null}
            {schema.enum != null ? (
                <span className="text-muted-foreground"> | {(schema.enum as unknown[]).map(String).join(" | ")}</span>
            ) : null}
        </span>
    )
}

// ── Parameters table ───────────────────────────────────────────────────────

function ParamsTable({ params, title }: { params: ApiSpecParameter[]; title: string }) {
    if (!params.length) return null
    return (
        <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
            <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Required</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        {params.map((p, i) => (
                            <tr key={i} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "" : "bg-muted/10")}>
                                <td className="px-3 py-2 font-mono text-foreground whitespace-nowrap">{p.name}</td>
                                <td className="px-3 py-2">
                                    <SchemaDisplay schema={p.schema ?? {}} depth={99} />
                                </td>
                                <td className="px-3 py-2">
                                    {p.required
                                        ? <span className="text-destructive font-medium">Yes</span>
                                        : <span className="text-muted-foreground">No</span>}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{p.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ── Endpoint detail ────────────────────────────────────────────────────────

interface EndpointDetailProps {
    endpoint: ApiSpecEndpoint
    spec: ApiSpec
    projectId: string
    canEdit: boolean
    onNoteUpdated: (note: string) => void
    onTryIt: () => void
}

function EndpointDetail({ endpoint, spec, projectId, canEdit, onNoteUpdated, onTryIt }: EndpointDetailProps) {
    const [noteEditing, setNoteEditing] = useState(false)
    const [noteDraft, setNoteDraft] = useState(endpoint.customNote ?? "")
    const [noteSaving, setNoteSaving] = useState(false)
    const [openResponseCodes, setOpenResponseCodes] = useState<Set<string>>(new Set(["200", "201"]))

    const pathParams = endpoint.parameters.filter((p) => p.in === "path")
    const queryParams = endpoint.parameters.filter((p) => p.in === "query")
    const headerParams = endpoint.parameters.filter((p) => p.in === "header")
    const cookieParams = endpoint.parameters.filter((p) => p.in === "cookie")

    const handleSaveNote = async () => {
        setNoteSaving(true)
        try {
            await apiSpecApi.updateNote(projectId, endpoint.id, noteDraft)
            onNoteUpdated(noteDraft)
            setNoteEditing(false)
        } catch {
            // silently fail — user can retry
        } finally {
            setNoteSaving(false)
        }
    }

    function toggleResponse(code: string) {
        setOpenResponseCodes((prev) => {
            const next = new Set(prev)
            next.has(code) ? next.delete(code) : next.add(code)
            return next
        })
    }

    function responseCodeColor(code: string) {
        const n = parseInt(code, 10)
        if (n < 300) return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
        if (n < 400) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        if (n < 500) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
    }

    return (
        <div className="space-y-6 p-6 pb-12">
            {/* Title bar */}
            <div className="flex items-start gap-3">
                <MethodBadge method={endpoint.method} className="mt-0.5 text-sm px-2 py-1" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono text-base font-semibold text-foreground break-all">{endpoint.path}</code>
                        {endpoint.deprecated && (
                            <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px]">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />Deprecated
                            </Badge>
                        )}
                    </div>
                    {endpoint.summary && (
                        <p className="mt-1 text-sm text-foreground">{endpoint.summary}</p>
                    )}
                    {endpoint.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{endpoint.description}</p>
                    )}
                    {endpoint.operationId && (
                        <p className="mt-1 text-[11px] font-mono text-muted-foreground/60">operationId: {endpoint.operationId}</p>
                    )}
                </div>
                <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={onTryIt}>
                    <Terminal className="h-3.5 w-3.5" /> Try It
                </Button>
            </div>

            {/* Custom note */}
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">Team note</span>
                    {canEdit && !noteEditing && (
                        <button
                            onClick={() => { setNoteDraft(endpoint.customNote ?? ""); setNoteEditing(true) }}
                            className="ml-auto text-muted-foreground hover:text-foreground"
                        >
                            <Edit3 className="h-3 w-3" />
                        </button>
                    )}
                    {noteEditing && (
                        <div className="ml-auto flex gap-1">
                            <button onClick={handleSaveNote} disabled={noteSaving} className="text-green-500 hover:text-green-600">
                                <Check className="h-3 w-3" />
                            </button>
                            <button onClick={() => setNoteEditing(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </div>
                {noteEditing ? (
                    <textarea
                        autoFocus
                        className="w-full resize-none bg-transparent text-xs text-muted-foreground focus:outline-none"
                        rows={3}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Add a team note about this endpoint…"
                    />
                ) : (
                    <p className="text-xs text-muted-foreground min-h-5">
                        {endpoint.customNote || <span className="italic opacity-50">No note yet. {canEdit ? "Click edit to add one." : ""}</span>}
                    </p>
                )}
            </div>

            {/* Parameters */}
            <ParamsTable params={pathParams} title="Path parameters" />
            <ParamsTable params={queryParams} title="Query parameters" />
            <ParamsTable params={headerParams} title="Header parameters" />
            <ParamsTable params={cookieParams} title="Cookie parameters" />

            {/* Request body */}
            {endpoint.requestBody && (
                <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Request body
                        {endpoint.requestBody.required && <span className="text-destructive ml-1">*</span>}
                    </h4>
                    {endpoint.requestBody.description && (
                        <p className="mb-2 text-xs text-muted-foreground">{endpoint.requestBody.description}</p>
                    )}
                    <div className="space-y-3">
                        {Object.entries(endpoint.requestBody.content).map(([ct, mc]) => (
                            <div key={ct} className="rounded-lg border border-border overflow-hidden">
                                <div className="border-b border-border bg-muted/30 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{ct}</div>
                                <div className="p-3">
                                    <SchemaDisplay schema={mc.schema} depth={0} />
                                    {mc.example !== null && mc.example !== undefined && (
                                        <div className="mt-2">
                                            <p className="text-[11px] text-muted-foreground mb-1">Example:</p>
                                            <pre className="rounded bg-muted/40 p-2 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                                                {typeof mc.example === "string" ? mc.example : JSON.stringify(mc.example, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Responses */}
            {Object.keys(endpoint.responses).length > 0 && (
                <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responses</h4>
                    <div className="space-y-2">
                        {Object.entries(endpoint.responses).map(([code, r]) => (
                            <div key={code} className="rounded-lg border border-border overflow-hidden">
                                <button
                                    onClick={() => toggleResponse(code)}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors"
                                >
                                    <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-bold font-mono shrink-0", responseCodeColor(code))}>
                                        {code}
                                    </span>
                                    <span className="flex-1 text-left text-xs text-muted-foreground truncate">{r.description}</span>
                                    {openResponseCodes.has(code)
                                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                </button>
                                {openResponseCodes.has(code) && Object.keys(r.content ?? {}).length > 0 && (
                                    <div className="border-t border-border p-3 space-y-3">
                                        {Object.entries(r.content ?? {}).map(([ct, mc]) => (
                                            <div key={ct}>
                                                <p className="font-mono text-[11px] text-muted-foreground mb-1">{ct}</p>
                                                <SchemaDisplay schema={mc.schema} depth={0} />
                                                {mc.example !== null && mc.example !== undefined && (
                                                    <pre className="mt-2 rounded bg-muted/40 p-2 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                                                        {typeof mc.example === "string" ? mc.example : JSON.stringify(mc.example, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Tag group in sidebar ───────────────────────────────────────────────────

function TagGroup({
    name, description, endpoints, selectedId, onSelect,
}: {
    name: string
    description: string
    endpoints: ApiSpecEndpoint[]
    selectedId: string | null
    onSelect: (ep: ApiSpecEndpoint) => void
}) {
    const [open, setOpen] = useState(true)
    return (
        <div>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
                {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                <span className="truncate">{name}</span>
                <span className="ml-auto font-normal text-muted-foreground/60">{endpoints.length}</span>
            </button>
            {open && (
                <div>
                    {endpoints.map((ep) => (
                        <button
                            key={ep.id}
                            onClick={() => onSelect(ep)}
                            className={cn(
                                "flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-muted",
                                ep.id === selectedId && "bg-primary/10 text-primary",
                                ep.deprecated && "opacity-50",
                            )}
                        >
                            <span className={cn(
                                "shrink-0 rounded border px-1 py-0.5 text-[10px] font-bold font-mono w-12 text-center",
                                METHOD_COLORS[ep.method] ?? "bg-muted text-muted-foreground",
                            )}>
                                {ep.method}
                            </span>
                            <span className="flex-1 truncate text-left font-mono">{ep.path}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── ApiReferenceViewer (main export) ──────────────────────────────────────

interface ViewerProps {
    spec: ApiSpec
    projectId: string
    canEdit: boolean
    onReimport: () => void
    onSync?: () => void
    onDelete?: () => void
    isSyncing?: boolean
}

export function ApiReferenceViewer({ spec, projectId, canEdit, onReimport, onSync, onDelete, isSyncing }: ViewerProps) {
    const [search, setSearch] = useState("")
    const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null)
    const [tryItOpen, setTryItOpen] = useState(false)
    const [specState, setSpecState] = useState(spec)

    // Group endpoints by tags
    const grouped = useMemo(() => {
        const eps = specState.endpoints.filter((ep) => {
            if (!search.trim()) return true
            const q = search.toLowerCase()
            return (
                ep.path.toLowerCase().includes(q) ||
                ep.method.toLowerCase().includes(q) ||
                ep.summary.toLowerCase().includes(q) ||
                ep.tags.some((t) => t.toLowerCase().includes(q))
            )
        })

        const map = new Map<string, ApiSpecEndpoint[]>()
        for (const ep of eps) {
            const tags = ep.tags.length ? ep.tags : ["Untagged"]
            for (const tag of tags) {
                if (!map.has(tag)) map.set(tag, [])
                map.get(tag)!.push(ep)
            }
        }

        // Sort: spec tag order, then alphabetical, then "Untagged" last
        const specTagOrder = specState.tags.map((t) => t.name)
        return [...map.entries()].sort(([a], [b]) => {
            const ai = specTagOrder.indexOf(a)
            const bi = specTagOrder.indexOf(b)
            if (a === "Untagged") return 1
            if (b === "Untagged") return -1
            if (ai !== -1 && bi !== -1) return ai - bi
            if (ai !== -1) return -1
            if (bi !== -1) return 1
            return a.localeCompare(b)
        })
    }, [specState, search])

    const selectedEndpoint = selectedEndpointId
        ? specState.endpoints.find((e) => e.id === selectedEndpointId) ?? null
        : null

    const handleNoteUpdated = (note: string) => {
        setSpecState((prev) => ({
            ...prev,
            endpoints: prev.endpoints.map((ep) =>
                ep.id === selectedEndpointId ? { ...ep, customNote: note } : ep,
            ),
        }))
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Info bar */}
            <div className="shrink-0 flex items-center gap-2 border-b border-border px-4 py-2.5 bg-muted/10 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate">{specState.info.title}</span>
                    {specState.info.version && (
                        <Badge variant="outline" className="text-[10px] shrink-0">{specState.info.version}</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                        {specState.specVersion === "postman" ? "Postman" : `OAS ${specState.specVersion}`}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">{specState.endpoints.length} endpoints</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {specState.source === "url" && onSync && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onSync} disabled={isSyncing}>
                            {isSyncing
                                ? <><span className="animate-spin">⟳</span> Syncing…</>
                                : <><RefreshCw className="h-3 w-3" /> Sync</>}
                        </Button>
                    )}
                    {canEdit && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onReimport}>
                            Re-import
                        </Button>
                    )}
                    {canEdit && onDelete && (
                        <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-60 border-r border-border flex flex-col shrink-0 overflow-hidden">
                    <div className="p-2 border-b border-border shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                className="pl-7 h-8 text-xs"
                                placeholder="Search endpoints…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {grouped.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No endpoints found.</p>
                        ) : (
                            grouped.map(([tag, eps]) => (
                                <TagGroup
                                    key={tag}
                                    name={tag}
                                    description={specState.tags.find((t) => t.name === tag)?.description ?? ""}
                                    endpoints={eps}
                                    selectedId={selectedEndpointId}
                                    onSelect={(ep) => {
                                        setSelectedEndpointId(ep.id)
                                        setTryItOpen(false)
                                    }}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {!selectedEndpoint ? (
                        /* Empty state */
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <Search className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">Select an endpoint from the sidebar</p>
                            {specState.info.description && (
                                <p className="max-w-md text-xs text-muted-foreground/70">{specState.info.description}</p>
                            )}
                        </div>
                    ) : tryItOpen ? (
                        /* Try It console */
                        <div className="flex flex-1 overflow-hidden">
                            <TryItConsole
                                projectId={projectId}
                                endpoint={selectedEndpoint}
                                spec={specState}
                                onClose={() => setTryItOpen(false)}
                            />
                        </div>
                    ) : (
                        /* Endpoint detail */
                        <div className="flex-1 overflow-y-auto">
                            <EndpointDetail
                                endpoint={selectedEndpoint}
                                spec={specState}
                                projectId={projectId}
                                canEdit={canEdit}
                                onNoteUpdated={handleNoteUpdated}
                                onTryIt={() => setTryItOpen(true)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
