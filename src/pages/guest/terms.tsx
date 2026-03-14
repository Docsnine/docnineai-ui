import TopHeader from "@/components/header"
import Footer from "@/components/footer"
import BackgroundGrid from "@/components/ui/background-grid"
import CTA from "@/components/CTA"

export function TermsPage() {
    return (
        <div>
            <BackgroundGrid />
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-foreground/10 blur-[120px] pointer-events-none z-0" />

            <section className="relative z-10 py-20 px-4">
                <div className="container mx-auto max-w-3xl mb-24">
                    {/* Page heading */}
                    <div className="mb-12">
                        <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Legal</p>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                            Terms &amp; Conditions
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Last updated: March 2, 2025
                        </p>
                    </div>

                    <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-muted-foreground leading-relaxed">

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
                            <p>
                                By accessing or using Docnine ("Service"), you agree to be bound by these Terms &amp;
                                Conditions ("Terms"). If you do not agree to these Terms, you may not use the Service.
                                These Terms apply to all visitors, users, and others who access or use the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
                            <p>
                                Docnine is an AI-powered documentation generation platform that analyses GitHub
                                repositories and produces structured technical documentation. The Service is provided
                                "as is" and may change at any time without notice.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
                            <p>
                                You must provide accurate and complete information when creating an account. You are
                                responsible for maintaining the confidentiality of your credentials and for all
                                activities that occur under your account. Notify us immediately at{" "}
                                <a href="mailto:docnineai@gmail.com" className="text-primary hover:underline">
                                    docnineai@gmail.com
                                </a>{" "}
                                if you suspect unauthorised use of your account.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">4. GitHub Integration</h2>
                            <p>
                                When you connect a GitHub account, you authorise Docnine to read repository contents
                                for documentation purposes only. We do not write to, modify, or delete your
                                repositories. Tokens are stored encrypted and never shared with third parties.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">5. Acceptable Use</h2>
                            <p>You agree not to:</p>
                            <ul className="list-disc list-inside space-y-2 mt-2">
                                <li>Use the Service for any unlawful purpose or in violation of any regulations.</li>
                                <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
                                <li>Submit repositories containing malware, exploits, or harmful content.</li>
                                <li>Resell, sublicense, or commercially exploit the Service without written consent.</li>
                                <li>Interfere with or disrupt the integrity or performance of the Service.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">6. Intellectual Property</h2>
                            <p>
                                All content, branding, and software comprising Docnine remain the exclusive property
                                of Docnine. Generated documentation is owned by you. By using the Service, you grant
                                Docnine a limited, non-exclusive licence to process your repository data solely to
                                provide the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">7. Disclaimer of Warranties</h2>
                            <p>
                                The Service is provided without warranties of any kind, express or implied. We do not
                                warrant that the Service will be uninterrupted, error-free, or that generated
                                documentation will be accurate or complete. You use the Service at your own risk.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
                            <p>
                                To the fullest extent permitted by applicable law, Docnine shall not be liable for any
                                indirect, incidental, special, consequential, or punitive damages arising from your use
                                of, or inability to use, the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">9. Termination</h2>
                            <p>
                                We reserve the right to suspend or terminate your access to the Service at our sole
                                discretion, without notice, for conduct that violates these Terms or is otherwise
                                harmful to Docnine, other users, or third parties.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to Terms</h2>
                            <p>
                                We may update these Terms at any time. Continued use of the Service after changes
                                constitutes your acceptance of the new Terms. We will make reasonable efforts to notify
                                users of material changes via email or an in-app notice.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact</h2>
                            <p>
                                Questions about these Terms? Reach us at{" "}
                                <a href="mailto:docnineai@gmail.com" className="text-primary hover:underline">
                                    docnineai@gmail.com
                                </a>
                                .
                            </p>
                        </section>
                    </div>
                </div>
            </section>
        </div>
    )
}
