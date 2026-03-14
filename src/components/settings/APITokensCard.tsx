/**
 * API Tokens Management Component
 * Allows users to generate, list, and revoke API tokens for MCP, CLI, etc.
 */

import { useState, useEffect, useCallback } from "react"
import { authApi, ApiException } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy, Check, Trash2, Eye, EyeOff, Copy as CopyIcon, Plus, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

interface Token {
  id: string
  name: string
  description?: string
  lastChars: string
  scope: string[]
  expiresAt?: string
  lastUsedAt?: string
  createdAt: string
  isRevoked: boolean
}

interface TokenStats {
  total: number
  active: number
  revoked: number
  expiringSoon: number
}

interface NewToken {
  plainToken: string
  id: string
  name: string
  lastChars: string
  scope: string[]
  expiresAt?: string
  createdAt: string
}

export function APITokensCard() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newToken, setNewToken] = useState<NewToken | null>(null)
  const [showNewToken, setShowNewToken] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    scope: ["api"],
    expiresAt: "",
  })
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null)

  const loadTokens = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await authApi.listTokens()
      setTokens(data.tokens)
      setStats(data.stats)
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to load tokens" })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTokens()
  }, [loadTokens])

  const handleCreateToken = async () => {
    setFeedback(null)
    if (!createForm.name.trim()) {
      setFeedback({ type: "error", message: "Token name is required" })
      return
    }

    setIsCreating(true)
    try {
      const result = await authApi.createToken({
        name: createForm.name,
        description: createForm.description,
        scope: createForm.scope,
        expiresAt: createForm.expiresAt ? new Date(createForm.expiresAt).toISOString() : undefined,
      })

      setNewToken(result)
      setShowNewToken(true)
      setCreateForm({ name: "", description: "", scope: ["api"], expiresAt: "" })
      setShowCreateDialog(false)

      // Refresh list
      await loadTokens()
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message ?? "Failed to create token",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyToken = () => {
    if (!newToken) return
    navigator.clipboard.writeText(newToken.plainToken)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 2000)
  }

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm("Revoke this token? Applications using it will stop working.")) return

    setRevokeLoading(tokenId)
    try {
      await authApi.revokeToken(tokenId)
      setFeedback({ type: "success", message: "Token revoked" })
      await loadTokens()
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message ?? "Failed to revoke token" })
    } finally {
      setRevokeLoading(null)
    }
  }

  return (
    <>
      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>API Tokens</CardTitle>
            <CardDescription>
              Create tokens for API access, MCP integration, CLI, and more.
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Token
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stats ─────────────────────────────────────────────────────── */}
          {stats && !isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted p-3">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3">
                <div className="text-sm text-green-700 dark:text-green-200">Active</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
                <div className="text-sm text-red-700 dark:text-red-200">Revoked</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.revoked}</div>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-3">
                <div className="text-sm text-orange-700 dark:text-orange-200">Expiring Soon</div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.expiringSoon}</div>
              </div>
            </div>
          )}

          {/* Token List ────────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground">No tokens yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{token.name}</div>
                        {token.description && (
                          <div className="text-sm text-muted-foreground">{token.description}</div>
                        )}
                      </div>
                      {token.isRevoked && (
                        <Badge variant="destructive" className="ml-auto">
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-xs">...{token.lastChars}</span>
                      <span>•</span>
                      <span>{token.scope.join(", ")}</span>
                      <span>•</span>
                      <span>Created {format(new Date(token.createdAt), "MMM d, yyyy")}</span>
                      {token.lastUsedAt && (
                        <>
                          <span>•</span>
                          <span>Last used {format(new Date(token.lastUsedAt), "MMM d, yyyy")}</span>
                        </>
                      )}
                      {token.expiresAt && (
                        <>
                          <span>•</span>
                          <span>Expires {format(new Date(token.expiresAt), "MMM d, yyyy")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeToken(token.id)}
                    disabled={revokeLoading === token.id || token.isRevoked}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {feedback && (
            <div
              className={`rounded-lg p-3 text-sm ${
                feedback.type === "success"
                  ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-200"
                  : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200"
              }`}
            >
              {feedback.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Token Dialog ────────────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Token</DialogTitle>
            <DialogDescription>
              Create a new API token for authentication with MCP, CLI, or other integrations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="token-name">Token Name</Label>
              <Input
                id="token-name"
                placeholder="e.g., My MCP Server, CI Pipeline"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="token-desc">Description (optional)</Label>
              <Input
                id="token-desc"
                placeholder="What will you use this token for?"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>

            <div>
              <Label>Scopes</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Select which APIs this token can access. For MCP, enable <strong>mcp</strong> scope.
              </p>
              <div className="space-y-2">
                {["api", "mcp", "cli"].map((scope) => (
                  <div key={scope} className="flex items-center space-x-2">
                    <Checkbox
                      id={`scope-${scope}`}
                      checked={createForm.scope.includes(scope)}
                      onCheckedChange={(checked) => {
                        setCreateForm({
                          ...createForm,
                          scope: checked
                            ? [...createForm.scope, scope]
                            : createForm.scope.filter((s) => s !== scope),
                        })
                      }}
                    />
                    <label htmlFor={`scope-${scope}`} className="text-sm cursor-pointer flex-1">
                      <span className="font-medium">{scope.toUpperCase()}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {scope === "api" && "(General API access)"}
                        {scope === "mcp" && "(Claude, Cursor, VS Code integration)"}
                        {scope === "cli" && "(Command-line interface)"}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="token-expire">Expiration (optional)</Label>
              <Input
                id="token-expire"
                type="date"
                value={createForm.expiresAt}
                onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for no expiration</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateToken} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Token Display Dialog ──────────────────────────────────── */}
      {newToken && (
        <Dialog open={showNewToken} onOpenChange={setShowNewToken}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-green-600">Token Created Successfully!</DialogTitle>
              <DialogDescription className="text-base">
                Save this token now. You won't be able to see it again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Your Token</Label>
                <div className="relative mt-2">
                  <code className="block bg-muted p-3 rounded-lg font-mono text-sm break-all pr-10">
                    {newToken.plainToken}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={handleCopyToken}
                  >
                    {tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
                <div><strong>Token Name:</strong> {newToken.name}</div>
                <div><strong>Last Chars:</strong> <code className="text-xs bg-muted px-2 py-1 rounded">...{newToken.lastChars}</code></div>
                <div><strong>Scopes:</strong> {newToken.scope.join(", ")}</div>
              </div>

              {newToken.scope.includes("mcp") && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 space-y-2 text-sm">
                  <div><strong className="text-blue-700 dark:text-blue-200">🚀 Ready for MCP</strong></div>
                  <p className="text-blue-700 dark:text-blue-200 text-xs">
                    Use this token to configure Claude, Cursor, VS Code, and other MCP clients.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    See <a href="https://docnineai.com/docs/mcp" target="_blank" rel="noopener noreferrer" className="underline">MCP Setup Guide</a> for configuration steps.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowNewToken(false)} className="w-full">
                I've saved my token
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
