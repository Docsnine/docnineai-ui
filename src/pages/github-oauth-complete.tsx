import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Loader2 } from "lucide-react"

/**
 * The server redirects the OAuth popup to this page after GitHub authorisation.
 *
 * Three cases handled:
 *
 * 1. Normal popup (opener intact)
 *    → postMessage to parent, window.close().
 *
 * 2. Popup with severed opener
 *    GitHub sets `COOP: same-origin` on their pages, which permanently nulls
 *    window.opener after the popup passes through github.com. We detect this
 *    via `window.name === "github-oauth"` (set in window.open() and preserved
 *    through cross-origin navigation). → window.close(). The parent modal's
 *    poll-closed handler calls githubApi.getStatus() to detect success.
 *
 * 3. Main-tab full-page fallback (popup was blocked)
 *    The parent navigated the main tab through GitHub. window.name is "", not
 *    "github-oauth". → hard redirect to /projects so initAuth() runs on the
 *    fresh load and the session is restored before ProtectedRoute renders.
 *
 * NEVER call window.location in cases 1 or 2. That loads a new SPA instance
 * which fires initAuth() → rotates the refresh-token cookie → REFRESH_TOKEN_REUSED
 * in the still-open parent tab → user is logged out.
 */
export function GithubOAuthCompletePage() {
    const [searchParams] = useSearchParams()

    useEffect(() => {
        const status = searchParams.get("github")   // "connected" | "error"
        const user   = searchParams.get("user")       // github username
        const msg    = searchParams.get("msg")        // error message

        const isPopup =
            // Normal case: opener still reachable
            (window.opener && !window.opener.closed) ||
            // Severed-opener case: GitHub's COOP: same-origin header permanently
            // nulls window.opener when the popup passes through github.com, but
            // window.name="github-oauth" we set in window.open() persists through
            // cross-origin navigations and reliably identifies the popup context.
            window.name === "github-oauth"

        if (isPopup) {
            // Send result to parent (no-op if opener was severed — the parent is
            // polling popup.closed and will call githubApi.getStatus() instead).
            if (window.opener && !window.opener.closed) {
                try {
                    window.opener.postMessage(
                        { type: "github-oauth-complete", status, user, msg },
                        window.location.origin,
                    )
                } catch {
                    // ignore
                }
            }
            window.close()
        } else {
            // Full-page fallback: the popup was blocked so the parent tab navigated
            // through GitHub itself. Now we must redirect to /projects — but via a
            // hard navigation so that initAuth() runs on the fresh load and the
            // user lands authenticated (we never skipped initAuth() in this path
            // because window.name !== "github-oauth").
            const qs = new URLSearchParams()
            if (status) qs.set("github", status)
            if (user)   qs.set("user", user)
            if (msg)    qs.set("msg", msg)
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
