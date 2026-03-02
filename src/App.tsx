import { useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
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
import { useAuthStore } from "@/store/auth"
import { ThemeProvider } from "@/components/theme-provider"
import { Loader2 } from "lucide-react"
import { TermsPage } from "@/pages/terms"
import { PrivacyPage } from "@/pages/privacy"
import { ContactPage } from "@/pages/contact"
import { AcceptInvitePage } from "@/pages/auth/accept-invite"
import { GithubOAuthCompletePage } from "@/pages/github-oauth-complete"

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
 * AppRoutes — separated so that useSearchParams works inside Router context.
 */
function AppRoutes() {
  const { initAuth, initialized } = useAuthStore()

  useEffect(() => {
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
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
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
