import { Link, Outlet, useLocation } from "react-router-dom"
import { BookOpen, Github, Search, Plus, LayoutDashboard, FolderKanban, User, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

export function DashboardLayout() {
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "Profile", href: "/profile", icon: User },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
              <BookOpen className="h-5 w-5" />
              <span>Docnine</span>
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
                className="w-full bg-muted/50 pl-9 border-transparent focus-visible:border-primary"
              />
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Bottom Navbar (Sub-nav) */}
        <div className="flex h-12 items-center justify-between px-6 border-t border-border/50 bg-background/50 backdrop-blur-sm">
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
