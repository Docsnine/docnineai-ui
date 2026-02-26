import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { LandingPage } from "@/pages/landing"
import { LoginPage } from "@/pages/auth/login"
import { SignupPage } from "@/pages/auth/signup"
import { VerifyPage } from "@/pages/auth/verify"
import { ForgotPasswordPage } from "@/pages/auth/forgot-password"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardPage } from "@/pages/dashboard"
import { ProjectOverviewPage } from "@/pages/projects/overview"
import { LiveAnalysisPage } from "@/pages/projects/live-analysis"
import { DocumentationViewerPage } from "@/pages/projects/documentation"
import { useAuthStore } from "@/store/auth"
import { ThemeProvider } from "@/components/theme-provider"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="docnine-theme">
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="projects" element={<DashboardPage />} />
            <Route path="projects/:id" element={<ProjectOverviewPage />} />
            <Route path="projects/:id/live" element={<LiveAnalysisPage />} />
            <Route path="projects/:id/docs" element={<DocumentationViewerPage />} />
            <Route path="profile" element={<div className="p-6">Profile Settings (Coming Soon)</div>} />
            <Route path="settings" element={<div className="p-6">Global Settings (Coming Soon)</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}
