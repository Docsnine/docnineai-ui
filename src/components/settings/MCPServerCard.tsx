/**
 * MCP Server Card Component
 * Displays MCP server configuration for the current project
 * Shows the URL and instructions for connecting in Claude, Cursor, VS Code, etc.
 */

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Check, ExternalLink, Zap } from "lucide-react"
import { projectsApi, ApiException } from "@/lib/api"

interface MCPInfo {
    projectId: string
    projectName: string
    mcpUrl: string
    status: string
}

interface MCPServerCardProps {
    projectId?: string
}

export function MCPServerCard({ projectId: propProjectId }: MCPServerCardProps) {
    const { projectId: paramProjectId } = useParams<{ projectId: string }>()
    const projectId = propProjectId || paramProjectId
    const [mcpInfo, setMcpInfo] = useState<MCPInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [copiedUrl, setCopiedUrl] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchMCPInfo = async () => {
            try {
                setIsLoading(true)
                setError(null)
                const response = await projectsApi.getMCPInfo(projectId!)
                setMcpInfo(response)
            } catch (err) {
                console.error("Failed to fetch MCP info:", err)
                setError("Failed to load MCP configuration")
            } finally {
                setIsLoading(false)
            }
        }

        if (projectId) {
            fetchMCPInfo()
        }
    }, [projectId])

    const handleCopyUrl = async () => {
        if (mcpInfo?.mcpUrl) {
            await navigator.clipboard.writeText(mcpInfo.mcpUrl)
            setCopiedUrl(true)
            setTimeout(() => setCopiedUrl(false), 2000)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>MCP Server</CardTitle>
                    <CardDescription>Loading server configuration...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="h-10 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 bg-gray-200 rounded animate-pulse" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (error || !mcpInfo) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardHeader>
                    <CardTitle>MCP Server</CardTitle>
                    <CardDescription className="text-red-700">
                        {error || "Failed to load MCP configuration"}
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const claudeConfig = {
        mcpServers: {
            docnine: {
                url: mcpInfo.mcpUrl,
                env: {
                    "DOCNINE_TOKEN": "your-api-token-from-dashboard"
                }
            }
        }
    }

    const cursorConfig = claudeConfig

    const vscodeConfig = {
        tools: [
            {
                type: "mcp",
                name: "docnine",
                url: mcpInfo.mcpUrl,
                env: {
                    "DOCNINE_TOKEN": "your-api-token-from-dashboard"
                }
            }
        ]
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle>MCP Server</CardTitle>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Ready
                        </Badge>
                    </div>
                    <a
                        href="https://docnineai.com/docs/mcp-setup"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                        <span className="text-sm">Setup Guide</span>
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
                <CardDescription>
                    Access this project's documentation, security audits, and analysis via Claude, Cursor, or VS Code
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* MCP URL Section */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold">MCP Server URL</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="text"
                            value={mcpInfo.mcpUrl}
                            readOnly
                            className="font-mono text-sm bg-gray-50"
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopyUrl}
                            className="whitespace-nowrap"
                        >
                            {copiedUrl ? (
                                <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-gray-600">
                        Point your AI assistant to this URL. Project ID is included automatically.
                    </p>
                </div>

                {/* Project ID */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">Project ID</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="text"
                            value={mcpInfo.projectId}
                            readOnly
                            className="font-mono text-sm bg-gray-50"
                        />
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(mcpInfo.projectId)}
                        >
                            <Copy className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Configuration Instructions */}
                <div className="space-y-4">
                    <Label className="text-base font-semibold flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Configuration
                    </Label>

                    <Tabs defaultValue="claude" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="claude">Claude</TabsTrigger>
                            <TabsTrigger value="cursor">Cursor</TabsTrigger>
                            <TabsTrigger value="vscode">VS Code</TabsTrigger>
                        </TabsList>

                        <TabsContent value="claude" className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                <p className="text-sm font-medium">
                                    Edit your Claude Desktop config:
                                </p>
                                <p className="text-xs text-gray-600">
                                    <strong>Mac:</strong> <code className="bg-white px-2 py-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code>
                                </p>
                                <p className="text-xs text-gray-600 mb-3">
                                    <strong>Windows:</strong> <code className="bg-white px-2 py-1 rounded">%APPDATA%\Claude\claude_desktop_config.json</code>
                                </p>

                                <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(claudeConfig, null, 2)}
                                </pre>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(JSON.stringify(claudeConfig, null, 2))}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Config
                                </Button>

                                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-800">
                                    <strong>Next:</strong> Replace <code className="bg-blue-100 px-1 rounded">your-api-token-from-dashboard</code> with a token from your{" "}
                                    <a href="#api-tokens" className="text-blue-600 underline">
                                        API Tokens
                                    </a>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="cursor" className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                <p className="text-sm font-medium">
                                    Open Cursor Settings → Features → MCP
                                </p>
                                <p className="text-xs text-gray-600 mb-3">
                                    Add a new MCP server with this configuration:
                                </p>

                                <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(cursorConfig, null, 2)}
                                </pre>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(JSON.stringify(cursorConfig, null, 2))}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Config
                                </Button>

                                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-800">
                                    <strong>Next:</strong> Replace <code className="bg-blue-100 px-1 rounded">your-api-token-from-dashboard</code> with a token from your{" "}
                                    <a href="#api-tokens" className="text-blue-600 underline">
                                        API Tokens
                                    </a>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="vscode" className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                <p className="text-sm font-medium">
                                    Open Continue extension settings (`.continue/config.json`)
                                </p>
                                <p className="text-xs text-gray-600 mb-3">
                                    Add this to your tools array:
                                </p>

                                <pre className="bg-white p-3 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(vscodeConfig.tools[0], null, 2)}
                                </pre>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(JSON.stringify(vscodeConfig.tools[0], null, 2))}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Config
                                </Button>

                                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-800">
                                    <strong>Next:</strong> Replace <code className="bg-blue-100 px-1 rounded">your-api-token-from-dashboard</code> with a token from your{" "}
                                    <a href="#api-tokens" className="text-blue-600 underline">
                                        API Tokens
                                    </a>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Features */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-blue-900">Available Tools</p>
                    <ul className="text-xs text-blue-800 grid grid-cols-2 gap-2">
                        <li>✓ Project Documentation</li>
                        <li>✓ API Reference</li>
                        <li>✓ Security Audits</li>
                        <li>✓ Code Analysis</li>
                        <li>✓ Schema Documentation</li>
                        <li>✓ Q&A Search</li>
                        <li>✓ Component Docs</li>
                        <li>✓ Change Tracking</li>
                    </ul>
                </div>

                {/* Authentication Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-amber-900">Authentication Required</p>
                    <p className="text-xs text-amber-800">
                        Each request must include an API token in the Authorization header. Generate one in your{" "}
                        <a href="#api-tokens" className="text-amber-600 underline font-semibold">
                            API Tokens
                        </a>{" "}
                        section.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
