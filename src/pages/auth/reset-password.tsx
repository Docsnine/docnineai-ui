import { useState } from "react"
import { useNavigate, Link, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Loader2, ArrowLeft, KeyRound } from "lucide-react"
import { authApi, ApiException } from "@/lib/api"

const resetPasswordSchema = z
    .object({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")

    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
    })

    const onSubmit = async (data: ResetPasswordFormValues) => {
        if (!token) {
            setError("No reset token found. Please request a new password reset link.")
            return
        }
        setIsLoading(true)
        setError(null)
        try {
            await authApi.resetPassword({ token, password: data.password, confirmPassword: data.confirmPassword })
            setIsSuccess(true)
        } catch (err) {
            if (err instanceof ApiException) {
                if (err.code === "TOKEN_EXPIRED") {
                    setError("This reset link has expired. Please request a new one.")
                } else if (err.code === "TOKEN_INVALID") {
                    setError("This reset link is invalid or has already been used.")
                } else if (err.code === "VALIDATION_ERROR" && err.fields?.length) {
                    setError(err.fields.map((f) => f.message).join(". "))
                } else {
                    setError(err.message)
                }
            } else {
                setError("A network error occurred. Please try again.")
            }
        } finally {
            setIsLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Invalid Link</CardTitle>
                        <CardDescription>
                            This password reset link is missing a token. Please request a new one.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" asChild>
                            <Link to="/forgot-password">Request Reset Link</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
            <Link to="/" className="mb-8 flex items-center gap-2 font-semibold text-primary">
                <BookOpen className="h-6 w-6" />
                <span className="text-xl">Docnine</span>
            </Link>
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <KeyRound className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                    <CardDescription>Enter your new password below.</CardDescription>
                </CardHeader>
                {isSuccess ? (
                    <CardContent className="space-y-4 text-center">
                        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200">
                            Password reset successful! You can now log in with your new password.
                        </div>
                        <Button className="w-full mt-4" onClick={() => navigate("/login")}>
                            Go to Login
                        </Button>
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <Input id="password" type="password" {...register("password")} />
                                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
                                {errors.confirmPassword && (
                                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Reset Password
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
    )
}
