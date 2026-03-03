import { useState, useRef, useEffect } from "react"
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { BookOpen, Github, Search, FolderKanban, User, Settings, LogOut, BookDown, TerminalIcon, Menu, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuthStore } from "@/store/auth"
import { authApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "../theme-provider"

export function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, clearAuth } = useAuthStore()

  const searchValue = searchParams.get("q") ?? ""

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!location.pathname.startsWith("/projects")) {
      navigate(`/projects?q=${encodeURIComponent(val)}`)
      return
    }
    setSearchParams(
      (prev) => {
        if (val) prev.set("q", val)
        else prev.delete("q")
        return prev
      },
      { replace: true },
    )
  }
  const { theme } = useTheme()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  const navLinks = [
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
        <div className="flex h-14 items-center justify-between container mx-auto max-w-7xl px-4 sm:px-6">

          {/* Left: logo + github (desktop) */}
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link to="/projects" className="flex items-center gap-2 font-semibold text-primary">
              <img
                src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"}
                alt="Docnine Logo"
                className="h-7 w-auto"
              />
            </Link>

            <div className="h-4 w-px bg-border hidden md:block" />
            <a
              href="https://github.com/Docsnine"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>Star on GitHub</span>
            </a>
          </div>

          {/* Right: search (desktop) + avatar */}
          <div className="flex items-center gap-3">
            <div className="relative w-56 hidden md:block">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search projects..."
                className="w-full bg-muted/50 pl-9 border-border focus:ring-0 focus-visible:ring-1 rounded-2xl"
                value={searchValue}
                onChange={handleSearchChange}
              />
            </div>

            {/* Avatar dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold ring-2 ring-transparent hover:ring-primary/40 transition-all focus:outline-none"
                title={user?.email ?? "Account"}
              >
                {initials}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-lg border border-border bg-background shadow-lg z-50 py-1">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="flex items-center justify-between px-4 text-sm text-muted-foreground">
                    <span>Theme</span>
                    <ThemeToggle />
                  </div>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => { setDropdownOpen(false); handleLogout() }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop sub-nav */}
        <div className="hidden md:flex h-12 items-center justify-between border-t border-border/90 bg-background/50 backdrop-blur-sm container mx-auto max-w-7xl px-6">
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

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 pb-4">
            {/* Mobile search */}
            <div className="relative mt-3 mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search projects..."
                className="w-full bg-muted/50 pl-9 border-border"
                value={searchValue}
                onChange={handleSearchChange}
              />
            </div>

            {/* Primary nav */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Navigation</p>
            <nav className="flex flex-col gap-1 mb-4">
              {navLinks.map((link) => {
                const Icon = link.icon
                const isActive = location.pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                )
              })}
            </nav>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</p>
            <nav className="flex flex-col gap-1">
              {rightSideLinks.map((link) => {
                const Icon = link.icon
                const isActive = location.pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                )
              })}
              <a
                href="https://github.com/Docsnine"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Github className="h-4 w-4" />
                Star on GitHub
              </a>
            </nav>
          </div>
        )}
      </header>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-border">
        <div className="container mx-auto max-w-6xl p-6">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
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
