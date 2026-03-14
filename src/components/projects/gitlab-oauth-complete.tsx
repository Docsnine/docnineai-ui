import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import Loader1 from "../ui/loader1"

/**
 * Landing page for the GitLab repo-connect OAuth popup.
 *
 * Flow:
 *   1. Write result to localStorage (parent reads it via setInterval).
 *   2. Try postMessage as a fast path if opener happens to be reachable.
 *   3. Call window.close().
 *   4. If we are still open after 400 ms (close() is a no-op on non-popup
 *      tabs), hard-navigate to /projects so the user ends up on the dashboard.
 *
 * IMPORTANT: initAuth() is skipped when pathname === '/gitlab/oauth/complete'
 * (see App.tsx). This prevents the SPA instance running in the popup from
 * calling POST /auth/refresh and rotating the parent's refresh-token cookie.
 */
export function GitlabOAuthCompletePage() {
    const [searchParams] = useSearchParams()

    useEffect(() => {
        const status = searchParams.get("gitlab")  // "connected" | "error"
        const user   = searchParams.get("user")    // gitlab username
        const msg    = searchParams.get("msg")     // error message

        // 1. Write to localStorage so the parent modal's poller picks it up
        try {
            localStorage.setItem(
                "__docnine_gitlab_oauth_result",
                JSON.stringify({ status, user, msg, ts: Date.now() }),
            )
        } catch { /* private-browsing storage quota — best-effort */ }

        // 2. postMessage as a fast path when opener is still reachable.
        if (window.opener && !window.opener.closed) {
            try {
                window.opener.postMessage(
                    { type: "gitlab-oauth-complete", status, user, msg },
                    window.location.origin,
                )
            } catch { /* ignore */ }
        }

        // 3. Close this window (works when we're a popup).
        if (window.opener) {
            window.close()
        } else {
            // If not a popup, just show a message to the user
            // Don't navigate - let the parent handle its own routing
            console.log("[GitLab OAuth Complete] Not a popup window, staying on this page")
        }

        return () => {} // No cleanup needed
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader1 className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">Completing GitLab connection…</p>
            </div>
        </div>
    )
}
