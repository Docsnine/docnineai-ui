import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import {
  Users,
  FolderKanban,
  DollarSign,
  TrendingUp,
  Search,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CreditCard,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import { adminApi, AdminUser, AdminProject, AdminSubscription, AdminStats } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Loader1 from "@/components/ui/loader1"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pro: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  team: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
}

const STATUS_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  trialing: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  past_due: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  paused: "bg-muted text-muted-foreground",
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PLAN_COLORS[plan] ?? "bg-muted text-muted-foreground"}`}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  )
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconClass,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  iconClass?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-md ${iconClass ?? "bg-primary/10"}`}>
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Delete confirm inline button
// ---------------------------------------------------------------------------

function DeleteButton({ onConfirm, loading }: { onConfirm: () => void; loading?: boolean }) {
  const [confirm, setConfirm] = useState(false)

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-destructive">Sure?</span>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-xs"
          onClick={() => { setConfirm(false); onConfirm() }}
          disabled={loading}
        >
          {loading ? <Loader1 className="h-3 w-3 " /> : "Yes"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirm(false)}>
          No
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
      onClick={() => setConfirm(true)}
      disabled={loading}
    >
      {loading ? <Loader1 className="h-3.5 w-3.5 " /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type Tab = "overview" | "users" | "projects" | "subscriptions"

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", Icon: BarChart3 },
  { id: "users", label: "Users", Icon: Users },
  { id: "projects", label: "Projects", Icon: FolderKanban },
  { id: "subscriptions", label: "Subscriptions", Icon: CreditCard },
]

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function SuperAdminPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // Guard — redirect non-super-admins
  useEffect(() => {
    if (user && user.role !== "super-admin") {
      navigate("/projects", { replace: true })
    }
  }, [user, navigate])

  const [activeTab, setActiveTab] = useState<Tab>("overview")

  // ── Stats ──────────────────────────────────────────────────
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const data = await adminApi.getStats()
      setStats(data)
    } catch (e: unknown) {
      setStatsError((e as Error).message ?? "Failed to load stats")
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  // ── Users ──────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [usersSearch, setUsersSearch] = useState("")
  const [usersLoading, setUsersLoading] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  const loadUsers = useCallback(async (page = 1, search = "") => {
    setUsersLoading(true)
    try {
      const res = await adminApi.listUsers({ page, limit: 20, search: search || undefined })
      setUsers(res.users)
      setUsersTotal(res.pagination.total)
      setUsersPage(res.pagination.page)
      setUsersTotalPages(res.pagination.totalPages)
    } catch { /* silent */ } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "users") loadUsers(1, usersSearch)
  }, [activeTab, loadUsers])

  const handleDeleteUser = async (id: string) => {
    setDeletingUserId(id)
    try {
      await adminApi.deleteUser(id)
      setUsers((prev) => prev.filter((u) => u._id !== id))
      setUsersTotal((prev) => prev - 1)
      // Refresh stats
      loadStats()
    } catch { /* silent */ } finally {
      setDeletingUserId(null)
    }
  }

  // ── Projects ───────────────────────────────────────────────
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [projectsTotal, setProjectsTotal] = useState(0)
  const [projectsPage, setProjectsPage] = useState(1)
  const [projectsTotalPages, setProjectsTotalPages] = useState(1)
  const [projectsSearch, setProjectsSearch] = useState("")
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)

  const loadProjects = useCallback(async (page = 1, search = "") => {
    setProjectsLoading(true)
    try {
      const res = await adminApi.listProjects({ page, limit: 20, search: search || undefined })
      setProjects(res.projects)
      setProjectsTotal(res.pagination.total)
      setProjectsPage(res.pagination.page)
      setProjectsTotalPages(res.pagination.totalPages)
    } catch { /* silent */ } finally {
      setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "projects") loadProjects(1, projectsSearch)
  }, [activeTab, loadProjects])

  const handleDeleteProject = async (id: string) => {
    setDeletingProjectId(id)
    try {
      await adminApi.deleteProject(id)
      setProjects((prev) => prev.filter((p) => p._id !== id))
      setProjectsTotal((prev) => prev - 1)
      loadStats()
    } catch { /* silent */ } finally {
      setDeletingProjectId(null)
    }
  }

  // ── Subscriptions ──────────────────────────────────────────
  const [subs, setSubs] = useState<AdminSubscription[]>([])
  const [subsTotal, setSubsTotal] = useState(0)
  const [subsPage, setSubsPage] = useState(1)
  const [subsTotalPages, setSubsTotalPages] = useState(1)
  const [subsLoading, setSubsLoading] = useState(false)
  const [subsPlanFilter, setSubsPlanFilter] = useState("")

  const loadSubs = useCallback(async (page = 1, plan = "") => {
    setSubsLoading(true)
    try {
      const res = await adminApi.listSubscriptions({ page, limit: 20, plan: plan || undefined })
      setSubs(res.subscriptions)
      setSubsTotal(res.pagination.total)
      setSubsPage(res.pagination.page)
      setSubsTotalPages(res.pagination.totalPages)
    } catch { /* silent */ } finally {
      setSubsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "subscriptions") loadSubs(1, subsPlanFilter)
  }, [activeTab, loadSubs])

  // ── Render ─────────────────────────────────────────────────
  if (!user || user.role !== "super-admin") {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
          <ShieldAlert className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Platform-wide analytics and controls</p>
        </div>
        <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={loadStats}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {statsError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {statsError}
            </div>
          )}

          {/* Stat cards */}
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-7 w-16 rounded bg-muted animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers.toLocaleString()}
                  sub={`+${stats.newUsersLast30Days} last 30 days`}
                  icon={Users}
                  iconClass="bg-blue-500/10"
                />
                <StatCard
                  title="Total Projects"
                  value={stats.totalProjects.toLocaleString()}
                  sub={`+${stats.newProjectsLast30Days} last 30 days`}
                  icon={FolderKanban}
                  iconClass="bg-purple-500/10"
                />
                <StatCard
                  title="Estimated MRR"
                  value={`$${stats.estimatedMRR.toLocaleString()}`}
                  sub={`${stats.paidSubscriptions} paid subscriptions`}
                  icon={DollarSign}
                  iconClass="bg-green-500/10"
                />
                <StatCard
                  title="Paid Subscribers"
                  value={stats.paidSubscriptions}
                  sub={`of ${stats.totalUsers} total users`}
                  icon={TrendingUp}
                  iconClass="bg-amber-500/10"
                />
              </div>

              {/* Plan breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Users by Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {(["free", "starter", "pro", "team"] as const).map((plan) => {
                      const count = stats.planBreakdown[plan] ?? 0
                      const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0
                      return (
                        <div key={plan} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <PlanBadge plan={plan} />
                            <span className="text-sm font-semibold">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{pct}%</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* ── Users ── */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                className="pl-9"
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") loadUsers(1, usersSearch) }}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => loadUsers(1, usersSearch)}>
              Search
            </Button>
            <span className="text-sm text-muted-foreground ml-auto">{usersTotal} total</span>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Provider</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Joined</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-4 py-3" colSpan={5}>
                        <div className="h-4 rounded bg-muted animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium truncate max-w-[180px]">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</p>
                          {u.role === "super-admin" && (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-destructive font-medium">
                              <ShieldAlert className="h-3 w-3" /> admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs capitalize text-muted-foreground">{u.provider}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <PlanBadge plan={u.subscription?.plan ?? "free"} />
                          <StatusBadge status={u.subscription?.status ?? "free"} />
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteButton
                          loading={deletingUserId === u._id}
                          onConfirm={() => handleDeleteUser(u._id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={usersPage} totalPages={usersTotalPages} onPage={(p) => { setUsersPage(p); loadUsers(p, usersSearch) }} />
        </div>
      )}

      {/* ── Projects ── */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by repo name…"
                className="pl-9"
                value={projectsSearch}
                onChange={(e) => setProjectsSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") loadProjects(1, projectsSearch) }}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => loadProjects(1, projectsSearch)}>
              Search
            </Button>
            <span className="text-sm text-muted-foreground ml-auto">{projectsTotal} total</span>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Owner</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-4 py-3" colSpan={4}>
                        <div className="h-4 rounded bg-muted animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p._id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {p.repoOwner}/{p.repoName}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{p._id}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {p.userId ? (
                          <div>
                            <p className="text-sm">{(p.userId as { name: string; email: string }).name}</p>
                            <p className="text-xs text-muted-foreground">{(p.userId as { name: string; email: string }).email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">deleted user</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteButton
                          loading={deletingProjectId === p._id}
                          onConfirm={() => handleDeleteProject(p._id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={projectsPage} totalPages={projectsTotalPages} onPage={(p) => { setProjectsPage(p); loadProjects(p, projectsSearch) }} />
        </div>
      )}

      {/* ── Subscriptions ── */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              value={subsPlanFilter}
              onChange={(e) => { setSubsPlanFilter(e.target.value); loadSubs(1, e.target.value) }}
            >
              <option value="">All plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => loadSubs(1, subsPlanFilter)}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm text-muted-foreground ml-auto">{subsTotal} total</span>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Billing</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Since</th>
                </tr>
              </thead>
              <tbody>
                {subsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="px-4 py-3" colSpan={5}>
                        <div className="h-4 rounded bg-muted animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : subs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  subs.map((s) => (
                    <tr key={s._id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        {s.userId ? (
                          <div>
                            <p className="font-medium truncate max-w-[180px]">{(s.userId as { name: string; email: string }).name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{(s.userId as { name: string; email: string }).email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">deleted user</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><PlanBadge plan={s.plan} /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs capitalize text-muted-foreground">{s.billingCycle ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={subsPage} totalPages={subsTotalPages} onPage={(p) => { setSubsPage(p); loadSubs(p, subsPlanFilter) }} />
        </div>
      )}
    </div>
  )
}
