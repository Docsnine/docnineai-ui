import { ChevronDown } from "lucide-react"

const FAQS = [
  "How does Documention work?",
  "Can I use my own OpenAI or Anthropic API key?",
  "What file types and languages does Docnine support?",
  "Is Docnine really free to use?"
]

export function FAQSection() {
  return (
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
          {FAQS.map((question, i) => (
            <div key={i} className="border-b border-border py-6 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors">
              <h3 className="text-lg font-semibold text-foreground">{question}</h3>
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
