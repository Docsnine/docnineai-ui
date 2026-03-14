import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

export function HeroSection() {
  return (
    <section className="relative z-10 flex flex-col items-center justify-center pt-24 pb-20 px-4 text-center">
      {/* Live Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/50 backdrop-blur-sm mb-12">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground font-medium">AI-powered documentation, built for dev teams</span>
      </div>

      {/* Headline */}
      <h1 className="text-[48px] leading-[48px] sm:text-[72px] sm:leading-[72px] md:text-[96px] md:leading-[96px] font-bold tracking-tight mb-8">
        <span className="text-foreground">Documentation</span>
        <br />
        <span className="text-primary">That Evolves.</span>
      </h1>

      {/* Subheadline */}
      <p className="max-w-3xl text-xl md:text-xl text-muted-foreground font-medium leading-relaxed mb-12">
        Let AI generate complete, readable documentation, then chat with your codebase like a teammate who knows every line.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Button
          asChild
          className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 h-14 text-lg font-semibold w-full sm:w-auto  transition-all hover:shadow-[0_0_60px_rgba(0,210,200,0.25)] dark:hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
        >
          <Link to="/signup">
            Start for free <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="bg-transparent border-border text-foreground hover:bg-muted rounded-full px-8 h-14 text-lg font-semibold w-full sm:w-auto"
        >
          <a href="https://github.com/Docsnine" target="_blank" rel="noreferrer">
            Star on GitHub
          </a>
        </Button>
      </div>
    </section>
  )
}
