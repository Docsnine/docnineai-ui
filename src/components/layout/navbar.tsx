import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-primary">
          <BookOpen className="h-5 w-5" />
          <span>Docnine</span>
        </Link>
        <nav className="flex items-center gap-4">
          <ThemeToggle />
          <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Login
          </Link>
          <Button asChild size="sm">
            <Link to="/signup">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
