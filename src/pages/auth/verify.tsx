import { useEffect, useState } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, MailCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { authApi, ApiException } from "@/lib/api"

/**
 * VerifyPage handles two cases:
 *   1. ?token=<token> in the URL → call POST /auth/verify-email automatically
 *   2. No token param → static "check your email" message (landed here after signup)
 */
export function VerifyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    if (!token) return // No token → show the static "check email" card

    setStatus("loading")
    authApi
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error")
        if (err instanceof ApiException) {
          if (err.code === "TOKEN_EXPIRED") {
            setErrorMessage("This verification link has expired. Please request a new one.")
          } else if (err.code === "TOKEN_INVALID") {
            setErrorMessage("This verification link is invalid or has already been used.")
          } else {
            setErrorMessage(err.message)
          }
        } else {
          setErrorMessage("A network error occurred. Please try again.")
        }
      })
  }, [token])

  // ── Case 1: Token in URL, currently verifying ──────────────────────────
  if (token && status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-muted-foreground">Verifying your email…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Case 2: Token verified successfully ───────────────────────────────
  if (token && status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-1">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Email verified!</CardTitle>
            <CardDescription>Your account is active. You can now sign in.</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // ── Case 3: Token verification failed ────────────────────────────────
  if (token && status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-1">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Verification failed</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-4">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/login">Back to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // ── Case 4: No token → static "check your email" screen ──────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Link to="/" className="mb-8 flex items-center gap-2 font-semibold text-primary">
        <BookOpen className="h-6 w-6" />
        <span className="text-xl">Docnine</span>
      </Link>
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-1">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>We've sent a verification link to your email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please click the link in the email to verify your account and continue to the dashboard.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button variant="outline" className="w-full" asChild>
            <Link to="/login">Back to login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
