import { Github, MessageSquare, Twitter } from 'lucide-react'
import React from 'react'

function Footer() {
    return (
        <>
            {/* Footer */}
            <footer className="relative z-10 border-t border-border bg-background py-16 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold text-lg">
                                    D
                                </div>
                                <span className="font-bold text-xl text-foreground">Docnine</span>
                            </div>
                            <p className="text-muted-foreground leading-relaxed max-w-sm mb-8">
                                Open-source team chat with AI assistance. Built for modern collaboration.
                            </p>
                            <div className="flex items-center gap-4">
                                <a href="#" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0a0a0a] border border-border text-muted-foreground hover:text-foreground transition-colors">
                                    <Github className="h-4 w-4" />
                                </a>
                                <a href="#" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0a0a0a] border border-border text-muted-foreground hover:text-foreground transition-colors">
                                    <Twitter className="h-4 w-4" />
                                </a>
                                <a href="#" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0a0a0a] border border-border text-muted-foreground hover:text-foreground transition-colors">
                                    <MessageSquare className="h-4 w-4" />
                                </a>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-sm tracking-wider uppercase text-foreground mb-6">Product</h4>
                            <ul className="space-y-4 text-muted-foreground">
                                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">Roadmap</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-sm tracking-wider uppercase text-foreground mb-6">Resources</h4>
                            <ul className="space-y-4 text-muted-foreground">
                                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">GitHub</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-sm tracking-wider uppercase text-foreground mb-6">Company</h4>
                            <ul className="space-y-4 text-muted-foreground">
                                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                        <p>© 2026 Docnine. MIT License.</p>
                        <div className="flex items-center gap-6">
                            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
                            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
                            <a href="#" className="hover:text-foreground transition-colors">Cookies</a>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    )
}

export default Footer
