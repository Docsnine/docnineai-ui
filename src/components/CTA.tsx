import React from 'react'
import { Button } from './ui/button'
import { Link } from 'react-router-dom'
import { ArrowRight, Github, Sparkles } from 'lucide-react'

function CTA() {
    return (
        <section className="relative z-10 py-24 px-4 border-t border-border bg-background flex justify-center">
            <div className="container max-w-5xl relative overflow-hidden rounded-[2.5rem] bg-[#0a0a0a] border border-border/50 p-12 sm:p-20 text-center">
                {/* Background Glow for CTA */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full bg-primary/10 blur-[100px] pointer-events-none z-0" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-8">
                        <Sparkles className="h-4 w-4" />
                        No credit card required·
                    </div>

                    <h2 className="text-[48px] leading-[48px] sm:text-[64px] sm:leading-[64px] font-bold tracking-tight text-primary mb-8">
                        Ship better docs, faster.
                    </h2>

                    <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                        Stop writing documentation by hand. Docnine generates structured docs with AI, and keeps everything in sync as your code evolves.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                        <Button
                            asChild
                            className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 h-14 text-lg font-semibold w-full sm:w-auto"
                        >
                            <Link to="/signup">
                                Start for Free <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="bg-secondary border-border text-foreground hover:bg-muted rounded-full px-8 h-14 text-lg font-semibold w-full sm:w-auto"
                        >
                            <a href="https://github.com/Docsnine" target="_blank" rel="noreferrer">
                                <Github className="mr-2 h-5 w-5" /> Star on GitHub
                            </a>
                        </Button>
                    </div>

                    <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground font-mono">
                        auto_docs <span className="text-foreground">==</span> <span className="text-primary">true</span> <span className="text-foreground">&&</span> credit_card_required <span className="text-foreground">==</span> <span className="text-primary">false</span>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default CTA
