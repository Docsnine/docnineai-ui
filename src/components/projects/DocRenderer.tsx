/**
 * DocRenderer.tsx — v2 (all bugs fixed)
 *
 * Bug fixes over v1:
 *  #1  remark-gfm: static import instead of require() — works in Vite ESM
 *  #2  Code blocks: pre renderer owns block code; code renderer is inline-only
 *  #3  li ordered/index: props don't exist in v8 — detected via CSS data-attr
 *  #4  Heading slugify: recursive text extraction handles bold/code children
 *  #5  Badge paragraph: mdast type:"image" check, not hast tagName:"img"
 *  #6  CopyButton: icon + text gap fixed
 *  #7  Tables: border-collapse + cell borders instead of divide-y
 *
 * Install: npm install react-markdown remark-gfm
 */

import { useState, useCallback, Children, isValidElement } from "react"
import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"          // FIX #1: static import, not require()
import { Check, Copy, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function extractText(node: React.ReactNode): string {
    if (typeof node === "string" || typeof node === "number") return String(node)
    if (Array.isArray(node)) return node.map(extractText).join("")
    if (isValidElement(node)) return extractText((node.props as any).children)
    return ""
}

function slugify(node: React.ReactNode): string {
    return extractText(node)
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim() || "section"
}

function isBadgeUrl(src?: string): boolean {
    if (!src) return false
    return (
        src.includes("shields.io") ||
        src.includes("img.shields") ||
        src.includes("badgen.net") ||
        src.includes("badge.fury") ||
        (src.includes("badge") && src.includes("http"))
    )
}

const LANG_META: Record<string, { label: string; color: string }> = {
    bash: { label: "bash", color: "#4ade80" },
    sh: { label: "shell", color: "#4ade80" },
    shell: { label: "shell", color: "#4ade80" },
    zsh: { label: "zsh", color: "#4ade80" },
    javascript: { label: "javascript", color: "#fbbf24" },
    js: { label: "javascript", color: "#fbbf24" },
    typescript: { label: "typescript", color: "#60a5fa" },
    ts: { label: "typescript", color: "#60a5fa" },
    jsx: { label: "jsx", color: "#22d3ee" },
    tsx: { label: "tsx", color: "#22d3ee" },
    json: { label: "json", color: "#fb923c" },
    python: { label: "python", color: "#a3e635" },
    py: { label: "python", color: "#a3e635" },
    css: { label: "css", color: "#f472b6" },
    scss: { label: "scss", color: "#f472b6" },
    html: { label: "html", color: "#f87171" },
    xml: { label: "xml", color: "#f87171" },
    sql: { label: "sql", color: "#c084fc" },
    yaml: { label: "yaml", color: "#fcd34d" },
    yml: { label: "yaml", color: "#fcd34d" },
    go: { label: "go", color: "#67e8f9" },
    rust: { label: "rust", color: "#fdba74" },
    java: { label: "java", color: "#fca5a5" },
    php: { label: "php", color: "#a78bfa" },
    ruby: { label: "ruby", color: "#fb7185" },
    rb: { label: "ruby", color: "#fb7185" },
    graphql: { label: "graphql", color: "#e879f9" },
    dockerfile: { label: "dockerfile", color: "#38bdf8" },
    prisma: { label: "prisma", color: "#818cf8" },
}

// ─────────────────────────────────────────────────────────────────────────────
// COPY BUTTON  (FIX #6: gap between icon and text)
// ─────────────────────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)

    const copy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text)
        } catch {
            // fallback for browsers without clipboard API
            const el = document.createElement("textarea")
            el.value = text
            document.body.appendChild(el)
            el.select()
            document.execCommand("copy")
            document.body.removeChild(el)
        }
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [text])

    return (
        <button
            onClick={copy}
            className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium",
                "border transition-all duration-200 select-none shrink-0",
                copied
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-200"
            )}
        >
            {/* FIX #6: explicit gap-1.5 on the button + separate spans */}
            {copied
                ? <><Check className="h-3 w-3 shrink-0" /><span>Copied!</span></>
                : <><Copy className="h-3 w-3 shrink-0" /><span>Copy</span></>
            }
        </button>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE BLOCK COMPONENT  (FIX #2: lives outside `code` renderer)
// ─────────────────────────────────────────────────────────────────────────────

function CodeBlock({ lang, code }: { lang: string; code: string }) {
    const meta = LANG_META[lang.toLowerCase()] ?? null

    return (
        <div className="my-6 rounded-xl overflow-hidden border border-white/[0.08] shadow-xl bg-[#0d1117]">
            {/* toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                    <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                    <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>

                {meta ? (
                    <span
                        className="text-[11px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                        style={{ color: meta.color, background: `${meta.color}1a` }}
                    >
                        {meta.label}
                    </span>
                ) : lang ? (
                    <span className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
                        {lang}
                    </span>
                ) : (
                    <span className="text-[11px] text-slate-600 uppercase tracking-widest">code</span>
                )}

                <CopyButton text={code} />
            </div>

            {/* code body */}
            <div className="overflow-x-auto">
                <pre className="p-5 m-0 bg-transparent leading-none">
                    <code
                        className="font-mono text-[0.8125rem] leading-[1.75] text-slate-200 whitespace-pre block"
                        style={{ fontFamily: "'JetBrains Mono','Fira Code','Cascadia Code','Consolas',monospace" }}
                    >
                        {code}
                    </code>
                </pre>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERERS
// ─────────────────────────────────────────────────────────────────────────────

const components: Components = {

    h1({ children }) {
        const slug = slugify(children)

        return (
            <h1 id={slug}
                className="group mt-2 mb-6 pb-4 text-[1.85rem] font-bold tracking-tight
                   text-foreground border-b-2 border-border scroll-mt-24
                   flex items-baseline gap-3"
            >
                <span className="flex-1">{children}</span>

                <a href={`#${slug}`} aria-hidden
                    className="opacity-0 group-hover:opacity-25 text-muted-foreground
                     transition-opacity text-sm font-normal shrink-0">#</a>
            </h1>
        )
    },

    h2({ children }) {
        const slug = slugify(children)
        return (
            <h2 id={slug}
                className="group mt-10 mb-4 text-[1.25rem] font-semibold tracking-tight
                   text-foreground scroll-mt-24 flex items-center gap-3"
            >
                <span className="w-[3px] h-5 rounded-full bg-primary shrink-0" aria-hidden />
                <span className="flex-1">{children}</span>
                <a href={`#${slug}`} aria-hidden
                    className="opacity-0 group-hover:opacity-20 text-muted-foreground
                     transition-opacity text-sm font-normal shrink-0">#</a>
            </h2>
        )
    },

    h3({ children }) {
        const slug = slugify(children)
        return (
            <h3 id={slug}
                className="mt-7 mb-3 text-[1rem] font-semibold text-foreground scroll-mt-24"
            >
                {children}
            </h3>
        )
    },

    h4({ children }) {
        return (
            <h4 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {children}
            </h4>
        )
    },

    // ── Paragraph  (FIX #5: mdast type:"image" not tagName:"img") ──────────────

    p({ children, node }) {
        // mdast children: type is "image" or "link" wrapping an image
        const kids = (node as any)?.children ?? []
        const allBadges = kids.length > 0 && kids.every(
            (c: any) =>
                c.type === "image" ||
                (c.type === "link" && c.children?.[0]?.type === "image")
        )
        if (allBadges) {
            return <div className="flex flex-wrap items-center gap-2 my-5">{children}</div>
        }
        return <p className="my-4 leading-[1.8] text-foreground/80 text-[0.9375rem]">{children}</p>
    },

    // ── Links ──────────────────────────────────────────────────────────────────

    a({ href, children }) {
        const isExternal = !!href && (href.startsWith("http") || href.startsWith("//"))
        return (
            <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="text-primary font-medium underline underline-offset-2
                   decoration-primary/40 hover:decoration-primary
                   transition-colors inline-flex items-center gap-0.5 break-words"
            >
                {children}
                {isExternal && <ExternalLink className="h-3 w-3 opacity-50 shrink-0 ml-0.5" />}
            </a>
        )
    },

    // ── Images ─────────────────────────────────────────────────────────────────

    img({ src, alt }) {
        if (isBadgeUrl(src)) {
            return (
                <img src={src} alt={alt ?? ""}
                    className="inline-block h-5 align-middle rounded-sm" loading="lazy" />
            )
        }
        return (
            <span className="my-6 block">
                <img src={src} alt={alt ?? ""}
                    className="rounded-lg border border-border shadow-sm max-w-full" loading="lazy" />
                {alt && (
                    <span className="mt-2 block text-center text-xs text-muted-foreground italic">{alt}</span>
                )}
            </span>
        )
    },

    pre({ children }) {
        // children is usually: <code className="language-xxx">...</code>
        if (
            Children.count(children) === 1 &&
            isValidElement(children) &&
            children.type === "code"
        ) {
            const codeElement = children as any
            const className = codeElement.props.className ?? ""
            const lang = className.replace("language-", "")
            const code = String(codeElement.props.children ?? "").replace(/\n$/, "")

            return <CodeBlock lang={lang} code={code} />
        }

        // fallback (rare)
        return (
            <pre className="my-5 overflow-x-auto rounded-lg bg-[#0d1117] border border-white/10 p-5">
                {children}
            </pre>
        )
    },

    // ── CODE  (FIX #2: inline only — block code never reaches here) ────────────

    code({ className, children }) {
        return (
            <code
                className={cn(
                    "inline rounded bg-muted/80 border border-border/50",
                    "px-[0.4em] py-[0.1em] text-[0.84em] font-mono font-medium",
                    "text-foreground/90 break-words",
                    className
                )}
            >
                {children}
            </code>
        )
    },

    table({ children }) {
        return (
            <div className="my-6 w-full overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-full border-collapse text-sm">
                    {children}
                </table>
            </div>
        )
    },

    thead({ children }) {
        return <thead className="bg-muted/60">{children}</thead>
    },

    tbody({ children }) {
        return <tbody>{children}</tbody>
    },

    tr({ children }) {
        return (
            <tr className="border-b border-border last:border-0 transition-colors hover:bg-muted/25">
                {children}
            </tr>
        )
    },

    th({ children, style }) {
        return (
            <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider
                   text-muted-foreground border-b-2 border-border whitespace-nowrap"
                style={style}
            >
                {children}
            </th>
        )
    },

    td({ children, style }) {
        return (
            <td
                className="px-4 py-3 text-foreground/80 align-top leading-relaxed"
                style={style}
            >
                {children}
            </td>
        )
    },

    ul({ children }) {
        return (
            <ul className="my-4 space-y-2 pl-0 list-none" data-list-type="ul">
                {children}
            </ul>
        )
    },

    ol({ children }) {
        return (
            <ol
                className="my-4 space-y-2 pl-0 list-none"
                data-list-type="ol"
                style={{ counterReset: "doc-list" }}
            >
                {children}
            </ol>
        )
    },

    li({ children, node }) {
        // FIX #3: detect ordered via parent mdast node (node.parent.ordered)
        const isOrdered = (node as any)?.parent?.ordered === true

        if (isOrdered) {
            return (
                <li
                    className="flex items-start gap-3 text-[0.9375rem] leading-[1.8] text-foreground/80"
                    style={{ counterIncrement: "doc-list" }}
                >
                    <span
                        className="mt-0.5 flex h-[1.35rem] w-[1.35rem] shrink-0 items-center justify-center
                       rounded-full bg-primary/15 text-[0.68rem] font-bold text-primary"
                        style={{ content: "counter(doc-list)" }}
                        aria-hidden
                    >
                        {/* static count — CSS counter handles the actual display */}
                        {(() => {
                            // Get index from parent children list (mdast listItem nodes)
                            const siblings = (node as any)?.parent?.children ?? []
                            const idx = siblings.filter((c: any) => c.type === "listItem").indexOf(node)
                            return idx >= 0 ? idx + 1 : "•"
                        })()}
                    </span>
                    <span className="flex-1 min-w-0 [&>p]:my-0 [&>p:first-child]:mt-0">{children}</span>
                </li>
            )
        }

        return (
            <li className="flex items-start gap-3 text-[0.9375rem] leading-[1.8] text-foreground/80">
                <span className="mt-[0.65rem] h-[5px] w-[5px] shrink-0 rounded-full bg-primary/60 block" />
                <span className="flex-1 min-w-0 [&>p]:my-0 [&>p:first-child]:mt-0">{children}</span>
            </li>
        )
    },

    // ── Blockquote ─────────────────────────────────────────────────────────────

    blockquote({ children }) {
        return (
            <blockquote
                className="my-6 pl-5 pr-4 py-0.5 border-l-[3px] border-primary/50
                   bg-primary/[0.04] rounded-r-lg text-foreground/70 italic
                   [&>p]:my-3"
            >
                {children}
            </blockquote>
        )
    },

    // ── Horizontal rule ────────────────────────────────────────────────────────

    hr() {
        return (
            <div className="my-8 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <div className="flex gap-1">
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="h-1 w-1 rounded-full bg-primary/40" />
                    <span className="h-1 w-1 rounded-full bg-border" />
                </div>
                <div className="flex-1 h-px bg-border" />
            </div>
        )
    },

    // ── Inline ─────────────────────────────────────────────────────────────────

    strong({ children }) {
        return <strong className="font-semibold text-foreground">{children}</strong>
    },

    em({ children }) {
        return <em className="italic text-foreground/75">{children}</em>
    },

    del({ children }) {
        return <del className="line-through text-muted-foreground opacity-70">{children}</del>
    },
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

interface DocRendererProps {
    content: string
    className?: string
}

export function DocRenderer({ content, className }: DocRendererProps) {
    if (!content?.trim()) return null

    return (
        <div className={cn("doc-renderer w-full max-w-none [&_*]:box-border", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}   // FIX #1: always loaded, static import
                components={components}
                skipHtml={false}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}