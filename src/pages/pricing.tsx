import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import {
    Check,
    Zap,
    Users,
    Star,
    ArrowRight,
    Loader2,
    ChevronRight,
    Minus,
    User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { billingApi, BillingPlan } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { useSubscriptionStore } from "@/store/subscription"
import { cn } from "@/lib/utils"
import BackgroundGrid from "@/components/ui/background-grid"
import TopHeader from "@/components/header"
import Footer from "@/components/footer"
import { Switch } from "@/components/ui/switch"

// ── Icon per plan ─────────────────────────────────────────────────────────────
const PLAN_ICONS: Record<string, React.ElementType> = {
    free: Star,
    starter: Zap,
    pro: User,
    team: Users,
}

// ── Accent per plan ───────────────────────────────────────────────────────────
const PLAN_ACCENT: Record<string, string> = {
    free: "text-muted-foreground",
    starter: "text-blue-400",
    pro: "text-primary",
    team: "text-amber-400",
}

const PLAN_BTN: Record<string, string> = {
    free: "",
    starter: "bg-blue-600 hover:bg-blue-700 text-white",
    pro: "bg-primary hover:bg-primary/90 text-white",
    team: "bg-amber-500 hover:bg-amber-600 text-white",
}

// Feature comparison rows shown at the bottom of the page
const COMPARISON_ROWS = [
    { label: "Projects", key: "projects" as const },
    { label: "Team seats", key: "seats" as const },
    { label: "AI chats / month", key: "aiChatsPerMonth" as const },
    { label: "Portals", key: "portals" as const },
    { label: "Max file size (MB)", key: "maxFileSizeMb" as const },
    { label: "Version history (days)", key: "versionHistoryDays" as const },
]

const FEATURE_ROWS: { label: string; key: keyof BillingPlan["features"] }[] = [
    { label: "Share (view only)", key: "shareViewOnly" },
    { label: "Share (edit access)", key: "shareEdit" },
    { label: "Archive & restore", key: "archiveRestore" },
    { label: "OpenAPI importer", key: "openApiImporter" },
    { label: "GitHub sync", key: "githubSync" },
    { label: "Custom domain", key: "customDomain" },
    { label: "Doc approval workflow", key: "docApproval" },
    { label: "API / webhook access", key: "apiWebhookAccess" },
]

// ── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({
    plan,
    annual,
    currentPlanId,
    onSelect,
    loading,
}: {
    plan: BillingPlan
    annual: boolean
    currentPlanId: string | null
    onSelect: (plan: BillingPlan) => void
    loading: string | null
}) {
    const Icon = PLAN_ICONS[plan.id] ?? Star
    const accent = PLAN_ACCENT[plan.id] ?? "text-muted-foreground"
    const btn = PLAN_BTN[plan.id] ?? ""
    const isCurrent = currentPlanId === plan.id
    const isPro = plan.id === "pro"

    const price = annual ? plan.prices.annual : plan.prices.monthly
    const isLoading = loading === plan.id

    return (
        <div
            className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 transition-all",
                isPro
                    ? "border-primary  scale-[1.02]"
                    : "border-border hover:border-border/80",
            )}
        >
            {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-white text-xs px-3 py-0.5">
                        Most Popular
                    </Badge>
                </div>
            )}

            {/* Header */}
            <div className="mb-4 flex items-center gap-2">
                <Icon className={cn("h-5 w-5", accent)} />
                <span className="font-semibold">{plan.name}</span>
            </div>
            <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
                {plan.tagline}
            </p>

            {/* Price */}
            <div className="mb-6">
                {plan.prices.monthly === 0 ? (
                    <span className="text-3xl font-bold">Free</span>
                ) : (
                    <div className="flex items-end gap-1">
                        <span className="text-3xl font-bold">${price}</span>
                        <span className="mb-1 text-sm text-muted-foreground">/mo</span>
                    </div>
                )}
                {annual && plan.prices.annualTotal != null && plan.prices.monthly > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        Billed ${plan.prices.annualTotal}/year
                        {plan.prices.savingsPercent > 0 && (
                            <span className="ml-1 text-green-400 font-medium">
                                (Save {plan.prices.savingsPercent}%)
                            </span>
                        )}
                    </p>
                )}
            </div>

            {/* CTA */}
            <Button
                className={cn("w-full mb-6", btn)}
                variant={plan.id === "free" ? "outline" : "default"}
                disabled={isCurrent || isLoading}
                onClick={() => onSelect(plan)}
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isCurrent ? (
                    "Current plan"
                ) : plan.id === "free" ? (
                    "Get started free"
                ) : (
                    <>
                        Start free trial
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                )}
            </Button>

            {/* Features */}
            <ul className="space-y-2.5 text-sm">
                {plan.limits.projects !== null && (
                    <FeatureLine label={`${plan.limits.projects} projects`} />
                )}
                {plan.limits.projects === null && (
                    <FeatureLine label="Unlimited projects" />
                )}
                {plan.limits.seats !== null && (
                    <FeatureLine label={`${plan.limits.seats} team seats`} />
                )}
                {plan.limits.aiChatsPerMonth !== null && (
                    <FeatureLine label={`${plan.limits.aiChatsPerMonth} AI chats/mo`} />
                )}
                {plan.limits.aiChatsPerMonth === null && (
                    <FeatureLine label="Unlimited AI chats" />
                )}
                {plan.features.githubSync && <FeatureLine label="GitHub sync" />}
                {plan.features.openApiImporter && <FeatureLine label="OpenAPI importer" />}
                {plan.features.customDomain && <FeatureLine label="Custom domain" />}
                {plan.features.docApproval && <FeatureLine label="Doc approval workflow" />}
                {plan.features.apiWebhookAccess && <FeatureLine label="API & webhook access" />}
            </ul>
        </div>
    )
}

function FeatureLine({ label }: { label: string }) {
    return (
        <li className="flex items-center gap-2 text-muted-foreground">
            <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
            {label}
        </li>
    )
}

// ── Comparison table ─────────────────────────────────────────────────────────
function ComparisonTable({ plans }: { plans: BillingPlan[] }) {
    return (
        <div className="overflow-x-auto border-border z-10 scale-[1.02] rounded-2xl border bg-card p-6 transition-all">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border">
                        <th className="py-3 text-left text-muted-foreground font-medium w-48">
                            Feature
                        </th>
                        {plans.map((p) => (
                            <th
                                key={p.id}
                                className={cn(
                                    "py-3 text-center font-semibold",
                                    PLAN_ACCENT[p.id],
                                )}
                            >
                                {p.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {COMPARISON_ROWS.map((row) => (
                        <tr key={row.key} className="border-b border-border/50">
                            <td className="py-3 text-muted-foreground">{row.label}</td>
                            {plans.map((p) => {
                                const val = p.limits[row.key]
                                return (
                                    <td key={p.id} className="py-3 text-center font-medium">
                                        {val === null ? "∞" : val === 0 ? <Minus className="h-4 w-4 mx-auto text-muted-foreground" /> : val}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                    {FEATURE_ROWS.map((row) => (
                        <tr key={row.key} className="border-b border-border/50">
                            <td className="py-3 text-muted-foreground">{row.label}</td>
                            {plans.map((p) => (
                                <td key={p.id} className="py-3 text-center">
                                    {p.features[row.key] ? (
                                        <Check className="h-4 w-4 mx-auto text-green-500" />
                                    ) : (
                                        <Minus className="h-4 w-4 mx-auto text-muted-foreground/30" />
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function PricingPage() {
    const navigate = useNavigate()
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const { subscription, loadPlans } = useSubscriptionStore()

    const [plans, setPlans] = useState<BillingPlan[]>([])
    const [annual, setAnnual] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [loading, setLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        billingApi
            .getPlans()
            .then((res) => {
                setPlans(res.plans)
                loadPlans()
            })
            .catch(() => setError("Failed to load plans. Please refresh."))
            .finally(() => setFetching(false))
    }, [loadPlans])

    async function handleSelect(plan: BillingPlan) {
        if (!isAuthenticated) {
            navigate("/signup")
            return
        }
        if (plan.id === "free") {
            navigate("/projects")
            return
        }
        try {
            setLoading(plan.id)
            setError(null)
            const res = await billingApi.checkout(
                plan.id,
                annual ? "annual" : "monthly",
                undefined,
                true,
            )
            if (res.trial) {
                navigate("/billing?welcome=1")
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
        <div className="relative min-h-screen bg-background text-foreground overflow-hidden font-sans">
            {/* <BackgroundGrid /> */}

            {/* Top Left Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-foreground/10 blur-[120px] pointer-events-none z-0" />

            {/* Center Cyan Glow */}
            <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[40%] h-[30%] rounded-full bg-primary/20 blur-[100px] pointer-events-none z-0" />

            <TopHeader />

            {/* Hero */}
            <div className="mx-auto z-10 max-w-5xl px-6 pt-16 pb-12 text-center">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    Simple, transparent pricing
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Start free. Upgrade when you're ready.
                    <span className="ml-1 text-green-400 font-medium">
                        14-day free trial on all paid plans.
                    </span>
                </p>

                {/* Billing cycle toggle */}
                <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2">
                    <span
                        className={cn(
                            "text-sm font-medium transition-colors",
                            !annual ? "text-foreground" : "text-muted-foreground",
                        )}
                    >
                        Monthly
                    </span>
                    <Switch
                        checked={annual}
                        onCheckedChange={setAnnual}
                        aria-label="Toggle annual billing"
                    />
                    <span
                        className={cn(
                            "text-sm font-medium transition-colors",
                            annual ? "text-foreground" : "text-muted-foreground",
                        )}
                    >
                        Annual
                        <Badge className="ml-1.5 bg-green-500/10 text-green-400 border-green-500/20 text-[10px] px-1.5 py-0">
                            Save up to 20%
                        </Badge>
                    </span>
                </div>
            </div>

            {/* Plan cards */}
            <div className="mx-auto max-w-5xl px-6 pb-16">
                {error && (
                    <p className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
                        {error}
                    </p>
                )}

                {fetching ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {plans.map((plan) => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    annual={annual}
                                    currentPlanId={subscription?.plan ?? null}
                                    onSelect={handleSelect}
                                    loading={loading}
                                />
                            ))}
                        </div>

                        {/* Comparison table */}
                        {plans.length > 0 && (
                            <div className="mt-20">
                                <h2 className="mb-8 text-center text-2xl font-bold">
                                    Full plan comparison
                                </h2>
                                <ComparisonTable plans={plans} />
                            </div>
                        )}
                    </>
                )}
            </div>

            <Footer />
        </div>
    )
}
