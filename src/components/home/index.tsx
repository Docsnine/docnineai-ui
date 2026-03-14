import { ThemeToggle } from "@/components/theme-toggle"
import TopHeader from "@/components/header"
import BackgroundGrid from "@/components/ui/background-grid"
import Footer from "@/components/footer"
import CTA from "@/components/CTA"
import { HeroSection, StepsSection, FAQSection } from "./sections"

export function HomePage() {
  return (
    <div>
      <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden pointer-events-none">
        <BackgroundGrid />
      </div>

      {/* Top Left Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-foreground/5 blur-[120px] pointer-events-none z-0" />

      {/* Sections */}
      <HeroSection />
      <StepsSection />
      <FAQSection />
    </div>
  )
}
