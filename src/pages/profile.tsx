import { useState, useEffect } from "react"
import { format } from "date-fns"
import { useAuthStore } from "@/store/auth"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    User,
    Mail,
    Lock,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Save,
    Eye,
    EyeOff,
    ShieldCheck,
} from "lucide-react"

// ── Inline feedback banner ───────────────────────────────────────────────────
function Feedback({ type, message }: { type: "success" | "error"; message: string }) {
    return (
        <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${type === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
        >
            {type === "success"
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <AlertTriangle className="h-4 w-4 shrink-0" />
            }
            {message}
        </div>
    )
}

// ── Profile info form ────────────────────────────────────────────────────────
function ProfileInfoCard() {
    const { user, setTokens } = useAuthStore()
    const [name, setName] = useState(user?.name ?? "")
    const [email, setEmail] = useState(user?.email ?? "")
    const [isLoading, setIsLoading] = useState(false)
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

    // Keep form in sync if the store user changes (e.g. after refresh)
    useEffect(() => {
        if (user) {
            setName(user.name)
            setEmail(user.email)
        }
    }, [user])

    const isDirty = name !== (user?.name ?? "") || email !== (user?.email ?? "")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isDirty) return
        setIsLoading(true)
        setFeedback(null)
        try {
            const patches: { name?: string; email?: string } = {}
            if (name !== user?.name) patches.name = name.trim()
            if (email !== user?.email) patches.email = email.trim()
            const data = await authApi.updateProfile(patches)
            // Sync the store — preserve the existing access token
            const { getAccessToken } = await import("@/lib/api")
            const token = getAccessToken()
            if (token) setTokens(data.user, token)
            setFeedback({ type: "success", message: "Profile updated successfully." })
        } catch (err: any) {
            setFeedback({
                type: "error",
                message: err?.message ?? "Failed to update profile.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                </CardTitle>
                <CardDescription>Update your display name and email address.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {feedback && <Feedback {...feedback} />}

                    {/* Avatar placeholder */}
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary select-none">
                            {(user?.name?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div>
                            <p className="font-medium">{user?.name}</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="profile-name">Full name</Label>
                            <div className="relative">
                                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="profile-name"
                                    className="pl-9"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={80}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile-email">
                                Email
                                {user?.emailVerified !== undefined && (
                                    <span className="ml-2">
                                        {user.emailVerified
                                            ? <Badge variant="success" className="text-[10px] py-0 px-1.5">Verified</Badge>
                                            : <Badge variant="warning" className="text-[10px] py-0 px-1.5">Unverified</Badge>
                                        }
                                    </span>
                                )}
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="profile-email"
                                    type="email"
                                    className="pl-9"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <Button type="submit" disabled={!isDirty || isLoading} className="gap-2">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save changes
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

// ── Change password form ─────────────────────────────────────────────────────
function ChangePasswordCard() {
    const { clearAuth } = useAuthStore()
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmNewPassword, setConfirmNewPassword] = useState("")
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNew, setShowNew] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

    const passwordsMatch = newPassword === confirmNewPassword
    const canSubmit = currentPassword && newPassword.length >= 8 && confirmNewPassword && passwordsMatch

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return
        setIsLoading(true)
        setFeedback(null)
        try {
            await authApi.changePassword({ currentPassword, newPassword, confirmNewPassword })
            setFeedback({
                type: "success",
                message: "Password changed. Your other sessions have been signed out.",
            })
            setCurrentPassword("")
            setNewPassword("")
            setConfirmNewPassword("")
            // The backend clears the refresh cookie; sign out the current session too
            setTimeout(() => { clearAuth() }, 2000)
        } catch (err: any) {
            setFeedback({
                type: "error",
                message: err?.message ?? "Failed to change password.",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Change Password
                </CardTitle>
                <CardDescription>
                    Choose a strong password. You will be signed out of all sessions after changing it.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {feedback && <Feedback {...feedback} />}

                    <div className="space-y-2">
                        <Label htmlFor="current-password">Current password</Label>
                        <div className="relative">
                            <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="current-password"
                                type={showCurrent ? "text" : "password"}
                                className="pl-9 pr-9"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowCurrent((v) => !v)}
                                tabIndex={-1}
                            >
                                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New password</Label>
                            <div className="relative">
                                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="new-password"
                                    type={showNew ? "text" : "password"}
                                    className="pl-9 pr-9"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowNew((v) => !v)}
                                    tabIndex={-1}
                                >
                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {newPassword && newPassword.length < 8 && (
                                <p className="text-xs text-destructive">Minimum 8 characters.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-new-password">Confirm new password</Label>
                            <div className="relative">
                                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirm-new-password"
                                    type="password"
                                    className={`pl-9 ${confirmNewPassword && !passwordsMatch ? "border-destructive" : ""}`}
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            {confirmNewPassword && !passwordsMatch && (
                                <p className="text-xs text-destructive">Passwords do not match.</p>
                            )}
                        </div>
                    </div>

                    <Button type="submit" disabled={!canSubmit || isLoading} variant="destructive" className="gap-2">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Change password
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

// ── Account info card ────────────────────────────────────────────────────────
function AccountInfoCard() {
    const { user } = useAuthStore()
    if (!user) return null

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-5 w-5" />
                    Account Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 text-sm">
                    <div>
                        <dt className="text-muted-foreground text-xs mb-0.5">Account ID</dt>
                        <dd className="font-mono text-xs truncate">{user.id}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground text-xs mb-0.5">Member since</dt>
                        <dd>{format(new Date(user.createdAt), "d MMM yyyy")}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground text-xs mb-0.5">Email status</dt>
                        <dd>
                            {user.emailVerified
                                ? <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Verified</span>
                                : <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Not verified</span>
                            }
                        </dd>
                    </div>
                    {user.githubUsername && (
                        <div>
                            <dt className="text-muted-foreground text-xs mb-0.5">GitHub</dt>
                            <dd className="font-medium">@{user.githubUsername}</dd>
                        </div>
                    )}
                </dl>
            </CardContent>
        </Card>
    )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function ProfilePage() {
    return (
        <div className="flex items-center justify-center py-7">
            <div className="max-w-2xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
                    <p className="text-muted-foreground mt-1">Manage your personal information and password.</p>
                </div>

                <AccountInfoCard />
                <ProfileInfoCard />
                <ChangePasswordCard />
            </div>
        </div>
    )
}
