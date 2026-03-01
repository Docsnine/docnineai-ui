import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Send, User, Loader2, X, Trash2, Sparkles, Square } from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { chatStream, chatApi, type ApiProject } from "@/lib/api"
import { CodeBlock } from "@/components/projects/DocRenderer"

// ── Suggested prompts from real project data ──────────────────────────────────
function buildSuggestedPrompts(project: ApiProject): string[] {
  const prompts: string[] = []
  if ((project.stats?.endpoints ?? 0) > 0) {
    prompts.push(`Summarise all ${project.stats.endpoints} API endpoints and what each one does`)
  }
  if ((project.stats?.models ?? 0) > 0) {
    prompts.push(`Explain the ${project.stats.models} data models and how they relate to each other`)
  }
  const critHigh =
    (project.security?.counts?.CRITICAL ?? 0) + (project.security?.counts?.HIGH ?? 0)
  if (critHigh > 0) {
    prompts.push(`What are the ${critHigh} critical/high security findings and how do I fix them?`)
  }
  if (project.meta?.language) {
    prompts.push(`How do I set up and run this ${project.meta.language} project locally?`)
  }
  prompts.push(
    `What is the overall architecture of ${project.meta?.name ?? "this project"}?`,
  )
  return prompts.slice(0, 4)
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  role: "user" | "ai"
  content: string
}

interface AIChatPanelProps {
  project: ApiProject
  activeSection: string      // e.g. "apiReference"
  activeSectionContent: string
  onClose: () => void
}

// ── localStorage helpers ─────────────────────────────────────────────────────
function storageKey(projectId: string, sessionId: string) {
  return `docnine-chat:${projectId}:${sessionId}`
}

// ── Markdown renderers for chat messages ──────────────────────────────────────
// Code blocks use the same CodeBlock as DocRenderer; inline code uses a compact style.
const chatComponents: Components = {
  pre({ children }) {
    const child = children as any
    if (child?.type === "code") {
      const lang = (child.props?.className ?? "").replace("language-", "")
      const code = String(child.props?.children ?? "").replace(/\n$/, "")
      return <CodeBlock lang={lang} code={code} />
    }
    return (
      <pre className="my-3 overflow-x-auto rounded-lg bg-[#0d1117] border border-white/10 p-4 text-xs">
        {children}
      </pre>
    )
  },
  code({ className, children }) {
    return (
      <code className="rounded bg-muted/70 px-1 py-0.5 text-[0.8em] font-mono text-foreground/90 border border-border/40">
        {children}
      </code>
    )
  },
  p({ children }) {
    return <p className="my-1 leading-relaxed">{children}</p>
  },
}

// ── Main component ────────────────────────────────────────────────────────────
export function AIChatPanel({
  project,
  activeSection,
  activeSectionContent: _activeSectionContent,
  onClose,
}: AIChatPanelProps) {
  const projectId = project._id
  const sessionId = project.chatSessionId ?? null
  const localKey = sessionId ? storageKey(projectId, sessionId) : null

  // Restore persisted messages from localStorage
  const [messages, setMessages] = useState<Message[]>(() => {
    if (!localKey) return []
    try {
      const stored = localStorage.getItem(localKey)
      return stored ? (JSON.parse(stored) as Message[]) : []
    } catch {
      return []
    }
  })

  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<ReturnType<typeof chatStream> | null>(null)
  const streamBufRef = useRef("")

  const suggestedPrompts = buildSuggestedPrompts(project)

  // Persist messages whenever they change
  useEffect(() => {
    if (!localKey || messages.length === 0) return
    try {
      localStorage.setItem(localKey, JSON.stringify(messages))
    } catch {
      // quota exceeded — ignore
    }
  }, [messages, localKey])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim()
      if (!msg || isStreaming) return

      if (!sessionId) {
        setError("Run the documentation pipeline first to enable chat.")
        return
      }

      setInput("")
      setError(null)

      const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg }
      setMessages((prev) => [...prev, userMsg])
      setIsStreaming(true)
      setStreamingContent("")
      streamBufRef.current = ""

      abortRef.current = chatStream(projectId, msg, {
        onToken(token) {
          streamBufRef.current += token
          setStreamingContent(streamBufRef.current)
        },
        onDone() {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "ai",
            content: streamBufRef.current,
          }
          setMessages((prev) => [...prev, aiMsg])
          setStreamingContent("")
          streamBufRef.current = ""
          setIsStreaming(false)
        },
        onError(err) {
          if (err?.name !== "AbortError") {
            setError("Failed to get a response. Please try again.")
          }
          setStreamingContent("")
          streamBufRef.current = ""
          setIsStreaming(false)
        },
      })
    },
    [input, isStreaming, sessionId, projectId],
  )

  const handleStop = () => {
    abortRef.current?.abort()
    if (streamBufRef.current) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: streamBufRef.current + " *(stopped)*",
        },
      ])
    }
    setStreamingContent("")
    streamBufRef.current = ""
    setIsStreaming(false)
  }

  const handleClear = async () => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setStreamingContent("")
    setMessages([])
    if (localKey) localStorage.removeItem(localKey)
    try {
      await chatApi.reset(projectId)
    } catch {
      // ignore — history cleared locally regardless
    }
  }

  const isEmpty = messages.length === 0 && !isStreaming

  return (
    <Card className="flex flex-col h-full border-0 rounded-none shadow-none">
      {/* Header */}
      <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-5 w-5 text-primary shrink-0" />
          <CardTitle className="text-sm font-medium truncate">AI Assistant</CardTitle>
          {project.meta?.name && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
              {project.meta.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && !isStreaming && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Clear conversation"
              onClick={handleClear}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Body */}
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* No pipeline warning */}
          {!sessionId && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Run the documentation pipeline on this project to enable AI chat.
            </div>
          )}

          {/* Empty state — suggested prompts */}
          {isEmpty && sessionId && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center pt-2">
                Ask me anything about{" "}
                <strong>{project.meta?.name ?? "this codebase"}</strong>
              </p>
              <div className="grid gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-foreground/80 hover:bg-muted/50 hover:text-foreground transition-colors"
                  >
                    <Sparkles className="inline h-3 w-3 mr-1.5 text-primary opacity-60" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "ai" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm max-w-[83%]",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {msg.role === "user" ? (
                  <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:my-2 [&_p]:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatComponents}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming response */}
          {isStreaming && (
            <div className="flex gap-2.5 justify-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-lg px-3 py-2 text-sm bg-muted max-w-[83%]">
                {streamingContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:my-2 [&_p]:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatComponents}>
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-border shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={sessionId ? "Ask about this codebase…" : "Pipeline required first…"}
              className="flex-1 text-sm h-9"
              disabled={isStreaming || !sessionId}
            />
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0"
                title="Stop"
                onClick={handleStop}
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={!input.trim() || !sessionId}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
          {activeSection && (
            <p className="mt-1.5 text-[10px] text-muted-foreground truncate">
              Context: {activeSection}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
