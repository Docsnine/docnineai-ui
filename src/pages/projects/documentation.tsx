import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useProjectStore } from "@/store/projects"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { ArrowLeft, Book, ShieldAlert, FileCode2, Menu, Download, Share2, AlertTriangle, CheckCircle2, Edit3, Eye, Bot, Save, X, Bold, Italic, List, ListOrdered, Code, Link as LinkIcon } from "lucide-react"
import Markdown from "react-markdown"
import { cn } from "@/lib/utils"
import { AIChatPanel } from "@/components/projects/ai-chat"

const mockDocs = {
  readme: `
# docnine-frontend

This is the frontend application for Docnine, an AI-powered documentation and security analysis tool.

## Getting Started

First, run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture

The application is built using React, Vite, and Tailwind CSS. State management is handled by Zustand.

### Key Components

- \`DashboardLayout\`: Main layout wrapper for authenticated routes.
- \`ProjectOverview\`: Displays summary of a specific project.
- \`LiveAnalysis\`: Real-time log viewer for ongoing analysis.
`,
  api: `
# API Reference

## Authentication

### \`POST /api/auth/login\`

Authenticates a user and returns a JWT token.

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "securepassword"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123",
    "name": "John Doe"
  }
}
\`\`\`
`,
  security: [
    { id: 1, severity: "critical", title: "Hardcoded Secret", description: "Found a hardcoded API key in src/config.ts line 42." },
    { id: 2, severity: "warning", title: "Outdated Dependency", description: "Package 'lodash' is outdated and has known vulnerabilities." },
    { id: 3, severity: "info", title: "Missing Rate Limiting", description: "API endpoints do not implement rate limiting." }
  ]
}

export function DocumentationViewerPage() {
  const { id } = useParams<{ id: string }>()
  const project = useProjectStore(state => state.projects.find(p => p.id === id))
  const [activeTab, setActiveTab] = useState<"readme" | "api" | "security">("readme")
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [version, setVersion] = useState("v1.0.0")
  
  // State for edited content
  const [editedDocs, setEditedDocs] = useState({
    readme: mockDocs.readme,
    api: mockDocs.api,
  })

  if (!project) return <div>Project not found</div>

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive" className="ml-auto">Critical</Badge>
      case "warning": return <Badge variant="warning" className="ml-auto">Warning</Badge>
      case "info": return <Badge variant="secondary" className="ml-auto">Info</Badge>
      default: return null
    }
  }

  const handleSave = () => {
    // In a real app, save to backend
    setIsEditMode(false)
  }

  const handleCancelEdit = () => {
    // Reset to original (or last saved)
    setEditedDocs({
      readme: mockDocs.readme,
      api: mockDocs.api,
    })
    setIsEditMode(false)
  }

  const getCurrentContent = () => {
    if (activeTab === "readme") return editedDocs.readme
    if (activeTab === "api") return editedDocs.api
    return ""
  }

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById("markdown-editor") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = activeTab === "readme" ? editedDocs.readme : editedDocs.api
    const selectedText = text.substring(start, end)
    
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end)
    
    setEditedDocs({
      ...editedDocs,
      [activeTab]: newText
    })
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, end + prefix.length)
    }, 0)
  }

  const MarkdownToolbar = () => (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown("**", "**")} title="Bold">
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown("*", "*")} title="Italic">
        <Italic className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown("- ")} title="Bullet List">
        <List className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown("1. ")} title="Numbered List">
        <ListOrdered className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown("`", "`")} title="Inline Code">
        <Code className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown("[", "](url)")} title="Link">
        <LinkIcon className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-7xl mx-auto">
      <div className="flex items-center justify-between shrink-0 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="-ml-2">
            <Link to={`/projects/${project.id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              Documentation
              <Select value={version} onChange={(e) => setVersion(e.target.value)} className="w-28 h-8 text-xs font-normal">
                <option value="v1.0.0">v1.0.0 (Latest)</option>
                <option value="v0.9.0">v0.9.0</option>
                <option value="v0.8.5">v0.8.5</option>
              </Select>
            </h1>
            <p className="text-sm text-muted-foreground">{project.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== "security" && (
            isEditMode ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit Document
              </Button>
            )
          )}
          <Button 
            variant={isChatOpen ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(isChatOpen && "bg-primary text-primary-foreground")}
          >
            <Bot className="mr-2 h-4 w-4" /> Ask AI
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden border border-border rounded-xl bg-card shadow-sm">
        {/* Sidebar */}
        <div className={cn(
          "w-64 border-r border-border bg-muted/20 flex flex-col transition-all duration-300 shrink-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full hidden"
        )}>
          <div className="p-4 border-b border-border font-semibold flex items-center justify-between">
            Contents
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsSidebarOpen(false)}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            <button
              onClick={() => { setActiveTab("readme"); setIsEditMode(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                activeTab === "readme" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Book className="h-4 w-4" /> README
            </button>
            <button
              onClick={() => { setActiveTab("api"); setIsEditMode(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                activeTab === "api" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <FileCode2 className="h-4 w-4" /> API Reference
            </button>
            <button
              onClick={() => { setActiveTab("security"); setIsEditMode(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                activeTab === "security" ? "bg-destructive/10 text-destructive font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ShieldAlert className="h-4 w-4" /> Security Findings
              <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">3</Badge>
            </button>
          </nav>
        </div>

        {/* Main Content */}
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
            <div className={cn("mx-auto", !isEditMode ? "max-w-3xl" : "h-full flex flex-col")}>
              {activeTab === "readme" && (
                isEditMode ? (
                  <div className="flex flex-col h-full border-0">
                    <MarkdownToolbar />
                    <textarea 
                      id="markdown-editor"
                      className="flex-1 w-full p-6 font-mono text-sm bg-background border-0 focus:outline-none resize-none"
                      value={editedDocs.readme}
                      onChange={(e) => setEditedDocs({...editedDocs, readme: e.target.value})}
                    />
                  </div>
                ) : (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <Markdown>{editedDocs.readme}</Markdown>
                  </div>
                )
              )}
              
              {activeTab === "api" && (
                isEditMode ? (
                  <div className="flex flex-col h-full border-0">
                    <MarkdownToolbar />
                    <textarea 
                      id="markdown-editor"
                      className="flex-1 w-full p-6 font-mono text-sm bg-background border-0 focus:outline-none resize-none"
                      value={editedDocs.api}
                      onChange={(e) => setEditedDocs({...editedDocs, api: e.target.value})}
                    />
                  </div>
                ) : (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <Markdown>{editedDocs.api}</Markdown>
                  </div>
                )
              )}

              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">Security Findings</h2>
                    <p className="text-muted-foreground">AI analysis identified the following security concerns and bad practices.</p>
                  </div>
                  
                  <div className="grid gap-4">
                    {mockDocs.security.map((finding) => (
                      <Card key={finding.id} className={cn(
                        "border-l-4",
                        finding.severity === "critical" ? "border-l-destructive" :
                        finding.severity === "warning" ? "border-l-yellow-500" : "border-l-blue-500"
                      )}>
                        <CardHeader className="py-4 flex flex-row items-center gap-4 space-y-0">
                          {finding.severity === "critical" ? <AlertTriangle className="h-5 w-5 text-destructive" /> :
                           finding.severity === "warning" ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> :
                           <Info className="h-5 w-5 text-blue-500" />}
                          <CardTitle className="text-base font-semibold">{finding.title}</CardTitle>
                          {getSeverityBadge(finding.severity)}
                        </CardHeader>
                        <CardContent className="py-4 pt-0 text-sm text-muted-foreground">
                          {finding.description}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
        {isChatOpen && (
          <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
            <AIChatPanel 
              context={getCurrentContent()} 
              onClose={() => setIsChatOpen(false)} 
            />
          </div>
        )}
      </div>
    </div>
  )
}

function Info(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}


