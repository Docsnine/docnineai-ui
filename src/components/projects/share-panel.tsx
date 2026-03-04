import { useState, useEffect, useCallback } from "react"
import { UserPlus, X, Mail, Shield, Eye, Pencil, RotateCcw, Ban, Loader2, Check, AlertCircle, User } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { sharingApi, ApiShare } from "@/lib/api"
import { formatDistanceToNow } from "date-fns"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SharePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  isOwner: boolean
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: "owner" | "editor" | "viewer" }) {
  if (role === "owner")
    return (
      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
        <User className="h-3 w-3 text-yellow-500" /> Owner
      </Badge>
    )
  if (role === "editor")
    return (
      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
        <Pencil className="h-3 w-3 text-blue-500" /> Editor
      </Badge>
    )
  return (
    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
      <Eye className="h-3 w-3 text-muted-foreground" /> Viewer
    </Badge>
  )
}

function StatusBadge({ status }: { status: "pending" | "accepted" | "revoked" }) {
  if (status === "accepted")
    return <span className="text-xs text-green-600 font-medium">Active</span>
  if (status === "pending")
    return <span className="text-xs text-yellow-600 font-medium">Pending</span>
  return <span className="text-xs text-muted-foreground">Revoked</span>
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export function SharePanel({ open, onOpenChange, projectId, projectName, isOwner }: SharePanelProps) {
  const [shares, setShares] = useState<ApiShare[]>([])
  const [isLoadingShares, setIsLoadingShares] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer")
  const [isInviting, setIsInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Per-row action loading state
  const [rowAction, setRowAction] = useState<{ id: string; action: string } | null>(null)

  // ── Fetch access list ──────────────────────────────────────
  const loadShares = useCallback(async () => {
    if (!isOwner) return
    setIsLoadingShares(true)
    setLoadError(null)
    try {
      const data = await sharingApi.listAccess(projectId)
      setShares(data.shares)
    } catch (err: any) {
      setLoadError(err?.message ?? "Failed to load access list.")
    } finally {
      setIsLoadingShares(false)
    }
  }, [projectId, isOwner])

  useEffect(() => {
    if (open) {
      loadShares()
      setInviteResult(null)
      setInviteEmail("")
      setInviteRole("viewer")
    }
  }, [open, loadShares])

  // ── Invite ─────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteResult({ type: "error", message: "Please enter a valid email address." })
      return
    }

    setIsInviting(true)
    setInviteResult(null)
    try {
      const data = await sharingApi.invite(projectId, [{ email, role: inviteRole }])
      const result = data.results[0]
      if (result?.status === "skipped") {
        setInviteResult({ type: "error", message: result.reason ?? "Could not invite." })
      } else {
        setInviteResult({ type: "success", message: `Invite sent to ${email}!` })
        setInviteEmail("")
        await loadShares()
      }
    } catch (err: any) {
      setInviteResult({ type: "error", message: err?.message ?? "Failed to send invite." })
    } finally {
      setIsInviting(false)
    }
  }

  // ── Role change ────────────────────────────────────────────
  const handleRoleChange = async (shareId: string, newRole: "viewer" | "editor") => {
    setRowAction({ id: shareId, action: "role" })
    try {
      const data = await sharingApi.changeRole(projectId, shareId, newRole)
      setShares((s) => s.map((sh) => (sh._id === shareId ? { ...sh, role: data.share.role } : sh)))
    } catch (err: any) {
      alert(err?.message ?? "Failed to change role.")
    } finally {
      setRowAction(null)
    }
  }

  // ── Revoke ─────────────────────────────────────────────────
  const handleRevoke = async (shareId: string, email: string) => {
    if (!confirm(`Remove ${email}'s access?`)) return
    setRowAction({ id: shareId, action: "revoke" })
    try {
      await sharingApi.revokeAccess(projectId, shareId)
      setShares((s) => s.filter((sh) => sh._id !== shareId))
    } catch (err: any) {
      alert(err?.message ?? "Failed to revoke access.")
    } finally {
      setRowAction(null)
    }
  }

  // ── Resend ─────────────────────────────────────────────────
  const handleResend = async (shareId: string) => {
    setRowAction({ id: shareId, action: "resend" })
    try {
      await sharingApi.resendInvite(projectId, shareId)
      setShares((s) =>
        s.map((sh) =>
          sh._id === shareId
            ? { ...sh, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
            : sh,
        ),
      )
    } catch (err: any) {
      alert(err?.message ?? "Failed to resend invite.")
    } finally {
      setRowAction(null)
    }
  }

  // ── Cancel invite ──────────────────────────────────────────
  const handleCancel = async (shareId: string, email: string) => {
    if (!confirm(`Cancel invite for ${email}?`)) return
    setRowAction({ id: shareId, action: "cancel" })
    try {
      await sharingApi.cancelInvite(projectId, shareId)
      setShares((s) => s.filter((sh) => sh._id !== shareId))
    } catch (err: any) {
      alert(err?.message ?? "Failed to cancel invite.")
    } finally {
      setRowAction(null)
    }
  }

  const isRowBusy = (shareId: string) => rowAction?.id === shareId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Share "{projectName}"
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -mr-1 -mt-1"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {isOwner
              ? "Invite collaborators to view or edit this project's documentation."
              : "People who have access to this project."}
          </DialogDescription>
        </DialogHeader>

        {/* Invite form (owner only) */}
        {isOwner && (
          <form
            onSubmit={handleInvite}
            className="flex gap-2 items-end shrink-0 border-b border-border pb-4"
          >
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email address</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  className="pl-9"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isInviting}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "viewer" | "editor")}
                className="w-[110px]"
                disabled={isInviting}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </Select>
            </div>
            <Button type="submit" disabled={isInviting || !inviteEmail.trim()} className="shrink-0">
              {isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">Invite</span>
            </Button>
          </form>
        )}

        {/* Invite result banner */}
        {inviteResult && (
          <div
            className={`shrink-0 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              inviteResult.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {inviteResult.type === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {inviteResult.message}
          </div>
        )}

        {/* Access list */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
          {isLoadingShares ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {loadError}
            </div>
          ) : shares.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <UserPlus className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {isOwner ? "No one has been invited yet." : "No collaborators."}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1 px-1">
                {shares.length} {shares.length === 1 ? "person" : "people"} with access
              </p>
              {shares.map((share) => {
                const displayName =
                  share.inviteeUser?.name || share.inviteeUser?.email || share.inviteeEmail
                const busy = isRowBusy(share._id)

                return (
                  <div
                    key={share._id}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold uppercase">
                        {displayName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{displayName}</p>
                        {share.inviteeUser?.name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {share.inviteeEmail}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={share.status} />
                          {share.status === "pending" && (
                            <span className="text-xs text-muted-foreground">
                              · expires {formatDistanceToNow(new Date(share.expiresAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner ? (
                        <>
                          {/* Role selector */}
                          <Select
                            value={share.role}
                            onChange={(e) =>
                              handleRoleChange(share._id, e.target.value as "viewer" | "editor")
                            }
                            className="h-8 w-[100px] text-xs"
                            disabled={busy}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </Select>

                          {/* Pending-only: resend + cancel */}
                          {share.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Resend invite"
                              disabled={busy}
                              onClick={() => handleResend(share._id)}
                            >
                              {busy && rowAction?.action === "resend" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}

                          {/* Revoke / cancel */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title={share.status === "pending" ? "Cancel invite" : "Revoke access"}
                            disabled={busy}
                            onClick={() =>
                              share.status === "pending"
                                ? handleCancel(share._id, share.inviteeEmail)
                                : handleRevoke(share._id, share.inviteeEmail)
                            }
                          >
                            {busy && (rowAction?.action === "revoke" || rowAction?.action === "cancel") ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </>
                      ) : (
                        <RoleBadge role={share.role} />
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer note */}
        <div className="shrink-0 border-t border-border pt-3 text-xs text-muted-foreground">
          <p>
            <strong>Viewer</strong> — can read documentation and attachments.{" "}
            <strong>Editor</strong> — can also edit docs and upload files.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
