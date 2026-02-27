import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { BookOpen, Github, Search, LayoutDashboard, FolderKanban, User, Settings, LogOut, BookDown, CommandIcon, Command, TerminalIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/auth"
import { authApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "../theme-provider"

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { theme } = useTheme();

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "Documentations", href: "/documentations", icon: BookDown },
    { name: "Logs", href: "/logs", icon: TerminalIcon }
  ]

  const rightSideLinks = [
    { name: "Profile", href: "/profile", icon: User },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {

    } finally {
      clearAuth()
      navigate("/login", { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
              <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
                <img
                  src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
                  alt="Docnine Logo"
                  className="h-8 w-10 w-auto"
                />
              </Link>
            </Link>
            <div className="h-4 w-px bg-border" />
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>Star on GitHub</span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search projects..."
                className="w-full bg-muted/50 pl-9 focus-visible:border-primary border-border"
              />
            </div>

            {/* User indicator */}
            {user && (
              <span className="hidden md:block text-sm text-muted-foreground max-w-[150px] truncate" title={user.email}>
                {user.name}
              </span>
            )}

            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Sub-nav */}
        <div className="flex h-12 items-center justify-between px-6 border-t border-border/90 bg-background/50 backdrop-blur-sm">
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname.startsWith(link.href)
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary border-b-2 border-primary py-3"
                      : "text-muted-foreground hover:text-foreground py-3 border-b-2 border-transparent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              )
            })}
          </nav>
          <nav className="flex items-center gap-6">
            {rightSideLinks.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname.startsWith(link.href)
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary border-b-2 border-primary py-3"
                      : "text-muted-foreground hover:text-foreground py-3 border-b-2 border-transparent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-border px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2026 Docnine. MIT License.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
