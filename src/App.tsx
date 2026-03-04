import { useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from "react-router-dom"
import { LandingPage } from "@/pages/landing"
import { LoginPage } from "@/pages/auth/login"
import { SignupPage } from "@/pages/auth/signup"
import { VerifyPage } from "@/pages/auth/verify"
import { ForgotPasswordPage } from "@/pages/auth/forgot-password"
import { ResetPasswordPage } from "@/pages/auth/reset-password"
import { AuthCallbackPage } from "@/pages/auth/callback"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardPage } from "@/pages/dashboard"
import { ProjectOverviewPage } from "@/pages/projects/overview"
import { LiveAnalysisPage } from "@/pages/projects/live-analysis"
import { DocumentationViewerPage } from "@/pages/projects/documentation"
import { DocumentationsPage } from "@/pages/documentations"
import { LogsPage } from "@/pages/logs"
import { ProfilePage } from "@/pages/profile"
import { SettingsPage } from "@/pages/settings"
import { PricingPage } from "@/pages/pricing"
// BillingPage now lives inside Settings — kept import-free
import { useAuthStore } from "@/store/auth"
import { ThemeProvider } from "@/components/theme-provider"
import { Loader2 } from "lucide-react"
import { TermsPage } from "@/pages/guest/terms"
import { PrivacyPage } from "@/pages/guest/privacy"
import { ContactPage } from "@/pages/guest/contact"
import { AcceptInvitePage } from "@/pages/auth/accept-invite"
import { GithubOAuthCompletePage } from "@/components/projects/github-oauth-complete"
import { PublicPortalPage } from "@/pages/docs/public-portal"

/**
 * Forwards the /billing route plus any Flutterwave callback params
 * (?transaction_id, ?tx_ref, ?status …) to /settings?tab=billing
 * so the BillingTab can verify the payment after redirect.
 */
function BillingRedirect() {
  const [searchParams] = useSearchParams()
  const forward = new URLSearchParams(searchParams)
  forward.set('tab', 'billing')
  return <Navigate to={`/settings?${forward.toString()}`} replace />
}

/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Only rendered after initAuth() has completed (initialized === true).
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

/**
 * PublicOnlyRoute — redirects already-authenticated users to /projects.
 * Used for landing, login, and signup so authenticated users don't see
 * the marketing / auth pages again.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/projects" replace />
  }

  return <>{children}</>
}

/**
 * AppRoutes — separated so that useSearchParams works inside Router context.
 */
function AppRoutes() {
  const { initAuth, initialized } = useAuthStore()

  useEffect(() => {
    /**
     * Important: Do NOT call initAuth() on the /github/oauth/complete page. 
     * That page is loaded in a popup by the GitHub OAuth flow, and its sole purpose 
     * is to receive the OAuth result from GitHub, write it to localStorage, and then 
     * close itself. If we called initAuth() there, 
     * it would immediately make a POST /auth/refresh request, which would rotate the 
     * refresh token in the httpOnly cookie. This would cause the still-open parent 
     * tab (where the user initiated the login) to have its refresh token invalidated, 
     * leading to a REFRESH_TOKEN_REUSED error and logging the user out just as they're 
     * trying to log in. By skipping initAuth() on this specific page, 
     * we allow the OAuth flow to complete successfully without interfering 
     * with the parent tab's session.
     */
    const isOAuthCompletePage = window.location.pathname === '/github/oauth/complete'
    if (isOAuthCompletePage) {
      useAuthStore.setState({ initialized: true })
      return
    }
    // Attempt silent session restore from the httpOnly refresh-token cookie.
    initAuth()
  }, [initAuth])

  // Block render until we know if the user is authenticated.
  // This prevents the protected route from flashing the login page
  // before the refresh token check completes.
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Routes — accessible by all */}
      <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* OAuth social login callback */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/share/accept/:token" element={<AcceptInvitePage />} />
      <Route path="/github/oauth/complete" element={<GithubOAuthCompletePage />} />
      {/* Public documentation portal — no auth required */}
      <Route path="/docs/:slug" element={<PublicPortalPage />} />
      {/* Public pricing page — no auth required */}
      <Route path="/pricing" element={<PricingPage />} />

      {/* Protected Routes — nested under DashboardLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
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
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="docnine-theme">
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  )
}
