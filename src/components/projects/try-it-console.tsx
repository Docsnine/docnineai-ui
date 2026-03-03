import { useState } from "react"
import {
  Play, Loader2, ChevronDown, ChevronRight, X, Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { cn } from "@/lib/utils"
import { apiSpecApi, type ApiSpec, type ApiSpecEndpoint, type TryItResult } from "@/lib/api"

// ── HTTP method colours ────────────────────────────────────────────────────

export const METHOD_COLORS: Record<string, string> = {
    GET: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    POST: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    PUT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    PATCH: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    DELETE: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    OPTIONS: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    HEAD: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
}

function statusColor(code: number) {
    if (code < 300) return "bg-green-500/10 text-green-600 dark:text-green-400"
    if (code < 400) return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    if (code < 500) return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    return "bg-red-500/10 text-red-600 dark:text-red-400"
}

// ── Key-value row ──────────────────────────────────────────────────────────

interface KVPair { key: string; value: string }

function KVEditor({
    pairs,
    onChange,
    addLabel = "Add header",
}: { pairs: KVPair[]; onChange: (p: KVPair[]) => void; addLabel?: string }) {
    return (
        <div className="space-y-1.5">
            {pairs.map((p, i) => (
                <div key={i} className="flex gap-1.5">
                    <Input
                        className="h-7 text-xs font-mono"
                        placeholder="Key"
                        value={p.key}
                        onChange={(e) => {
                            const next = [...pairs]; next[i] = { ...next[i], key: e.target.value }; onChange(next)
                        }}
                    />
                    <Input
                        className="h-7 text-xs font-mono"
                        placeholder="Value"
                        value={p.value}
                        onChange={(e) => {
                            const next = [...pairs]; next[i] = { ...next[i], value: e.target.value }; onChange(next)
                        }}
                    />
                    <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => onChange(pairs.filter((_, j) => j !== i))}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            ))}
            <Button
                variant="ghost" size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => onChange([...pairs, { key: "", value: "" }])}
            >
                <Plus className="h-3 w-3 mr-1" />{addLabel}
            </Button>
        </div>
    )
}

// ── Section accordion ──────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
                {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {title}
            </button>
            {open && <div className="pl-4 pt-1">{children}</div>}
        </div>
    )
}

// ── TryItConsole ───────────────────────────────────────────────────────────

interface Props {
    projectId: string
    endpoint: ApiSpecEndpoint
    spec: ApiSpec
    onClose: () => void
}

export function TryItConsole({ projectId, endpoint, spec, onClose }: Props) {
    const baseServer = spec.servers?.[0]?.url ?? ""

    // Path param values
    const pathParams = endpoint.parameters.filter((p) => p.in === "path")
    const [pathValues, setPathValues] = useState<Record<string, string>>(
        Object.fromEntries(pathParams.map((p) => [p.name, ""])),
    )

    // Query params
    const specQueryParams = endpoint.parameters.filter((p) => p.in === "query")
    const [queryPairs, setQueryPairs] = useState<KVPair[]>(
        specQueryParams.map((p) => ({ key: p.name, value: String(p.example ?? "") })),
    )

    // Headers
    const [headerPairs, setHeaderPairs] = useState<KVPair[]>([
        { key: "Accept", value: "application/json" },
    ])

    // Auth bearer token
    const [bearerToken, setBearerToken] = useState("")

    // Body
    const needsBody = ["POST", "PUT", "PATCH"].includes(endpoint.method)
    const [bodyText, setBodyText] = useState(() => {
        // Try to pre-fill with example from requestBody
        const content = endpoint.requestBody?.content
        if (content) {
            const ct = content["application/json"] ?? Object.values(content)[0]
            if (ct?.example && typeof ct.example === "string") return ct.example
            if (ct?.example) return JSON.stringify(ct.example, null, 2)
        }
        return ""
    })
    const [selectedContentType, setSelectedContentType] = useState(() => {
        const content = endpoint.requestBody?.content
        return content ? Object.keys(content)[0] ?? "application/json" : "application/json"
    })

    // Response
    const [result, setResult] = useState<TryItResult | null>(null)
    const [sending, setSending] = useState(false)
    const [sendError, setSendError] = useState<string | null>(null)
    const [showResponseHeaders, setShowResponseHeaders] = useState(false)

    // Build resolved path
    const resolvedPath = endpoint.path.replace(/\{([^}]+)\}/g, (_, name) => {
        return pathValues[name] ?? `{${name}}`
    })

    const handleSend = async () => {
        setSending(true)
        setSendError(null)
        setResult(null)
        try {
            const headers: Record<string, string> = {}
            for (const { key, value } of headerPairs) {
                if (key.trim()) headers[key.trim()] = value
            }
            if (bearerToken.trim()) headers["Authorization"] = `Bearer ${bearerToken.trim()}`
            if (needsBody) headers["Content-Type"] = selectedContentType

            const queryParams: Record<string, string> = {}
            for (const { key, value } of queryPairs) {
                if (key.trim()) queryParams[key.trim()] = value
            }

            const r = await apiSpecApi.tryRequest(projectId, {
                method: endpoint.method,
                baseUrl: baseServer,
                path: resolvedPath,
                headers,
                queryParams,
                body: needsBody && bodyText.trim() ? bodyText.trim() : undefined,
            })
            setResult(r)
        } catch (err: unknown) {
            setSendError(err instanceof Error ? err.message : "Request failed.")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
                <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-bold font-mono", METHOD_COLORS[endpoint.method] ?? "bg-muted text-muted-foreground")}>
                    {endpoint.method}
                </span>
                <code className="flex-1 truncate font-mono text-xs text-muted-foreground">
                    {baseServer.replace(/\/$/, "")}{resolvedPath}
                </code>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: params */}
                <div className="w-80 border-r border-border overflow-y-auto p-4 space-y-4 shrink-0 text-sm">

                    {/* Path params */}
                    {pathParams.length > 0 && (
                        <Section title="Path params">
                            <div className="space-y-1.5">
                                {pathParams.map((p) => (
                                    <div key={p.name} className="space-y-0.5">
                                        <label className="text-[11px] font-mono text-muted-foreground">{p.name}{p.required && <span className="text-destructive ml-0.5">*</span>}</label>
                                        <Input
                                            className="h-7 text-xs font-mono"
                                            placeholder={p.description || p.name}
                                            value={pathValues[p.name] ?? ""}
                                            onChange={(e) => setPathValues((v) => ({ ...v, [p.name]: e.target.value }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Query params */}
                    <Section title="Query params" defaultOpen={specQueryParams.length > 0}>
                        <KVEditor pairs={queryPairs} onChange={setQueryPairs} addLabel="Add param" />
                    </Section>

                    {/* Headers */}
                    <Section title="Headers">
                        <KVEditor pairs={headerPairs} onChange={setHeaderPairs} addLabel="Add header" />
                    </Section>

                    {/* Auth */}
                    <Section title="Auth">
                        <div className="space-y-1">
                            <label className="text-[11px] text-muted-foreground">Bearer token</label>
                            <Input
                                className="h-7 text-xs font-mono"
                                placeholder="eyJhbGci..."
                                value={bearerToken}
                                onChange={(e) => setBearerToken(e.target.value)}
                                type="password"
                            />
                        </div>
                    </Section>

                    {/* Body */}
                    {needsBody && (
                        <Section title="Request body">
                            {endpoint.requestBody && (
                                <div className="mb-2">
                                    <select
                                        className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                                        value={selectedContentType}
                                        onChange={(e) => setSelectedContentType(e.target.value)}
                                    >
                                        {Object.keys(endpoint.requestBody.content).map((ct) => (
                                            <option key={ct} value={ct}>{ct}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <textarea
                                className="h-36 w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder={`{\n  \n}`}
                                value={bodyText}
                                onChange={(e) => setBodyText(e.target.value)}
                            />
                        </Section>
                    )}
                </div>

                {/* Right: response */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Send button bar */}
                    <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 shrink-0">
                        <Button size="sm" onClick={handleSend} disabled={sending} className="gap-1.5">
                            {sending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Play className="h-3.5 w-3.5" />}
                            {sending ? "Sending…" : "Send"}
                        </Button>
                        {result && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className={cn("rounded px-1.5 py-0.5 font-mono font-semibold text-[11px]", statusColor(result.status))}>
                                    {result.status}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Response body */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {sendError && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                {sendError}
                            </div>
                        )}

                        {!result && !sendError && (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                Press Send to execute the request
                            </div>
                        )}

                        {result && (
                            <div className="space-y-3">
                                {/* Response headers collapsible */}
                                <button
                                    onClick={() => setShowResponseHeaders((v) => !v)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                >
                                    {showResponseHeaders ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    Response headers
                                </button>
                                {showResponseHeaders && (
                                    <div className="rounded-md border border-border bg-muted/30 p-2 font-mono text-[11px] space-y-0.5">
                                        {Object.entries(result.headers).map(([k, v]) => (
                                            <div key={k}>
                                                <span className="text-primary">{k}</span>: {String(v)}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Response body */}
                                <div className="rounded-md border border-border bg-muted/30 overflow-x-auto">
                                    <pre className="p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap wrap-break-word">
                                        {tryPrettyJson(result.body)}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function tryPrettyJson(text: string): string {
    try {
        return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
        return text
    }
}


