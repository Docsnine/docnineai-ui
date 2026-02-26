import { Button } from "@/components/ui/button"
import { ArrowRight, Github, Sparkles, Mail, MessageSquare, UserPlus, Building2, Send, ChevronDown, Twitter } from "lucide-react"
import { Link } from "react-router-dom"
import { ThemeToggle } from "@/components/theme-toggle"
import TopHeader from "@/components/header"
import BackgroundGrid from "@/components/ui/background-grid"
import Footer from "@/components/footer"

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden font-sans">
      <BackgroundGrid />

      {/* Top Left Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-foreground/10 blur-[120px] pointer-events-none z-0" />

      {/* Center Cyan Glow */}
      <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[40%] h-[30%] rounded-full bg-primary/20 blur-[100px] pointer-events-none z-0" />

      <TopHeader />

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-24 pb-20 px-4 text-center">
        {/* Live Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-muted/50 backdrop-blur-sm mb-12">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground font-medium">Docnine is now live — Open Source & AI-Powered</span>
        </div>

        {/* Headline */}
        <h1 className="text-[48px] leading-[48px] sm:text-[72px] sm:leading-[72px] md:text-[96px] md:leading-[96px] font-bold tracking-tight mb-8">
          <span className="text-foreground">Documentation</span>
          <br />
          <span className="text-primary">That Speak.</span>
        </h1>

        {/* Subheadline */}
        <p className="max-w-3xl text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed mb-12">
          Docnine isn't just a chat app. It's a self-hosted workspace that understands
          your codebase, runs snippets, and summarizes threads instantly.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 h-14 text-lg font-semibold w-full sm:w-auto shadow-[0_0_40px_rgba(0,210,200,0.15)] dark:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_60px_rgba(0,210,200,0.25)] dark:hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
          >
            <Link to="/signup">
              Start Free <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="bg-transparent border-border text-foreground hover:bg-muted rounded-full px-8 h-14 text-lg font-semibold w-full sm:w-auto"
          >
            <a href="https://github.com" target="_blank" rel="noreferrer">
              <Github className="mr-2 h-5 w-5" /> Star on GitHub
            </a>
          </Button>
        </div>
      </main>

      {/* Get Started Steps Section */}
      <section className="relative z-10 py-24 px-4 border-t border-border bg-background">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-[48px] leading-[48px] font-bold tracking-tight text-foreground mb-6">
            Get started in minutes
          </h2>
          <p className="text-xl text-muted-foreground mb-20">
            No complex setup. No enterprise sales calls. Just start collaborating.
          </p>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-[1px] bg-border z-0" />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-3xl bg-[#0a0a0a] border border-border flex items-center justify-center mb-6 shadow-sm">
                <UserPlus className="w-8 h-8 text-muted-foreground" />
                <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center border-4 border-background">
                  1
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Sign Up</h3>
              <p className="text-muted-foreground leading-relaxed max-w-[250px]">
                Create your account in under 30 seconds. No credit card required.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-3xl bg-[#0a0a0a] border border-border flex items-center justify-center mb-6 shadow-sm">
                <Building2 className="w-8 h-8 text-muted-foreground" />
                <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center border-4 border-background">
                  2
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Create Workspace</h3>
              <p className="text-muted-foreground leading-relaxed max-w-[250px]">
                Set up your team workspace with channels and permissions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-3xl bg-[#0a0a0a] border border-border flex items-center justify-center mb-6 shadow-sm">
                <Send className="w-8 h-8 text-muted-foreground" />
                <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center border-4 border-background">
                  3
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">Invite Your Team</h3>
              <p className="text-muted-foreground leading-relaxed max-w-[250px]">
                Share a link and start collaborating with AI-powered chat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-24 px-4 border-t border-border bg-background">
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
              "How does the AI work?",
              "Is my data used to train AI models?",
              "Can I use my own AI API key?",
              "What makes Docnine different from Slack + ChatGPT?",
              "How much does AI cost?",
              "Is Docnine really free?"
            ].map((question, i) => (
              <div key={i} className="border-b border-border py-6 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors">
                <h3 className="text-lg font-semibold text-foreground">{question}</h3>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-4 border-t border-border bg-background flex justify-center">
        <div className="container max-w-5xl relative overflow-hidden rounded-[2.5rem] bg-[#0a0a0a] border border-border/50 p-12 sm:p-20 text-center">
          {/* Background Glow for CTA */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full bg-primary/10 blur-[100px] pointer-events-none z-0" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              Development barely has to feel like work
            </div>

            <h2 className="text-[48px] leading-[48px] sm:text-[64px] sm:leading-[64px] font-bold tracking-tight text-foreground mb-8">
              Ready to upgrade your workflow?
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Join thousands of engineering teams who have switched to Docnine for a faster, smarter, and cleaner collaboration experience.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Button
                asChild
                className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 h-14 text-lg font-semibold w-full sm:w-auto"
              >
                <Link to="/signup">
                  Start Free Forever <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-border text-foreground hover:bg-muted rounded-full px-8 h-14 text-lg font-semibold w-full sm:w-auto"
              >
                <a href="https://github.com" target="_blank" rel="noreferrer">
                  <Github className="mr-2 h-5 w-5" /> Star on GitHub
                </a>
              </Button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground font-mono">
              documentation <span className="text-foreground">==</span> <span className="text-primary">true</span> <span className="text-foreground">&&</span> no_credit_card <span className="text-foreground">==</span> <span className="text-primary">true</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
