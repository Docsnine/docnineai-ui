import React, { useState } from 'react'
import { Button } from './ui/button'
import { Link } from 'react-router-dom'
import { ThemeToggle } from './theme-toggle'
import { Mail, MessageSquare, Menu, X, Sparkles } from 'lucide-react'
import { useTheme } from '../providers/theme-provider'
import ApplicationLogo from './application-logo'
import Loader from './ui/loader'
import Loader1 from './ui/loader1'

function TopHeader({ className }: { className?: string }) {
    const { theme } = useTheme()
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <header className={`relative z-50 w-full border-b border-border bg-background/80 backdrop-blur-md ${className}`}>
            {/* Top strip */}
            <div className="border-b border-border bg-muted/30">
                <div className="container mx-auto px-4 h-10 flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> docnineai@gmail.com</span>
                        <span className="hidden sm:flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> @docnine</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden md:inline-flex items-center gap-1.5 text-primary font-medium">
                            <Sparkles className="h-3.5 w-3.5" />
                            Now in beta — Documentation that Works as Hard as You Do.
                        </span>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Main nav row */}
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <ApplicationLogo />

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                    <Link to="/docs" className="hover:text-foreground transition-colors">Docs</Link>
                    <a href="https://github.com/Docsnine" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
                    <a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a>
                    <Link to="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
                </div>

                {/* Desktop CTA */}
                <div className="hidden md:flex items-center gap-4">
                    <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Sign In
                    </Link>
                    <Button asChild className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 h-9 font-semibold text-sm">
                        <Link to="/signup">Get Started</Link>
                    </Button>
                </div>

                {/* Mobile: Sign In + hamburger */}
                <div className="flex md:hidden items-center gap-3">
                    <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Sign In
                    </Link>
                    <button
                        onClick={() => setMobileOpen((o) => !o)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="md:hidden border-t border-border bg-background px-4 pb-4">
                    <nav className="flex flex-col gap-1 mt-3">
                        <a href="#features" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Features</a>
                        <Link to="/docs" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Docs</Link>
                        <a href="https://github.com/Docsnine" target="_blank" rel="noreferrer" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">GitHub</a>
                        <Link to="/contact" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Contact Us</Link>
                        <div className="mt-2 pt-2 border-t border-border">
                            <Button asChild className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full h-9 font-semibold text-sm">
                                <Link to="/signup" onClick={() => setMobileOpen(false)}>Get Started</Link>
                            </Button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    )
}

export default TopHeader