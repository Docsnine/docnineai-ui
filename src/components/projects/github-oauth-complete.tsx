import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import Loader1 from "../ui/loader1"

/**
 * Landing page for the GitHub repo-connect OAuth popup.
 *
 * Why localStorage instead of postMessage / window.name / window.opener:
 *
 *   - GitHub sets `COOP: same-origin` → window.opener is null in the popup.
 *   - Chrome 88+ clears window.name on cross-origin navigation →
 *     the `window.name = "github-oauth"` trick no longer works.
 *   - localStorage is shared across all same-origin windows/tabs, so the
 *     parent (new-project-modal) can poll it regardless of the above.
 *
 * Flow:
 *   1. Write result to localStorage (parent reads it via setInterval).
 *   2. Try postMessage as a fast path if opener happens to be reachable.
 *   3. Call window.close().
 *   4. If we are still open after 400 ms (close() is a no-op on non-popup
 *      tabs — e.g. when the popup was blocked and the main tab navigated
 *      through GitHub instead), hard-navigate to /projects so the user ends
 *      up on the dashboard with the github= params.
 *
 * IMPORTANT: initAuth() is skipped when pathname === '/github/oauth/complete'
 * (see App.tsx). This prevents the SPA instance running in the popup from
 * calling POST /auth/refresh and rotating the parent's refresh-token cookie.
 */
export function GithubOAuthCompletePage() {
    const [searchParams] = useSearchParams()

    useEffect(() => {
        const status = searchParams.get("github")  // "connected" | "error"
        const user   = searchParams.get("user")    // github username
        const msg    = searchParams.get("msg")     // error message

        // 1. Write to localStorage so the parent modal's poller picks it up
        //    even when window.opener is null (COOP) or window.name was cleared.
        try {
            localStorage.setItem(
                "__docnine_github_oauth_result",
                JSON.stringify({ status, user, msg, ts: Date.now() }),
            )
        } catch { /* private-browsing storage quota — best-effort */ }

        // 2. postMessage as a fast path when opener is still reachable.
        if (window.opener && !window.opener.closed) {
            try {
                window.opener.postMessage(
                    { type: "github-oauth-complete", status, user, msg },
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
            console.log("[GitHub OAuth Complete] Not a popup window, staying on this page")
        }

        return () => {} // No cleanup needed
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader1 className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">Completing GitHub connection…</p>
            </div>
        </div>
    )
}
