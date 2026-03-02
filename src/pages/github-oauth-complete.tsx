import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Loader2 } from "lucide-react"

/**
 * The server redirects the OAuth popup to this page after GitHub authorisation.
 * If running in a popup, it postMessages the result to the parent and closes.
 * If the popup was blocked / opener was severed, it hard-navigates to /projects.
 */
export function GithubOAuthCompletePage() {
    const [searchParams] = useSearchParams()

    useEffect(() => {
        const status = searchParams.get("github")   // "connected" | "error"
        const user = searchParams.get("user")     // github username
        const msg = searchParams.get("msg")      // error message

        if (window.opener && !window.opener.closed) {
            // We're inside a popup — notify the parent and close.
            try {
                window.opener.postMessage(
                    { type: "github-oauth-complete", status, user, msg },
                    window.location.origin,
                )
            } catch {
                // Cross-origin postMessage can fail in rare edge cases — ignore.
            }
            window.close()
        } else {
            // No opener — either the popup was blocked (full-page nav happened)
            // or COOP headers severed window.opener after bouncing through GitHub.
            //
            // Use a hard navigation instead of React Router's navigate().
            // This triggers a fresh page load where initAuth() will run normally
            // to restore the session before ProtectedRoute renders — avoiding the
            // "redirected to /login because isAuthenticated is false" issue that
            // occurs when we skipped initAuth() in App.tsx for this route.
            const qs = new URLSearchParams()
            if (status) qs.set("github", status)
            if (user) qs.set("user", user)
            if (msg) qs.set("msg", msg)
            window.location.replace(`/projects?${qs.toString()}`)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Completing GitHub connection…</p>
            </div>
        </div>
    )
}
