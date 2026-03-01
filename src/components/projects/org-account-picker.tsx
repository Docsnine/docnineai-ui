import { GitHubOrg } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { User, Building2 } from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// OrgAccountPicker
//
// Renders a horizontal row of pill-shaped buttons:
//   [Personal account]  [Org A]  [Org B]  …
//
// The selected pill is highlighted with primary colours.
// Selection is driven entirely via props — parent owns the state.
//
// Props:
//   username     — GitHub login of the authenticated user (shown as the
//                  "personal account" option, always present)
//   orgs         — list of organisations returned by GET /github/orgs
//   orgsLoading  — show skeleton pills while the orgs request is in flight
//   selected     — currently selected value:
//                    null   → personal account
//                    string → org login
//   onSelect     — called with null (personal) or org login string
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgAccountPickerProps {
    username: string
    orgs: GitHubOrg[]
    orgsLoading: boolean
    selected: string | null
    onSelect: (org: string | null) => void
}

export function OrgAccountPicker({
    username,
    orgs,
    orgsLoading,
    selected,
    onSelect,
}: OrgAccountPickerProps) {
    return (
        <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Account / Organisation
            </p>

            {orgsLoading ? (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-7 w-24 shrink-0 rounded-full" />
                    ))}
                </div>
            ) : (
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    {/* ── Personal account pill ── */}
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            selected === null
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground hover:bg-muted",
                        )}
                    >
                        <User className="h-3 w-3 shrink-0" />
                        {username}
                    </button>

                    {/* ── Organisation pills ── */}
                    {orgs.map((org) => (
                        <button
                            key={org.id}
                            type="button"
                            onClick={() => onSelect(org.login)}
                            className={cn(
                                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                selected === org.login
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-foreground hover:bg-muted",
                            )}
                        >
                            <Building2 className="h-3 w-3 shrink-0" />
                            {org.login}
                        </button>
                    ))}

                    {/* Surface no-orgs hint only when load is done and there are none */}
                    {orgs.length === 0 && (
                        <span className="self-center text-[11px] text-muted-foreground pl-1">
                            No organisations found.
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
