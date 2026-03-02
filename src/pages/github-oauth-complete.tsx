import { useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"

/**
 * The server redirects the popup here after the user authorises GitHub access.
 * recting to /projects with the params.
 */
export function GithubOAuthCompletePage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

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
            // No opener — popup was blocked or the link was opened directly.
            // Redirect to /projects so the dashboard can handle the params.
            const qs = new URLSearchParams()
            if (status) qs.set("github", status)
            if (user) qs.set("user", user)
            if (msg) qs.set("msg", msg)
            navigate(`/projects?${qs.toString()}`, { replace: true })
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
