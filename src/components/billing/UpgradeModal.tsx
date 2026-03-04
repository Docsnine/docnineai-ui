import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Zap, Loader2, X, ArrowRight, User } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { billingApi } from "@/lib/api"
import { useSubscriptionStore, PLAN_LEVEL } from "@/store/subscription"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"

const PLAN_LABELS: Record<string, { name: string; colour: string; Icon: React.ElementType }> = {
    starter: { name: "Starter", colour: "text-blue-400", Icon: Zap },
    pro: { name: "Pro", colour: "text-violet-400", Icon: User },
    team: { name: "Team", colour: "text-amber-400", Icon: User },
}

interface UpgradeModalProps {
    open: boolean
    onClose: () => void
    /** Human-readable name of the feature being blocked, e.g. "GitHub Sync" */
    featureName: string
    /** Minimum plan ID required, e.g. "pro" */
    requiredPlan: string
    /** Optional description override shown under the title */
    description?: string
}

export function UpgradeModal({
    open,
    onClose,
    featureName,
    requiredPlan,
    description,
}: UpgradeModalProps) {
    const navigate = useNavigate()
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const plans = useSubscriptionStore((s) => s.plans)
    const refresh = useSubscriptionStore((s) => s.refresh)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const planInfo = PLAN_LABELS[requiredPlan] ?? PLAN_LABELS.pro
    const planData = plans.find((p) => p.id === requiredPlan)

    async function handleUpgrade() {
        if (!isAuthenticated) {
            navigate("/signup")
            return
        }
        try {
            setLoading(true)
            setError(null)
            const res = await billingApi.checkout(requiredPlan, "monthly", undefined, true)
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
            setLoading(false)
        }
    }

    function handleViewPlans() {
        onClose()
        navigate("/pricing")
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="mb-2 flex items-center gap-2">
                        <planInfo.Icon className={cn("h-5 w-5", planInfo.colour)} />
                        <Badge variant="outline" className={cn("border-current", planInfo.colour)}>
                            {planInfo.name} Plan Required
                        </Badge>
                    </div>
                    <DialogTitle className="text-lg">
                        Unlock <span className={planInfo.colour}>{featureName}</span>
                    </DialogTitle>
                    <DialogDescription>
                        {description ??
                            `${featureName} is available on the ${planInfo.name} plan and above. Upgrade to get access.`}
                    </DialogDescription>
                </DialogHeader>

                {planData && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                        <p className="mb-2 font-medium">{planData.name} plan includes:</p>
                        <ul className="space-y-1 text-muted-foreground">
                            {planData.limits.projects !== null && (
                                <li>• Up to {planData.limits.projects} projects</li>
                            )}
                            {planData.limits.seats !== null && (
                                <li>• {planData.limits.seats} team seats</li>
                            )}
                            {planData.features.githubSync && <li>• GitHub sync</li>}
                            {planData.features.openApiImporter && <li>• OpenAPI importer</li>}
                            {planData.features.customDomain && <li>• Custom domain</li>}
                            {planData.features.docApproval && <li>• Doc approval workflow</li>}
                        </ul>
                        {planData.prices.monthly > 0 && (
                            <p className="mt-3 font-semibold">
                                From{" "}
                                <span className={planInfo.colour}>
                                    ${planData.prices.monthly}/mo
                                </span>
                            </p>
                        )}
                    </div>
                )}

                {error && (
                    <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                        {error}
                    </p>
                )}

                <div className="flex flex-col gap-2 pt-1">
                    <Button onClick={handleUpgrade} disabled={loading} className="w-full">
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        {loading ? "Redirecting…" : `Upgrade to ${planInfo.name}`}
                    </Button>

                    <Button variant="ghost" size="sm" onClick={handleViewPlans}>
                        View all plans
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
