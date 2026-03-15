import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { githubApi, ApiException } from "@/lib/api"
import Loader1 from "@/components/ui/loader1"

/**
 * GitHub OAuth Initiator Page
 * Fetches OAuth URL from backend and redirects
 */
export function GithubOAuthPage() {
    const [searchParams] = useSearchParams()
    const isPopup = searchParams.get("popup") === "1"
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const startOAuth = async () => {
            try {
                const { url } = await githubApi.getOAuthStartUrl()
                window.location.href = url
            } catch (err) {
                if (err instanceof ApiException) {
                    setError(err.message)
                } else {
                    setError("Failed to start GitHub connection. Please try again.")
                }
            }
        }
        startOAuth()
    }, [])

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 text-center max-w-md">
                    <p className="text-sm text-destructive">{error}</p>
                    <button 
                        onClick={() => window.close()} 
                        className="text-sm text-primary hover:underline"
                    >
                        Close window
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader1 className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">
                    {isPopup ? "Connecting to GitHub..." : "Redirecting to GitHub..."}
                </p>
            </div>
        </div>
    )
}
