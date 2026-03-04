import { differenceInDays } from "date-fns"
import { Zap, Users, Star, AlertTriangle, Clock, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useSubscriptionStore, PLAN_LEVEL } from "@/store/subscription"

const PLAN_ICONS: Record<string, React.ElementType> = {
    free: Star,
    starter: Zap,
    pro: User,
    team: Users,
}

const PLAN_COLOURS: Record<string, string> = {
    free: "bg-muted text-muted-foreground border-border",
    starter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    pro: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    team: "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

interface PlanBadgeProps {
    className?: string
    /** Show trial countdown or dunning warning inline. Defaults to true. */
    showStatus?: boolean
}

export function PlanBadge({ className, showStatus = true }: PlanBadgeProps) {
    const subscription = useSubscriptionStore((s) => s.subscription)

    if (!subscription) return null

    const { plan, planName, status, trialEndsAt } = subscription
    const Icon = PLAN_ICONS[plan] ?? Star
    const colourClass = PLAN_COLOURS[plan] ?? PLAN_COLOURS.free

    // Build optional status indicator
    let statusBadge: React.ReactNode = null
    if (showStatus) {
        if (status === "trialing" && trialEndsAt) {
            const daysLeft = differenceInDays(new Date(trialEndsAt), new Date())
            statusBadge = (
                <span className="ml-1.5 flex items-center gap-0.5 text-amber-400 text-[10px] font-medium">
                    <Clock className="h-2.5 w-2.5" />
                    {daysLeft > 0 ? `${daysLeft}d` : "ends today"}
                </span>
            )
        } else if (status === "past_due") {
            statusBadge = (
                <span className="ml-1.5 flex items-center gap-0.5 text-red-400 text-[10px] font-medium">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    past due
                </span>
            )
        } else if (status === "paused") {
            statusBadge = (
                <span className="ml-1.5 text-muted-foreground text-[10px] font-medium">
                    paused
                </span>
            )
        }
    }

    return (
        <Badge
            variant="outline"
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                colourClass,
                className,
            )}
        >
            <Icon className="h-3 w-3" />
            {planName}
            {statusBadge}
        </Badge>
    )
}

/**
 * Headless helper — returns true if the current user's plan meets the minimum.
 * Useful for conditional rendering without the badge UI.
 */
export function usePlanCheck(minPlan: string): boolean {
    const subscription = useSubscriptionStore((s) => s.subscription)
    if (!subscription) return false
    return (PLAN_LEVEL[subscription.plan] ?? 0) >= (PLAN_LEVEL[minPlan] ?? 0)
}
