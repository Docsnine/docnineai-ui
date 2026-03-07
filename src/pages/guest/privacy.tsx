import TopHeader from "@/components/header"
import Footer from "@/components/footer"
import BackgroundGrid from "@/components/ui/background-grid"
import CTA from "@/components/CTA"

export function PrivacyPage() {
    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-hidden font-sans">
            <BackgroundGrid />

            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-foreground/10 blur-[120px] pointer-events-none z-0" />

            <TopHeader />

            <main className="relative z-10 py-20 px-4">
                <div className="container mx-auto max-w-3xl mb-24">
                    {/* Page heading */}
                    <div className="mb-12">
                        <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Legal</p>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
                            Privacy Policy
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Last updated: March 2, 2025
                        </p>
                    </div>

                    <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-muted-foreground leading-relaxed">

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">1. Overview</h2>
                            <p>
                                Docnine ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy
                                explains what data we collect, how we use it, and your rights regarding that data when
                                you use our Service at{" "}
                                <a href="https://docnine.com" className="text-primary hover:underline">
                                    docnine.com
                                </a>
                                .
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
                            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">Account Information</h3>
                            <p>
                                When you register, we collect your name, email address, and a hashed version of your
                                password. If you sign in via GitHub OAuth, we receive your GitHub username and public
                                profile information.
                            </p>
                            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">Repository Data</h3>
                            <p>
                                To generate documentation, we temporarily read the contents of repositories you
                                connect. This data is used solely to run our AI pipeline and is not stored
                                permanently beyond what is necessary to produce and cache your documentation.
                            </p>
                            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">Usage Data</h3>
                            <p>
                                We collect basic usage information such as pages visited, features used, and error
                                logs to improve the Service. This data is anonymised where possible.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
                            <ul className="list-disc list-inside space-y-2 mt-2">
                                <li>To provide, operate, and improve the Service.</li>
                                <li>To authenticate you and protect your account.</li>
                                <li>To send transactional emails (e.g., email verification, password reset).</li>
                                <li>To respond to support enquiries.</li>
                                <li>To detect and prevent fraud or abuse.</li>
                            </ul>
                            <p className="mt-4">
                                We do not sell, rent, or trade your personal information to third parties for
                                marketing purposes.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">4. GitHub Tokens</h2>
                            <p>
                                OAuth tokens issued by GitHub are encrypted at rest using AES-256 and are never
                                logged or exposed in API responses. Tokens are used exclusively to read repository
                                content on your behalf. You can revoke access at any time from your GitHub settings
                                or your Docnine account settings.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies &amp; Local Storage</h2>
                            <p>
                                We use an httpOnly, secure cookie to store your refresh token for session
                                persistence. We do not use third-party tracking or advertising cookies. Local
                                storage is used only to save your UI preferences (e.g., colour theme).
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Retention</h2>
                            <p>
                                Account data is retained for as long as your account is active. Project and
                                documentation data is retained until you delete the project or your account.
                                You may request deletion of your data at any time by contacting us.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">7. Third-Party Services</h2>
                            <p>
                                We may use the following third-party providers to operate the Service:
                            </p>
                            <ul className="list-disc list-inside space-y-2 mt-2">
                                <li><strong className="text-foreground">MongoDB Atlas</strong> — database hosting.</li>
                                <li><strong className="text-foreground">Vercel</strong> — infrastructure and deployment.</li>
                                <li><strong className="text-foreground">OpenAI / LLM providers</strong> — AI pipeline processing (no data is used to train third-party models).</li>
                            </ul>
                            <p className="mt-4">
                                Each provider is bound by their own privacy policies and data processing agreements.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">8. Your Rights</h2>
                            <p>
                                Depending on your jurisdiction, you may have the right to access, correct, or delete
                                your personal data; restrict or object to processing; or request data portability.
                                To exercise any of these rights, contact us at{" "}
                                <a href="mailto:docnineai@gmail.com" className="text-primary hover:underline">
                                    docnineai@gmail.com
                                </a>
                                .
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">9. Security</h2>
                            <p>
                                We take reasonable technical and organisational measures to protect your data
                                against unauthorised access, disclosure, or destruction. However, no method of
                                transmission over the internet is 100% secure.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to This Policy</h2>
                            <p>
                                We may update this Privacy Policy periodically. We will notify you of significant
                                changes via email or an in-app notice at least 7 days before they take effect.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact</h2>
                            <p>
                                Privacy questions or data requests? Email us at{" "}
                                <a href="mailto:docnineai@gmail.com" className="text-primary hover:underline">
                                    docnineai@gmail.com
                                </a>
                                .
                            </p>
                        </section>
                    </div>
                </div>

                {/* CTA Section */}
                <CTA />
            </main>

            <Footer />
        </div>
    )
}
