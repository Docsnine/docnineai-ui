import { Button } from "@/components/ui/button"
import { ArrowRight, Github, Sparkles, UserPlus, GitBranch, FileText, Send, ChevronDown } from "lucide-react"
import { Link } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import TopHeader from "@/components/header"
import BackgroundGrid from "@/components/ui/background-grid"
import Footer from "@/components/footer"
import CTA from "@/components/CTA"

export function HomePage() {
  return (
    <div>
      <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden pointer-events-none">
        <BackgroundGrid />
      </div>

      {/* Top Left Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-foreground/5 blur-[120px] pointer-events-none z-0" />

      {/* Hero Section */}
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
              <Github className="mr-2 h-5 w-5" /> Star on GitHub
            </a>
          </Button>
        </div>
      </section>

      {/* Get Started Steps Section */}
      <section className="relative z-10 py-24 px-4 bg-background">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-[48px] leading-[48px] font-bold tracking-tight text-foreground mb-6">
            Up and running in 4 steps
          </h2>
          <p className="text-xl text-muted-foreground mb-20">
            No complex config. No enterprise sales calls. Your docs are live in minutes.
          </p>

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-[1px] bg-border z-0" />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-3xl bg-secondary border border-border flex items-center justify-center mb-6">
                <UserPlus className="w-8 h-8 text-muted-foreground" />
                <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center border-4 border-background">
                  1
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Sign Up</h3>
              <p className="text-muted-foreground leading-relaxed max-w-[250px]">
                Create your account in under 30 seconds.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-3xl bg-secondary border border-border flex items-center justify-center mb-6">
                <GitBranch className="w-8 h-8 text-muted-foreground" />
                <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center border-4 border-background">
                  2
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Connect GitHub</h3>
              <p className="text-muted-foreground leading-relaxed max-w-[250px]">
                Link your GitHub account and pick any repo.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-3xl bg-secondary border border-border flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-muted-foreground" />
                <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center border-4 border-background">
                  3
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">AI Generates Docs</h3>
              <p className="text-muted-foreground leading-relaxed max-w-[250px]">
                Scans and produces structured documentation.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-3xl bg-secondary border border-border flex items-center justify-center mb-6">
                <Send className="w-8 h-8 text-muted-foreground" />
                <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center border-4 border-background">
                  4
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Chat & Collaborate</h3>
              <p className="text-muted-foreground leading-relaxed max-w-[250px]">
                Let the AI answer from your code with teammates
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-24 px-4 bg-background">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-16 text-center">
            <h2 className="text-[48px] leading-[48px] font-bold tracking-tight text-foreground mb-6">
              Frequently asked questions
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about Docnine.
            </p>
          </div>

          <div className="space-y-0">
            {[
              "How does Documention work?",
              "Can I use my own OpenAI or Anthropic API key?",
              "What file types and languages does Docnine support?",
              "Is Docnine really free to use?"
            ].map((question, i) => (
              <div key={i} className="border-b border-border py-6 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors">
                <h3 className="text-lg font-semibold text-foreground">{question}</h3>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
