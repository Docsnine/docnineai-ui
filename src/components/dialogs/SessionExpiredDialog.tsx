import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/store/auth"
import { useSubscriptionStore } from "@/store/subscription"

interface SessionExpiredDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SessionExpiredDialog({
    open,
    onOpenChange,
}: SessionExpiredDialogProps) {
    const navigate = useNavigate()
    const { clearAuth } = useAuthStore()
    const { reset: resetSubscription } = useSubscriptionStore()

    const handleLoginAgain = () => {
        clearAuth()
        resetSubscription()
        onOpenChange(false)
        navigate("/login", { replace: true })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <DialogTitle>Session Expired</DialogTitle>
                    </div>
                    <DialogDescription>
                        Your session has expired. Please log in again to continue.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-6 flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={!open}
                    >
                        Close
                    </Button>
                    <Button
                        onClick={handleLoginAgain}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Log In Again
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
