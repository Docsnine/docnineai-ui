/**
 * PlansModal — inline dialog showing all pricing plans.
 * Opened from UpgradeModal "View all plans" so the user never leaves the page.
 */
import { useState } from "react"
import {
    ArrowRight,
    Check,
    Minus,
    Star,
    Users,
    User,
    Zap,
    X,
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { billingApi, BillingPlan } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { useSubscriptionStore } from "@/store/subscription"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import Loader1 from "../ui/loader1"

// ── Plan config ────────────────────────────────────────────────────────────

const PLAN_ICONS: Record<string, React.ElementType> = {
    free: Star,
    starter: Zap,
    pro: User,
    team: Users,
}

const PLAN_ACCENT: Record<string, string> = {
    free: "text-muted-foreground",
    starter: "text-blue-400",
    pro: "text-primary",
    team: "text-primary",
}

const PLAN_BTN: Record<string, string> = {
    free: "",
    starter: "bg-primary hover:bg-primary/90 text-white border-transparent",
    pro: "bg-primary hover:bg-primary/90 text-white border-transparent",
    team: "bg-primary hover:bg-primary/90 text-white border-transparent",
}

// ── Mini plan card ─────────────────────────────────────────────────────────

function MiniPlanCard({
    plan,
    annual,
    currentPlanId,
    loading,
    onSelect,
}: {
    plan: BillingPlan
    annual: boolean
    currentPlanId: string | null
    loading: string | null
    onSelect: (plan: BillingPlan) => void
}) {
    const Icon = PLAN_ICONS[plan.id] ?? Star
    const accent = PLAN_ACCENT[plan.id] ?? "text-muted-foreground"
    const btnClass = PLAN_BTN[plan.id] ?? ""
    const isCurrent = currentPlanId === plan.id
    const isPro = plan.id === "pro"
    const isLoading = loading === plan.id
    const price = annual ? plan.prices.annual : plan.prices.monthly

    return (
        <div
            className={cn(
                "relative flex flex-col rounded-xl border bg-card p-5 transition-all",
                isPro
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-border",
            )}
        >
            {isPro && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-white text-[10px] px-2 py-0.5">
                        Most Popular
                    </Badge>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Icon className={cn("h-4 w-4", accent)} />
                <span className="font-semibold text-sm">{plan.name}</span>
            </div>

            {/* Price */}
            <div className="mb-4">
                {plan.prices.monthly === 0 ? (
                    <span className="text-2xl font-bold">Free</span>
                ) : (
                    <div className="flex items-end gap-1">
                        <span className="text-2xl font-bold">${price}</span>
                        <span className="mb-0.5 text-xs text-muted-foreground">/mo</span>
                    </div>
                )}
                {annual && plan.prices.annualTotal != null && plan.prices.monthly > 0 && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                        ${plan.prices.annualTotal}/yr
                        {plan.prices.savingsPercent > 0 && (
                            <span className="ml-1 text-primary font-medium">
                                (Save {plan.prices.savingsPercent}%)
                            </span>
                        )}
                    </p>
                )}
            </div>

            {/* CTA */}
            <Button
                className={cn("w-full mb-4 text-xs h-8", btnClass)}
                variant={plan.id === "free" ? "outline" : "default"}
                size="sm"
                disabled={isCurrent || isLoading}
                onClick={() => onSelect(plan)}
            >
                {isLoading ? (
                    <Loader1 className="mr-1.5 h-3.5 w-3.5" />
                ) : isCurrent ? (
                    "Current plan"
                ) : plan.id === "free" ? (
                    "Get started free"
                ) : (
                    <>
                        Start free trial
                        <ArrowRight className="ml-1.5 h-3 w-3" />
                    </>
                )}
            </Button>

            {/* Key features */}
            <ul className="space-y-1.5 text-xs text-muted-foreground">
                {plan.limits.projects !== null ? (
                    <FeatureLine label={`${plan.limits.projects} projects`} />
                ) : (
                    <FeatureLine label="Unlimited projects" />
                )}
                {plan.limits.aiChatsPerMonth === null ? (
                    <FeatureLine label="Unlimited AI chats" />
                ) : plan.limits.aiChatsPerMonth > 0 ? (
                    <FeatureLine label={`${plan.limits.aiChatsPerMonth} AI chats/mo`} />
                ) : (
                    <li className="flex items-center gap-1.5 opacity-40">
                        <Minus className="h-3 w-3 shrink-0" />
                        AI chats
                    </li>
                )}
                {plan.features.githubSync && <FeatureLine label="GitHub sync" />}
                {plan.features.openApiImporter && <FeatureLine label="OpenAPI importer" />}
                {plan.features.customDomain && <FeatureLine label="Custom domain" />}
                {plan.features.docApproval && <FeatureLine label="Doc approval" />}
            </ul>
        </div>
    )
}

function FeatureLine({ label }: { label: string }) {
    return (
        <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 shrink-0 text-primary" />
            {label}
        </li>
    )
}

// ── Main modal ─────────────────────────────────────────────────────────────

interface PlansModalProps {
    open: boolean
    onClose: () => void
}

export function PlansModal({ open, onClose }: PlansModalProps) {
    const navigate = useNavigate()
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const { subscription, plans, refresh } = useSubscriptionStore()

    const [annual, setAnnual] = useState(false)
    const [loading, setLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function handleSelect(plan: BillingPlan) {
        if (!isAuthenticated) {
            onClose()
            navigate("/signup")
            return
        }
        if (plan.id === "free") {
            onClose()
            return
        }
        try {
            setLoading(plan.id)
            setError(null)
            const res = await billingApi.checkout(plan.id, annual ? "annual" : "monthly", undefined, true)
            if (res.trial) {
                await refresh()
                onClose()
                return
            }
            if (res.paymentLink) {
                window.location.href = res.paymentLink
            }
        } catch (err: any) {
            setError(err?.message ?? "Something went wrong. Please try again.")
        } finally {
            setLoading(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl">Choose your plan</DialogTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        14-day free trial on all paid plans. No credit card required.
                    </p>

                    {/* Billing toggle */}
                    <div className="flex items-center gap-3 pt-3">
                        <span className={cn("text-sm font-medium transition-colors", !annual ? "text-foreground" : "text-muted-foreground")}>
                            Monthly
                        </span>
                        <Switch checked={annual} onCheckedChange={setAnnual} aria-label="Toggle annual billing" />
                        <span className={cn("text-sm font-medium transition-colors", annual ? "text-foreground" : "text-muted-foreground")}>
                            Annual
                            <Badge className="ml-1.5 bg-primary/10 text-green-400 border-primary/20 text-[10px] px-1.5 py-0">
                                Save up to 20%
                            </Badge>
                        </span>
                    </div>
                </DialogHeader>

                {error && (
                    <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                        {error}
                    </p>
                )}

                {plans.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <Loader1 className="h-6 w-6 text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
                        {plans.map((plan) => (
                            <MiniPlanCard
                                key={plan.id}
                                plan={plan}
                                annual={annual}
                                currentPlanId={subscription?.plan ?? null}
                                loading={loading}
                                onSelect={handleSelect}
                            />
                        ))}
                    </div>
                )}

                <p className="text-center text-xs text-muted-foreground pt-2">
                    Need a custom plan?{" "}
                    <a href="mailto:hello@docnine.io" className="text-primary hover:underline">
                        Contact us
                    </a>
                </p>
            </DialogContent>
        </Dialog>
    )
}
