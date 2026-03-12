import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import TopHeader from "@/components/header"
import Footer from "@/components/footer"
import BackgroundGrid from "@/components/ui/background-grid"
import { Github, Mail, MessageSquare, Send, Twitter } from "lucide-react"
import CTA from "@/components/CTA"

export function ContactPage() {
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" })
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setStatus("sending")
        try {
            // Replace with your actual contact endpoint when ready
            await new Promise((resolve) => setTimeout(resolve, 1200))
            setStatus("sent")
            setForm({ name: "", email: "", subject: "", message: "" })
        } catch {
            setStatus("error")
        }
    }

    return (
        <div>
            <BackgroundGrid />

            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-foreground/10 blur-[120px] pointer-events-none z-0" />
            <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[40%] h-[30%] rounded-full bg-primary/10 blur-[100px] pointer-events-none z-0" />

            <section className="relative z-10 pt-20 px-4">
                <div className="container mx-auto max-w-5xl mb-24">
                    {/* Page heading */}
                    <div className="mb-16 text-center">
                        <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Get in touch</p>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                            Contact Us
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                            Have a question, found a bug, or just want to say hello? We'd love to hear from you.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
                        {/* Contact info */}
                        <div className="md:col-span-2 space-y-8">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground mb-5">Ways to reach us</h2>
                                <ul className="space-y-5">
                                    <li className="flex items-start gap-4">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-muted/50 shrink-0">
                                            <Mail className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Email</p>
                                            <a
                                                href="mailto:docnineai@gmail.com"
                                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                docnineai@gmail.com
                                            </a>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-muted/50 shrink-0">
                                            <Github className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">GitHub Issues</p>
                                            <a
                                                href="https://github.com/Docsnine"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                github.com/Docsnine
                                            </a>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-muted/50 shrink-0">
                                            <Twitter className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Twitter / X</p>
                                            <a
                                                href="https://twitter.com/docnine"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                @docnine
                                            </a>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-4">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-muted/50 shrink-0">
                                            <MessageSquare className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Community</p>
                                            <a
                                                href="#"
                                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                Join our Discord
                                            </a>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div className="rounded-xl border border-border bg-background/80 backdrop-blur-md p-5">
                                <p className="text-sm font-medium text-foreground mb-1">Response time</p>
                                <p className="text-sm text-muted-foreground">
                                    We typically respond within <span className="text-foreground font-medium">24–48 hours</span>{" "}
                                    on business days.
                                </p>
                            </div>
                        </div>

                        {/* Contact form */}
                        <div className="md:col-span-3">
                            <form
                                onSubmit={handleSubmit}
                                className="rounded-xl border border-border bg-background/80 backdrop-blur-md p-8 space-y-6"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="Your name"
                                            value={form.name}
                                            onChange={handleChange}
                                            required
                                            className="bg-background"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={form.email}
                                            onChange={handleChange}
                                            required
                                            className="bg-background"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subject">Subject</Label>
                                    <Input
                                        id="subject"
                                        name="subject"
                                        placeholder="What's this about?"
                                        value={form.subject}
                                        onChange={handleChange}
                                        required
                                        className="bg-background"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">Message</Label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        rows={6}
                                        placeholder="Tell us more…"
                                        value={form.message}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                                    />
                                </div>

                                {status === "sent" && (
                                    <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                                        <span>✅</span>
                                        <span>Message sent! We'll get back to you soon.</span>
                                    </div>
                                )}

                                {status === "error" && (
                                    <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                        <span>❌</span>
                                        <span>Something went wrong. Please email us directly at docnineai@gmail.com.</span>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={status === "sending" || status === "sent"}
                                    className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full h-11 font-semibold"
                                >
                                    {status === "sending" ? (
                                        "Sending…"
                                    ) : status === "sent" ? (
                                        "Message sent!"
                                    ) : (
                                        <>
                                            Send message <Send className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
