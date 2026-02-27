import React from 'react'
import { Button } from './ui/button'
import { Link } from 'react-router-dom'
import { ThemeToggle } from './theme-toggle'
import { Mail, MessageSquare } from 'lucide-react'

function TopHeader() {
    return (<>
        {/* Full-width Two-Tier Navbar */}
        <header className="relative z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
            {/* Top Section */}
            <div className="border-b border-border bg-muted/30">
                <div className="container mx-auto px-4 h-10 flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> hello@docnine.com</span>
                        <span className="hidden sm:flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> @docnine</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden md:inline-flex text-primary font-medium">✨ New: AI Chat Assistant is now live!</span>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src="/logo-dark.png" alt="Docnine Logo" className="h-10 w-10 w-auto" />
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                    <a href="#features" className="hover:text-foreground transition-colors">Features</a>
                    <a href="#docs" className="hover:text-foreground transition-colors">Docs</a>
                    <a href="#github" className="hover:text-foreground transition-colors">GitHub</a>
                </div>

                <div className="flex items-center gap-4">
                    <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        Sign In
                    </Link>
                    <Button asChild className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 h-9 font-semibold text-sm">
                        <Link to="/signup">Get Started</Link>
                    </Button>
                </div>
            </div>
        </header>
    </>
    )
}

export default TopHeader