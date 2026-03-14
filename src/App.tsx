import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useSearchParams,
  useLocation,
  matchPath,
} from "react-router-dom"
import { useAuthStore } from "@/store/auth"
import { useSessionStore } from "@/store/session"
import { ThemeProvider } from "@/providers/theme-provider"
import { getSiteUrl, type SeoConfig, useSeo } from "@/lib/seo"
import { SessionExpiredDialog } from "@/components/dialogs/SessionExpiredDialog"
import ApplicationLogo from "./components/application-logo"
import Loader1 from "./components/ui/loader1"
import { GuestLayout } from "./layout/guest"
import { AuthLayout } from "./layout/auth"

// ─── Lazy-loaded pages ────────────────────────────────────────────

const LandingPage = lazy(() => import("@/pages/Home").then(m => ({ default: m.HomePage })))
const LoginPage = lazy(() => import("@/pages/auth/login").then(m => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import("@/pages/auth/signup").then(m => ({ default: m.SignupPage })))
const VerifyPage = lazy(() => import("@/pages/auth/verify").then(m => ({ default: m.VerifyPage })))
const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password").then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import("@/pages/auth/reset-password").then(m => ({ default: m.ResetPasswordPage })))
const AuthCallbackPage = lazy(() => import("@/pages/auth/callback").then(m => ({ default: m.AuthCallbackPage })))
const CliAuthPage = lazy(() => import("@/pages/auth/cli-auth").then(m => ({ default: m.CliAuthPage })))
const AcceptInvitePage = lazy(() => import("@/pages/auth/accept-invite").then(m => ({ default: m.AcceptInvitePage })))
const GithubOAuthCompletePage = lazy(() => import("@/components/projects/github-oauth-complete").then(m => ({ default: m.GithubOAuthCompletePage })))
const GitlabOAuthCompletePage = lazy(() => import("@/components/projects/gitlab-oauth-complete").then(m => ({ default: m.GitlabOAuthCompletePage })))
const BitbucketOAuthCompletePage = lazy(() => import("@/components/projects/bitbucket-oauth-complete").then(m => ({ default: m.BitbucketOAuthCompletePage })))
const AzureOAuthCompletePage = lazy(() => import("@/components/projects/azure-oauth-complete").then(m => ({ default: m.AzureOAuthCompletePage })))

const DashboardLayout = lazy(() => import("@/layout/dashboard").then(m => ({ default: m.DashboardLayout })))
const DashboardPage = lazy(() => import("@/pages/dashboard/dashboard").then(m => ({ default: m.DashboardPage })))
const ProjectOverviewPage = lazy(() => import("@/pages/projects/overview").then(m => ({ default: m.ProjectOverviewPage })))
const LiveAnalysisPage = lazy(() => import("@/pages/projects/live-analysis").then(m => ({ default: m.LiveAnalysisPage })))
const DocumentationViewerPage = lazy(() => import("@/pages/projects/documentation").then(m => ({ default: m.DocumentationViewerPage })))
const DocumentationsPage = lazy(() => import("@/pages/dashboard/documentations").then(m => ({ default: m.DocumentationsPage })))
const LogsPage = lazy(() => import("@/pages/dashboard/logs").then(m => ({ default: m.LogsPage })))
const ProfilePage = lazy(() => import("@/pages/profile/profile").then(m => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import("@/pages/settings/settings").then(m => ({ default: m.SettingsPage })))
const PricingPage = lazy(() => import("@/pages/guest/pricing").then(m => ({ default: m.PricingPage })))
const PlatformDocsPage = lazy(() => import("@/pages/guest/docs").then(m => ({ default: m.PlatformDocsPage })))
const PublicPortalPage = lazy(() => import("@/pages/docs/public-portal").then(m => ({ default: m.PublicPortalPage })))
const SuperAdminPage = lazy(() => import("@/pages/admin/super-admin").then(m => ({ default: m.SuperAdminPage })))
const TermsPage = lazy(() => import("@/pages/guest/terms").then(m => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import("@/pages/guest/privacy").then(m => ({ default: m.PrivacyPage })))
const ContactPage = lazy(() => import("@/pages/guest/contact").then(m => ({ default: m.ContactPage })))

// ─── Full-screen loader ───────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 bg-background">
      <ApplicationLogo className="h-18" />
      <Loader1 size="md" className="text-muted-foreground" />
    </div>
  )
}

// ─── Billing redirect ─────────────────────────────────────────────

function BillingRedirect() {
  const [searchParams] = useSearchParams()
  const forward = new URLSearchParams(searchParams)
  forward.set("tab", "billing")
  return <Navigate to={`/settings?${forward.toString()}`} replace />
}

// ─── Route guards ─────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/**
 * Landing page only — redirects authenticated users to /projects.
 * Login and signup are intentionally NOT wrapped here so users can
 * switch accounts or sign in to a second account while logged in.
 */
function LandingOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/projects" replace /> : <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user?.role === "super-admin"
    ? <>{children}</>
    : <Navigate to="/projects" replace />
}

// ─── SEO ──────────────────────────────────────────────────────────

const MARKETING_KEYWORDS = [
  "ai documentation",
  "developer documentation",
  "github documentation generator",
  "auto-generate docs from code",
  "codebase documentation",
  "api documentation tool",
  "multi-agent ai",
  "docnine",
  "docnine ai",
  "documentation generator",
  "keep docs in sync",
]

const AUTH_KEYWORDS = [
  "docnine login",
  "docnine signup",
  "developer documentation tool",
]

function getRouteSeo(pathname: string): SeoConfig | null {
  const siteUrl = getSiteUrl()

  // Dynamic portal — SEO set inside PublicPortalPage itself
  if (matchPath("/docs/:slug", pathname)) return null

  // Authenticated workspace — no indexing
  if (
    pathname.startsWith("/projects") ||
    pathname.startsWith("/documentations") ||
    pathname.startsWith("/logs") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin")
  ) {
    return {
      title: "Workspace",
      description: "Docnine workspace — manage your projects and documentation.",
      pathname,
      robots: "noindex, nofollow",
      keywords: [],
    }
  }

  // System / oauth pages — no indexing
  const SYSTEM_PATHS = [
    "/verify", "/auth/callback", "/cli-auth",
    "/github/oauth/complete", "/gitlab/oauth/complete", "/bitbucket/oauth/complete", "/azure/oauth/complete",
    "/forgot-password", "/reset-password",
  ]
  if (
    SYSTEM_PATHS.includes(pathname) ||
    matchPath("/share/accept/:token", pathname)
  ) {
    return {
      title: "Account Access",
      description: "Secure authentication and account access for Docnine.",
      pathname,
      robots: "noindex, nofollow",
      keywords: [],
    }
  }

  const PUBLIC_PAGES: Record<string, SeoConfig> = {
    "/": {
      title: "Docnine -  AI Documentation for Engineering Teams",
      description:
        "Ship better documentations, faster. Stop writing documentation by hand. Create and maintain developer documentation with AI. Docnine generates docs from your codebase, then keeps them up to date as your code evolves.",
      pathname: "/",
      keywords: MARKETING_KEYWORDS,
      appendSiteName: false,
      imageWidth: 1200,
      imageHeight: 630,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Docnine",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description:
          "Generate, publish, and maintain developer documentation from code with AI.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      },
    },
    "/login": {
      title: "Sign In To Your Account",
      description:
        "Sign in to Docnine to generate, publish, and maintain documentation for your codebase — automatically.",
      pathname: "/login",
      keywords: AUTH_KEYWORDS,
      robots: "index, follow",
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Sign In to Docnine",
        url: `${siteUrl}/login`,
        description: "Secure sign-in to the Docnine documentation platform.",
      },
    },
    "/signup": {
      title: "Create a Free Account",
      description:
        "Get started with Docnine for free. Connect your repo and generate your first documentation in minutes.",
      pathname: "/signup",
      keywords: [
        ...AUTH_KEYWORDS,
        "free developer documentation",
        "docnine free plan",
        "github docs generator free",
      ],
      robots: "index, follow",
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Sign Up for Docnine",
        url: `${siteUrl}/signup`,
        description:
          "Create a free Docnine account to auto-generate documentation from your codebase.",
      },
    },
    "/pricing": {
      title: "Pricing Plans",
      description:
        "Start free, then scale. Compare Docnine plans for solo developers and teams — including unlimited projects, security audits, and shared portals.",
      pathname: "/pricing",
      keywords: [
        ...MARKETING_KEYWORDS,
        "documentation pricing",
        "developer tools pricing",
        "docnine free plan",
        "docnine pro",
      ],
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Docnine Pricing",
        url: `${siteUrl}/pricing`,
        description: "Pricing and plan comparison for Docnine's AI documentation platform.",
      },
    },
    "/docs": {
      title: "Platform Documentation",
      description:
        "Everything you need to set up Docnine: GitHub integration, webhooks, AI agent workflows, public portals, exports, and billing.",
      pathname: "/docs",
      keywords: [
        ...MARKETING_KEYWORDS,
        "docnine docs",
        "docnine setup guide",
        "github webhook documentation",
        "how to use docnine",
      ],
      structuredData: {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: "Docnine Platform Documentation",
        url: `${siteUrl}/docs`,
        description: "Official setup and usage guide for the Docnine documentation platform.",
        author: { "@type": "Organization", name: "Docnine", url: siteUrl },
      },
    },
    "/contact": {
      title: "Contact Us",
      description:
        "Reach the Docnine team for support, feature requests, enterprise pricing, or partnership enquiries.",
      pathname: "/contact",
      keywords: ["contact docnine", "docnine support", "docnine enterprise"],
      structuredData: {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "Contact Docnine",
        url: `${siteUrl}/contact`,
      },
    },
    "/terms": {
      title: "Terms and Conditions",
      description:
        "Review Docnine's terms and conditions — account usage, service limits, data handling, and your legal rights.",
      pathname: "/terms",
      keywords: ["docnine terms", "terms and conditions", "docnine legal"],
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Docnine Terms and Conditions",
        url: `${siteUrl}/terms`,
      },
    },
    "/privacy": {
      title: "Privacy Policy",
      description:
        "Learn how Docnine collects, uses, and safeguards your account data, repository contents, and product usage information.",
      pathname: "/privacy",
      keywords: ["docnine privacy", "privacy policy", "data protection", "GDPR"],
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Docnine Privacy Policy",
        url: `${siteUrl}/privacy`,
      },
    },
  }

  return PUBLIC_PAGES[pathname] ?? null
}

function RouteSeoManager() {
  const { pathname } = useLocation()
  const seo = useMemo(() => getRouteSeo(pathname), [pathname])
  useSeo(seo)
  return null
}

function ScrollRestoration() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [pathname])
  return null
}

// ─── App routes ───────────────────────────────────────────────────

function AppRoutes() {
  const { initAuth, initialized } = useAuthStore()
  const { sessionExpiredOpen, hideSessionExpired } = useSessionStore()

  useEffect(() => {
    const oauthPaths = ["/github/oauth/complete", "/gitlab/oauth/complete", "/bitbucket/oauth/complete", "/azure/oauth/complete"]
    if (oauthPaths.includes(window.location.pathname)) {
      useAuthStore.setState({ initialized: true })
      return
    }
    initAuth()
  }, [initAuth])

  if (!initialized) return <PageLoader />

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>

        {/* Guest layouts */}
        <Route element={<GuestLayout />}>
          {/* ── Landing ───────────────────────────────────────────── */}
          <Route path="/" element={<LandingOnlyRoute><LandingPage /></LandingOnlyRoute>} />

          {/* ── Public marketing ─────────────────────────────────── */}
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/docs" element={<PlatformDocsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Route>

        {/* Guest layouts */}
        <Route element={<AuthLayout />}>
          {/* ── Auth — open to everyone, including logged-in users ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>


        {/* ── Public documentation portal ───────────────────────── */}
        <Route path="/docs/:slug" element={<PublicPortalPage />} />

        {/* ── OAuth callbacks ───────────────────────────────────── */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/cli-auth" element={<CliAuthPage />} />
        <Route path="/share/accept/:token" element={<AcceptInvitePage />} />
        <Route path="/github/oauth/complete" element={<GithubOAuthCompletePage />} />
        <Route path="/gitlab/oauth/complete" element={<GitlabOAuthCompletePage />} />
        <Route path="/bitbucket/oauth/complete" element={<BitbucketOAuthCompletePage />} />
        <Route path="/azure/oauth/complete" element={<AzureOAuthCompletePage />} />

        {/* ── Protected workspace ───────────────────────────────── */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={<DashboardPage />} />
          <Route path="projects/:id" element={<ProjectOverviewPage />} />
          <Route path="projects/:id/live" element={<LiveAnalysisPage />} />
          <Route path="projects/:id/docs" element={<DocumentationViewerPage />} />
          <Route path="documentations" element={<DocumentationsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="billing" element={<BillingRedirect />} />
          <Route path="admin" element={<AdminRoute><SuperAdminPage /></AdminRoute>} />
        </Route>

        {/* ── Fallback ──────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
      </Suspense>

      <SessionExpiredDialog open={sessionExpiredOpen} onOpenChange={hideSessionExpired} />
    </>
  )
}

// ─── Root ─────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="docnine-theme">
      <Router>
        <ScrollRestoration />
        <RouteSeoManager />
        <AppRoutes />
      </Router>
    </ThemeProvider>
  )
}