import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { format, differenceInDays } from "date-fns"
import {
    CreditCard,
    Trash2,
    Star,
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    PauseCircle,
    XCircle,
    Users,
    Plus,
    Minus,
    RefreshCw,
    ArrowUpDown,
    Check,
    TrendingUp,
    TrendingDown,
    ExternalLink,
    Smartphone,
    Building2,
    Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    billingApi,
    BillingPlan,
    InvoiceData,
    PaymentMethodData,
    SubscriptionData,
    UsageData,
} from "@/lib/api"
import { useSubscriptionStore, PLAN_LEVEL } from "@/store/subscription"
import { PlanBadge } from "@/components/billing/PlanBadge"
import { cn } from "@/lib/utils"

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtMoney(cents: number, currency = "USD") {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
    }).format(cents / 100)
}

function StatusBadge({ status }: { status: SubscriptionData["status"] }) {
    const MAP: Record<string, string> = {
        free: "bg-muted text-muted-foreground",
        trialing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        active: "bg-green-500/10 text-green-400 border-green-500/20",
        past_due: "bg-red-500/10 text-red-400 border-red-500/20",
        cancelled: "bg-muted text-muted-foreground",
        paused: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    }
    const LABEL: Record<string, string> = {
        free: "Free",
        trialing: "Trial",
        active: "Active",
        past_due: "Past Due",
        cancelled: "Cancelled",
        paused: "Paused",
    }
    return (
        <Badge variant="outline" className={cn("text-xs", MAP[status] ?? "")}>
            {LABEL[status] ?? status}
        </Badge>
    )
}

function InvoiceStatusBadge({ status }: { status: InvoiceData["status"] }) {
    const MAP: Record<string, string> = {
        paid: "bg-green-500/10 text-green-400 border-green-500/20",
        pending: "bg-amber-500/10 text-amber-400",
        failed: "bg-red-500/10 text-red-400",
        refunded: "bg-muted text-muted-foreground",
        void: "bg-muted text-muted-foreground",
    }
    return (
        <Badge variant="outline" className={cn("text-xs capitalize", MAP[status] ?? "")}>
            {status}
        </Badge>
    )
}

// ── Change plan modal ───────────────────────────────────────────────────────
function ChangePlanModal({
    open,
    onClose,
    currentPlan,
    currentCycle,
    onRefresh,
}: {
    open: boolean
    onClose: () => void
    currentPlan: string
    currentCycle: "monthly" | "annual" | null
    onRefresh: () => void
}) {
    const { plans, loadPlans } = useSubscriptionStore()
    const [cycle, setCycle] = useState<"monthly" | "annual">(currentCycle ?? "monthly")
    const [selected, setSelected] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [fetchingPlans, setFetchingPlans] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [resultMsg, setResultMsg] = useState<{ type: "success" | "redirect" | "scheduled"; text: string; link?: string } | null>(null)

    useEffect(() => {
        if (!open) { setSelected(null); setError(null); setResultMsg(null); return }
        if (plans.length === 0) {
            setFetchingPlans(true)
            loadPlans().finally(() => setFetchingPlans(false))
        }
    }, [open, plans.length, loadPlans])

    // Determine if selected plan is upgrade, downgrade, or same tier
    const currentLevel = PLAN_LEVEL[currentPlan] ?? 0
    const planDirection = (planId: string): "upgrade" | "downgrade" | "current" | "same" => {
        if (planId === currentPlan) return "current"
        const targetLevel = PLAN_LEVEL[planId] ?? 0
        if (targetLevel > currentLevel) return "upgrade"
        if (targetLevel < currentLevel) return "downgrade"
        return "same" // same tier, different cycle
    }

    async function handleConfirm() {
        if (!selected) return
        try {
            setLoading(true)
            setError(null)
            setResultMsg(null)
            const result = await billingApi.changePlan(selected, cycle)

            if (result.type === "upgrade") {
                if (result.paymentLink) {
                    // No saved card — must complete payment first
                    setResultMsg({
                        type: "redirect",
                        text: "You'll be redirected to complete payment.",
                        link: result.paymentLink,
                    })
                    // Give user a moment to read, then redirect
                    setTimeout(() => { window.location.href = result.paymentLink! }, 2000)
                } else {
                    // Saved card charged immediately
                    await onRefresh()
                    setResultMsg({ type: "success", text: "Upgraded successfully! Your new plan is now active." })
                    setTimeout(() => { setResultMsg(null); onClose() }, 2000)
                }
            } else if (result.type === "downgrade") {
                await onRefresh()
                const date = result.effectiveAt ? format(new Date(result.effectiveAt), "MMM d, yyyy") : "next renewal"
                setResultMsg({ type: "scheduled", text: `Downgrade scheduled — takes effect on ${date}.` })
                setTimeout(() => { setResultMsg(null); onClose() }, 3000)
            } else {
                // type === "none" — same plan/cycle
                setResultMsg({ type: "success", text: "No change needed — you're already on this plan." })
                setTimeout(() => { setResultMsg(null); onClose() }, 1500)
            }
        } catch (err: any) {
            setError(err?.message ?? "Failed to change plan.")
        } finally {
            setLoading(false)
        }
    }

    const displayPlans = plans.filter((p) => p.id !== "free" || currentPlan === "free")

    // Label for the confirm button
    const selectedPlanName = displayPlans.find(p => p.id === selected)?.name ?? selected ?? ""
    const selectedDirection = selected ? planDirection(selected) : null
    const confirmLabel = (() => {
        if (!selected) return "Select a plan"
        if (selectedDirection === "upgrade") return `Upgrade to ${selectedPlanName}`
        if (selectedDirection === "downgrade") return `Downgrade to ${selectedPlanName}`
        return `Switch to ${selectedPlanName}`
    })()

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Change Plan
                    </DialogTitle>
                    <DialogDescription>
                        Select a new plan. Changes take effect immediately or at next renewal.
                    </DialogDescription>
                </DialogHeader>

                {/* Billing cycle toggle */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
                    {(["monthly", "annual"] as const).map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setCycle(c)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
                                cycle === c
                                    ? "bg-background text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {c}
                            {c === "annual" && (
                                <span className="ml-1.5 text-[10px] text-green-400 font-semibold">SAVE 20%</span>
                            )}
                        </button>
                    ))}
                </div>

                {fetchingPlans ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {displayPlans.map((plan: BillingPlan) => {
                            const price = cycle === "annual" ? plan.prices.annual : plan.prices.monthly
                            const isCurrent = plan.id === currentPlan
                            const isSelected = selected === plan.id
                            const direction = planDirection(plan.id)
                            return (
                                <button
                                    key={plan.id}
                                    type="button"
                                    disabled={isCurrent}
                                    onClick={() => setSelected(isSelected ? null : plan.id)}
                                    className={cn(
                                        "relative text-left rounded-xl border p-3 transition-all focus:outline-none",
                                        isCurrent && "opacity-50 cursor-not-allowed border-border",
                                        isSelected && !isCurrent && "border-primary ring-2 ring-primary/30 bg-primary/5",
                                        !isSelected && !isCurrent && "border-border hover:border-primary/50 hover:bg-muted/40"
                                    )}
                                >
                                    {/* Status badge top-right */}
                                    {isCurrent && (
                                        <span className="absolute top-2 right-2 text-[9px] font-bold tracking-wide text-muted-foreground uppercase">Current</span>
                                    )}
                                    {isSelected && !isCurrent && (
                                        <Check className="absolute top-2 right-2 h-3.5 w-3.5 text-primary" />
                                    )}

                                    <p className="font-semibold text-sm pr-6">{plan.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{plan.tagline}</p>
                                    <p className="mt-2 text-lg font-bold">
                                        {price === 0 ? "Free" : `$${price}`}
                                        {price > 0 && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                                    </p>

                                    {/* Upgrade / Downgrade pill */}
                                    {!isCurrent && (
                                        <div className={cn(
                                            "mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5",
                                            direction === "upgrade"
                                                ? "bg-green-500/10 text-green-400"
                                                : direction === "downgrade"
                                                    ? "bg-amber-500/10 text-amber-400"
                                                    : "bg-muted text-muted-foreground"
                                        )}>
                                            {direction === "upgrade" && <TrendingUp className="h-2.5 w-2.5" />}
                                            {direction === "downgrade" && <TrendingDown className="h-2.5 w-2.5" />}
                                            {direction === "upgrade" ? "Upgrade" : direction === "downgrade" ? "Downgrade" : "Switch cycle"}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}

                {error && <p className="text-sm text-red-400">{error}</p>}
                {resultMsg?.type === "success" && (
                    <p className="text-sm text-green-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {resultMsg.text}
                    </p>
                )}
                {resultMsg?.type === "scheduled" && (
                    <p className="text-sm text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {resultMsg.text}
                    </p>
                )}
                {resultMsg?.type === "redirect" && (
                    <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2.5 text-sm text-blue-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        <span>{resultMsg.text}</span>
                        <a
                            href={resultMsg.link}
                            className="ml-auto inline-flex items-center gap-1 underline underline-offset-2 whitespace-nowrap"
                        >
                            Pay now <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                )}

                <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" onClick={onClose} disabled={!!resultMsg}>Cancel</Button>
                    <Button
                        className="flex-1"
                        disabled={!selected || loading || !!resultMsg}
                        onClick={handleConfirm}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {confirmLabel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Current plan card ────────────────────────────────────────────────────────
function CurrentPlanCard({
    sub,
    usage,
    onRefresh,
}: {
    sub: SubscriptionData
    usage: UsageData | null
    onRefresh: () => void
}) {
    const [cancelOpen, setCancelOpen] = useState(false)
    const [pauseOpen, setPauseOpen] = useState(false)
    const [changePlanOpen, setChangePlanOpen] = useState(false)
    const [loading, setLoading] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleRefreshPlan() {
        try {
            setRefreshing(true)
            await onRefresh()
        } finally {
            setRefreshing(false)
        }
    }
    const [cancelReason, setCancelReason] = useState("")
    const [pauseMonths, setPauseMonths] = useState(1)

    async function handleCancel() {
        try {
            setLoading("cancel")
            setError(null)
            await billingApi.cancel(cancelReason || undefined)
            await onRefresh()
            setCancelOpen(false)
        } catch (err: any) {
            setError(err?.message ?? "Failed to cancel subscription.")
        } finally {
            setLoading(null)
        }
    }

    async function handlePause() {
        try {
            setLoading("pause")
            setError(null)
            await billingApi.pause(pauseMonths)
            await onRefresh()
            setPauseOpen(false)
        } catch (err: any) {
            setError(err?.message ?? "Failed to pause subscription.")
        } finally {
            setLoading(null)
        }
    }

    const daysLeft =
        sub.trialEndsAt ? differenceInDays(new Date(sub.trialEndsAt), new Date()) : null

    return (
        <>
            <Card className="shadow-none">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Current Plan
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <PlanBadge />
                            <StatusBadge status={sub.status} />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={handleRefreshPlan}
                                disabled={refreshing}
                                title="Sync plan"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                    {sub.status === "past_due" && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400 mt-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                                Your payment failed. Please update your payment method to keep
                                your subscription active.
                            </span>
                        </div>
                    )}
                    {sub.status === "trialing" && daysLeft !== null && (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-400 mt-2">
                            <Star className="h-4 w-4 shrink-0" />
                            Your trial ends in{" "}
                            <strong>{daysLeft > 0 ? `${daysLeft} days` : "today"}</strong>.
                        </div>
                    )}
                    {sub.cancelAtPeriodEnd && sub.currentPeriodEnd && (
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground mt-2">
                            <XCircle className="h-4 w-4 shrink-0" />
                            Cancels on{" "}
                            {format(new Date(sub.currentPeriodEnd), "MMMM d, yyyy")}
                        </div>
                    )}
                </CardHeader>

                <CardContent className="space-y-5">
                    {/* Plan details */}
                    <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                        <div>
                            <p className="text-muted-foreground mb-0.5">Plan</p>
                            <p className="font-medium">{sub.planName}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground mb-0.5">Billing</p>
                            <p className="font-medium capitalize">
                                {sub.billingCycle ?? "—"}
                            </p>
                        </div>
                        {sub.currentPeriodEnd && (
                            <div>
                                <p className="text-muted-foreground mb-0.5">
                                    {sub.cancelAtPeriodEnd ? "Ends" : "Renews"}
                                </p>
                                <p className="font-medium">
                                    {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-muted-foreground mb-0.5">Seats</p>
                            <p className="font-medium">
                                {sub.seats + sub.extraSeats}
                                {sub.extraSeats > 0 && (
                                    <span className="text-muted-foreground ml-1">
                                        (+{sub.extraSeats} extra)
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Usage meters */}
                    {usage && sub.limits.aiChatsPerMonth !== null && (
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Usage
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all"
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                (usage.aiChatsUsed / sub.limits.aiChatsPerMonth) * 100,
                                            )}%`,
                                        }}
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                    {usage.aiChatsUsed} / {sub.limits.aiChatsPerMonth}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Pending downgrade */}
                    {sub.pendingPlan && (
                        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                            Scheduled to downgrade to{" "}
                            <strong className="text-foreground capitalize">
                                {sub.pendingPlan}
                            </strong>{" "}
                            at next renewal.
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                            size="sm"
                            onClick={() => setChangePlanOpen(true)}
                        >
                            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                            Change Plan
                        </Button>

                        {sub.plan !== "free" &&
                            !sub.cancelAtPeriodEnd &&
                            sub.status !== "cancelled" && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPauseOpen(true)}
                                        disabled={sub.status === "paused"}
                                    >
                                        <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
                                        {sub.status === "paused" ? "Paused" : "Pause"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10 border-destructive/30"
                                        onClick={() => setCancelOpen(true)}
                                    >
                                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                        Cancel plan
                                    </Button>
                                </>
                            )}
                    </div>
                </CardContent>
            </Card>

            <ChangePlanModal
                open={changePlanOpen}
                onClose={() => setChangePlanOpen(false)}
                currentPlan={sub.plan}
                currentCycle={sub.billingCycle}
                onRefresh={onRefresh}
            />

            {/* Cancel dialog */}
            <Dialog open={cancelOpen} onOpenChange={(v) => !v && setCancelOpen(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cancel subscription</DialogTitle>
                        <DialogDescription>
                            Your plan stays active until the end of the current period. You
                            can resubscribe any time.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="cancel-reason" className="text-sm">
                                Reason (optional)
                            </Label>
                            <Input
                                id="cancel-reason"
                                className="mt-1"
                                placeholder="e.g. Too expensive, not using it…"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-400">{error}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setCancelOpen(false)}
                            >
                                Never mind
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                disabled={loading === "cancel"}
                                onClick={handleCancel}
                            >
                                {loading === "cancel" ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Confirm cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Pause dialog */}
            <Dialog open={pauseOpen} onOpenChange={(v) => !v && setPauseOpen(false)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Pause subscription</DialogTitle>
                        <DialogDescription>
                            Pause for 1–3 months. No charges during the pause period.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm">Pause duration</Label>
                            <div className="mt-2 flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPauseMonths((m) => Math.max(1, m - 1))}
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-lg font-semibold tabular-nums w-8 text-center">
                                    {pauseMonths}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setPauseMonths((m) => Math.min(3, m + 1))}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    {pauseMonths === 1 ? "month" : "months"}
                                </span>
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setPauseOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={loading === "pause"}
                                onClick={handlePause}
                            >
                                {loading === "pause" ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Pause {pauseMonths}mo
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ── Seat management card ──────────────────────────────────────────────────────
function SeatsCard({
    sub,
    onRefresh,
}: {
    sub: SubscriptionData
    onRefresh: () => void
}) {
    const [qty, setQty] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [redirecting, setRedirecting] = useState(false)

    async function handleAdd() {
        try {
            setLoading(true)
            setError(null)
            const result = await billingApi.addSeats(qty)

            if (result.type === "immediate") {
                // Charged immediately via saved card
                await onRefresh()
                setSuccess(true)
                setTimeout(() => setSuccess(false), 3000)
            } else {
                // No saved card / token failed — redirect to Flutterwave
                setRedirecting(true)
                setTimeout(() => {
                    window.location.href = result.paymentLink
                }, 800)
            }
        } catch (err: any) {
            setError(err?.message ?? "Failed to add seats.")
        } finally {
            setLoading(false)
        }
    }

    if (sub.plan === "free" || sub.plan === "starter") return null

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4.5 w-4.5 text-muted-foreground" />
                    Team Seats
                </CardTitle>
                <CardDescription>
                    You have {sub.seats + sub.extraSeats} seats (
                    {sub.extraSeats > 0 && `${sub.extraSeats} extra`}). Add more seats —
                    charged prorated for the current period.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={loading || redirecting}
                    >
                        <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-lg font-semibold w-8 text-center tabular-nums">
                        {qty}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setQty((q) => q + 1)}
                        disabled={loading || redirecting}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" onClick={handleAdd} disabled={loading || redirecting}>
                        {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        {redirecting ? "Redirecting…" : `Add ${qty} seat${qty !== 1 ? "s" : ""}`}
                    </Button>
                    {success && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                </div>
                {redirecting && (
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Taking you to payment — seats will be added once payment is confirmed.
                    </p>
                )}
                {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            </CardContent>
        </Card>
    )
}

// ── Payment methods card ──────────────────────────────────────────────────────
function PaymentMethodsCard({ onRefresh }: { onRefresh: () => void }) {
    const [methods, setMethods] = useState<PaymentMethodData[]>([])
    const [loading, setLoading] = useState(true)
    const [actionId, setActionId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const loadMethods = useCallback(async () => {
        try {
            setLoading(true)
            const res = await billingApi.getPaymentMethods()
            setMethods(res.methods)
        } catch {
            setError("Failed to load payment methods.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadMethods()
    }, [loadMethods])

    async function handleDelete(id: string) {
        try {
            setActionId(id)
            await billingApi.deletePaymentMethod(id)
            setMethods((m) => m.filter((pm) => pm._id !== id))
        } catch (err: any) {
            setError(err?.message ?? "Failed to remove payment method.")
        } finally {
            setActionId(null)
        }
    }

    async function handleSetDefault(id: string) {
        try {
            setActionId(id)
            await billingApi.setDefaultPaymentMethod(id)
            setMethods((m) =>
                m.map((pm) => ({ ...pm, isDefault: pm._id === id })),
            )
            await onRefresh()
        } catch (err: any) {
            setError(err?.message ?? "Failed to update default.")
        } finally {
            setActionId(null)
        }
    }

    return (
        <Card className="shadow-none">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CreditCard className="h-4.5 w-4.5 text-muted-foreground" />
                        Payment Methods
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={loadMethods} disabled={loading}>
                        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {error && (
                    <p className="text-sm text-red-400">{error}</p>
                )}

                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                    </div>
                ) : methods.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        No payment methods saved yet. Complete a payment to save your details.
                    </p>
                ) : (
                    methods.map((pm) => {
                        const isCard = pm.type === "card"
                        const isMobile = pm.type === "mobile_money"

                        const title = isCard && pm.card
                            ? `${pm.card.brand} \u00b7\u00b7\u00b7\u00b7 ${pm.card.last4}`
                            : isMobile && pm.mobileMoney
                            ? `${pm.mobileMoney.network} Mobile Money`
                            : "Bank Transfer"

                        const subtitle = isCard && pm.card
                            ? `Expires ${String(pm.card.expMonth).padStart(2, "0")}/${pm.card.expYear}`
                            : isMobile && pm.mobileMoney
                            ? pm.mobileMoney.phone
                            : pm.displayLabel || "Bank transfer"

                        const MethodIcon = isCard ? CreditCard : isMobile ? Smartphone : Building2

                        return (
                            <div
                                key={pm._id}
                                className={cn(
                                    "flex items-center justify-between rounded-lg border bg-card px-4 py-3 gap-3 transition-colors",
                                    pm.isDefault ? "border-primary/30" : "border-border"
                                )}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Type icon */}
                                    <div className={cn(
                                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                                        pm.isDefault ? "bg-primary/10" : "bg-muted"
                                    )}>
                                        <MethodIcon className={cn("h-4 w-4", pm.isDefault ? "text-primary" : "text-muted-foreground")} />
                                    </div>

                                    {/* Details */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium">{title}</p>
                                            {pm.isDefault && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-primary border-primary/30 bg-primary/5 shrink-0">
                                                    <Shield className="h-2.5 w-2.5 mr-0.5" />
                                                    Default
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {!pm.isDefault && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs h-7"
                                            disabled={actionId === pm._id}
                                            onClick={() => handleSetDefault(pm._id)}
                                        >
                                            Make default
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        disabled={actionId === pm._id}
                                        onClick={() => handleDelete(pm._id)}
                                    >
                                        {actionId === pm._id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    )
}

// ── Invoice details modal ────────────────────────────────────────────────────
function InvoiceDetailsModal({
    invoice,
    open,
    onClose,
}: {
    invoice: InvoiceData | null
    open: boolean
    onClose: () => void
}) {
    const [companyName, setCompanyName] = useState("")
    const [vatNumber, setVatNumber] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (!open) {
            setError(null)
            setSuccess(false)
        }
    }, [open])

    async function handleSave() {
        if (!invoice) return
        try {
            setLoading(true)
            setError(null)
            await billingApi.updateInvoiceDetails(invoice._id, {
                companyName: companyName || undefined,
                vatNumber: vatNumber || undefined,
            })
            setSuccess(true)
        } catch (err: any) {
            setError(err?.message ?? "Failed to update.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Billing details</DialogTitle>
                    <DialogDescription>
                        Add company name or VAT number to{" "}
                        {invoice?.invoiceNumber ?? "invoice"}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <Label>Company name</Label>
                        <Input
                            className="mt-1"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Acme Inc."
                        />
                    </div>
                    <div>
                        <Label>VAT number</Label>
                        <Input
                            className="mt-1"
                            value={vatNumber}
                            onChange={(e) => setVatNumber(e.target.value)}
                            placeholder="GB123456789"
                        />
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    {success && (
                        <p className="text-sm text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                        </p>
                    )}
                    <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            Close
                        </Button>
                        <Button
                            className="flex-1"
                            disabled={loading}
                            onClick={handleSave}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Billing history card ──────────────────────────────────────────────────────
function BillingHistoryCard() {
    const [invoices, setInvoices] = useState<InvoiceData[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const LIMIT = 10
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [detailsInvoice, setDetailsInvoice] = useState<InvoiceData | null>(null)

    const load = useCallback(
        async (p: number) => {
            try {
                setLoading(true)
                setError(null)
                const res = await billingApi.getBillingHistory(p, LIMIT)
                setInvoices(res.invoices)
                setTotal(res.total)
                setPage(p)
            } catch {
                setError("Failed to load billing history.")
            } finally {
                setLoading(false)
            }
        },
        [],
    )

    useEffect(() => {
        load(1)
    }, [load])

    const totalPages = Math.ceil(total / LIMIT)

    return (
        <>
            <Card className="shadow-none">
                <CardHeader>
                    <CardTitle className="text-base">Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

                    {loading ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full rounded" />
                            ))}
                        </div>
                    ) : invoices.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">
                            No invoices yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground">
                                        <th className="pb-2 text-left font-medium">Invoice</th>
                                        <th className="pb-2 text-left font-medium">Date</th>
                                        <th className="pb-2 text-left font-medium">Amount</th>
                                        <th className="pb-2 text-left font-medium">Status</th>
                                        <th className="pb-2 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv) => (
                                        <tr
                                            key={inv._id}
                                            className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                                        >
                                            <td className="py-3 font-mono text-xs">
                                                {inv.invoiceNumber}
                                            </td>
                                            <td className="py-3 text-muted-foreground">
                                                {format(new Date(inv.createdAt), "MMM d, yyyy")}
                                            </td>
                                            <td className="py-3 font-medium">
                                                {fmtMoney(inv.amount, inv.currency)}
                                            </td>
                                            <td className="py-3">
                                                <InvoiceStatusBadge status={inv.status} />
                                            </td>
                                            <td className="py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {inv.status === "paid" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            asChild
                                                        >
                                                            <a
                                                                href={billingApi.downloadInvoicePdfUrl(inv._id)}
                                                                download
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <Download className="h-3.5 w-3.5" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => setDetailsInvoice(inv)}
                                                    >
                                                        Details
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === 1}
                                        onClick={() => load(page - 1)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Prev
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        Page {page} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === totalPages}
                                        onClick={() => load(page + 1)}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <InvoiceDetailsModal
                invoice={detailsInvoice}
                open={detailsInvoice !== null}
                onClose={() => setDetailsInvoice(null)}
            />
        </>
    )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function BillingPage() {
    const [searchParams] = useSearchParams()
    const welcome = searchParams.get("welcome") === "1"

    const { subscription, usage, load, refresh } = useSubscriptionStore()
    const [initialising, setInitialising] = useState(true)

    useEffect(() => {
        load().finally(() => setInitialising(false))
    }, [load])

    const handleRefresh = useCallback(async () => {
        await refresh()
    }, [refresh])

    if (initialising) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <CreditCard className="h-6 w-6 text-primary" />
                    Billing & Subscription
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage your plan, payment methods, and invoices.
                </p>
            </div>

            {/* Welcome banner after checkout */}
            {welcome && subscription?.status === "trialing" && (
                <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-medium">Welcome to your free trial!</p>
                        <p className="mt-0.5 text-green-400/80">
                            Your 14-day trial has started. Enjoy all{" "}
                            {subscription.planName} features.
                        </p>
                    </div>
                </div>
            )}

            {subscription ? (
                <>
                    <CurrentPlanCard
                        sub={subscription}
                        usage={usage}
                        onRefresh={handleRefresh}
                    />
                    <SeatsCard sub={subscription} onRefresh={handleRefresh} />
                    <PaymentMethodsCard onRefresh={handleRefresh} />
                    <BillingHistoryCard />
                </>
            ) : (
                <div className="flex justify-center py-16">
                    <p className="text-muted-foreground text-sm">No subscription data.</p>
                </div>
            )}
        </div>
    )
}

// ── Tab variant (embedded inside Settings) ───────────────────────────────────
export function BillingTab() {
    const { subscription, usage, load, refresh } = useSubscriptionStore()
    const [searchParams, setSearchParams] = useSearchParams()
    const [initialising, setInitialising] = useState(true)
    const [verifyState, setVerifyState] = useState<
        | { status: "verifying" }
        | { status: "success"; message: string }
        | { status: "failed"; message: string }
        | null
    >(null)

    // ── Auto-verify Flutterwave callback on mount ──────────────────
    useEffect(() => {
        const transactionId = searchParams.get("transaction_id")
        const txRef = searchParams.get("tx_ref") ?? searchParams.get("ref")
        const fwStatus = searchParams.get("status")
        const intent = searchParams.get("intent") // 'seats' for seat-addition flow

        // Clean all FW/custom params from URL immediately so refresh doesn't re-trigger
        if (transactionId || txRef) {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev)
                next.delete("transaction_id")
                next.delete("tx_ref")
                next.delete("ref")
                next.delete("status")
                next.delete("intent")
                return next
            }, { replace: true })
        }

        if (!transactionId && !txRef) return

        // Flutterwave cancelled / failed — don't call verify
        if (fwStatus === "cancelled") {
            setVerifyState({ status: "failed", message: "Payment was cancelled." })
            return
        }

        ;(async () => {
            setVerifyState({ status: "verifying" })
            try {
                await billingApi.verifyPayment(
                    txRef ?? undefined,
                    transactionId ? parseInt(transactionId, 10) : undefined,
                )
                await refresh()
                const successMsg = intent === "seats"
                    ? "Payment verified, your seats have been added!"
                    : "Payment verified, your plan has been activated!"
                setVerifyState({ status: "success", message: successMsg })
            } catch (err: any) {
                setVerifyState({
                    status: "failed",
                    message: err?.message ?? "Payment verification failed. Contact support if your account wasn't updated.",
                })
            }
        })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        load().finally(() => setInitialising(false))
    }, [load])

    const handleRefresh = useCallback(async () => {
        await refresh()
    }, [refresh])

    if (initialising) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">

            {/* Payment verification banner */}
            {verifyState?.status === "verifying" && (
                <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Verifying your payment with Flutterwave…
                </div>
            )}
            {verifyState?.status === "success" && (
                <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {verifyState.message}
                </div>
            )}
            {verifyState?.status === "failed" && (
                <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {verifyState.message}
                </div>
            )}

            {subscription ? (
                <>
                    <CurrentPlanCard
                        sub={subscription}
                        usage={usage}
                        onRefresh={handleRefresh}
                    />
                    <SeatsCard sub={subscription} onRefresh={handleRefresh} />
                    <PaymentMethodsCard onRefresh={handleRefresh} />
                    <BillingHistoryCard />
                </>
            ) : (
                <div className="flex justify-center py-16">
                    <p className="text-muted-foreground text-sm">No subscription data.</p>
                </div>
            )}
        </div>
    )
}
