import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Send, User, Loader2, X } from "lucide-react"
import { GoogleGenAI } from "@google/genai"
import Markdown from "react-markdown"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "ai"
  content: string
}

interface AIChatPanelProps {
  context: string
  onClose: () => void
}

export function AIChatPanel({ context, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Hello! I'm your AI documentation assistant. You can ask me questions about this document, or ask me to explain specific parts of the codebase."
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      
      const prompt = `
        You are an AI assistant helping a developer understand their project's documentation.
        Here is the current documentation context:
        
        ${context.substring(0, 15000)} // Limit context to avoid token limits
        
        User question: ${userMessage}
        
        Please provide a helpful, concise, and accurate answer based on the documentation context provided.
      `

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      })

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "ai", 
        content: response.text || "I couldn't generate a response." 
      }])
    } catch (error) {
      console.error("Error generating AI response:", error)
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "ai", 
        content: "Sorry, I encountered an error while trying to answer your question. Please check your API key or try again later." 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-full border-0 rounded-none shadow-none">
      <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm font-medium">Docnine AI Assistant</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex gap-3 max-w-[85%]",
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn(
                "rounded-lg px-3 py-2 text-sm",
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {msg.role === "user" ? (
                  msg.content
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-lg px-3 py-2 text-sm bg-muted flex items-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t border-border shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this document..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
