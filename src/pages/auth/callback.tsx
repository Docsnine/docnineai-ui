/**
 * /auth/callback — OAuth landing page.
 *
 * The server redirects here after a successful GitHub or Google social login:
 *   /auth/callback?accessToken=<jwt>&userId=<id>
 *
 * On error:
 *   /auth/callback?error=<code>
 *
 * This page:
 *  1. Reads the query params.
 *  2. On success: calls authApi.me() to fetch the full user object,
 *     stores tokens in the Zustand store, then redirects to /projects.
 *  3. On error: shows a user-friendly message with a link back to /login.
 */
import { useEffect, useState } from "react"
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import { Loader2, XCircle } from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { authApi, setAccessToken } from "@/lib/api"
import BackgroundGrid from "@/components/ui/background-grid"

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You cancelled the sign-in. No changes were made.",
  GITHUB_CODE_INVALID: "The GitHub authorisation code expired. Please try again.",
  GITHUB_NO_EMAIL: "No verified email found on your GitHub account.",
  GITHUB_LOGIN_NOT_CONFIGURED: "GitHub login is not configured. Contact support.",
  GOOGLE_CODE_INVALID: "The Google authorisation code expired. Please try again.",
  GOOGLE_NO_EMAIL: "No verified email found on your Google account.",
  GOOGLE_LOGIN_NOT_CONFIGURED: "Google login is not configured. Contact support.",
  OAUTH_ERROR: "An error occurred during sign-in. Please try again.",
}

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const error = searchParams.get("error")
    const accessToken = searchParams.get("accessToken")

    if (error) {
      setErrorMessage(ERROR_MESSAGES[error] ?? ERROR_MESSAGES.OAUTH_ERROR)
      return
    }

    if (!accessToken) {
      setErrorMessage("No access token received. Please try signing in again.")
      return
    }

    // Store the token so authApi.me() can use it.
    setAccessToken(accessToken)

    // Fetch the full user profile from /auth/me.
    authApi.me().then(({ user }) => {
      setTokens(user, accessToken)
      navigate("/projects", { replace: true })
    }).catch(() => {
      setErrorMessage("Failed to load your account. Please try signing in again.")
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col items-center justify-center overflow-hidden font-sans">
      <BackgroundGrid />
      <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[40%] h-[30%] rounded-full bg-primary/20 blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10 text-center space-y-4">
        {errorMessage ? (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Sign-in failed</h1>
            <p className="text-sm text-muted-foreground max-w-sm">{errorMessage}</p>
            <Link
              to="/login"
              className="inline-block mt-2 text-sm text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  )
}
