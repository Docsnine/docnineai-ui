import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { sharingApi } from "@/lib/api"
import { useAuthStore } from "@/store/auth"
import { CheckCircle2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Loader1 from "@/components/ui/loader1"

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [state, setState] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [projectId, setProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setState("error")
      setMessage("Invalid invite link.")
      return
    }

    if (!isAuthenticated) {
      // Redirect to login and come back after
      navigate(`/login?redirect=/share/accept/${token}`, { replace: true })
      return
    }

    sharingApi
      .acceptInvite(token)
      .then((data) => {
        setState("success")
        setProjectId(data.projectId)
        setMessage(`You now have ${data.role} access to this project.`)
      })
      .catch((err: any) => {
        setState("error")
        setMessage(err?.message ?? "Failed to accept invite.")
      })
  }, [token, isAuthenticated, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        {state === "loading" && (
          <>
            <Loader1 className="h-10 w-10  text-primary mx-auto" />
            <p className="text-muted-foreground">Accepting invitation…</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold">Invite Accepted!</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button asChild className="w-full">
              <Link to={projectId ? `/projects/${projectId}` : "/projects"}>
                Go to Project
              </Link>
            </Button>
          </>
        )}
        {state === "error" && (
          <>
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Invite Failed</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/projects">Go to Dashboard</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
