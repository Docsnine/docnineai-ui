import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Loader2, ArrowLeft } from "lucide-react"
import { authApi, ApiException } from "@/lib/api"
import TopHeader from "@/components/header"
import BackgroundGrid from "@/components/ui/background-grid"

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
    })

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        setIsLoading(true)
        setError(null)
        try {
            // The backend always returns 200 to prevent email enumeration.
            await authApi.forgotPassword(data.email)
            setIsSuccess(true)
        } catch (err) {
            // The API shouldn't 4xx here, but handle defensively.
            if (err instanceof ApiException) {
                setError(err.message)
            } else {
                setError("A network error occurred. Please try again.")
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-hidden font-sans">
            <BackgroundGrid />

            {/* Top Left Glow */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-foreground/10 blur-[120px] pointer-events-none z-0" />

            {/* Center Cyan Glow */}
            <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[40%] h-[30%] rounded-full bg-primary/20 blur-[100px] pointer-events-none z-0" />

            <TopHeader />

            <div className="flex flex-col items-center justify-center p-4 z-10 mt-10">
                <Card className="w-full max-w-md bg-background/80 backdrop-blur-md">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
                        <CardDescription>Enter your email address to reset your password</CardDescription>
                    </CardHeader>
                    {isSuccess ? (
                        <CardContent className="space-y-4 text-center">
                            <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200">
                                If an account exists with that email, we have sent a password reset link.
                            </div>
                            <Button variant="outline" className="w-full mt-4" asChild>
                                <Link to="/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
                                </Link>
                            </Button>
                        </CardContent>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <CardContent className="space-y-4">
                                {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="m@example.com" {...register("email")} />
                                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col space-y-4">
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Send Reset Link
                                </Button>
                                <div className="text-center text-sm text-muted-foreground">
                                    <Link to="/login" className="text-primary hover:underline flex items-center justify-center">
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
                                    </Link>
                                </div>
                            </CardFooter>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    )
}
