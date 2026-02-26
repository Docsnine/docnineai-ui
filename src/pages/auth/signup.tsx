import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Loader2 } from "lucide-react"
import BackgroundGrid from "@/components/ui/background-grid"
import TopHeader from "@/components/header"

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type SignupFormValues = z.infer<typeof signupSchema>

export function SignupPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      // Redirect to verify email
      navigate("/verify")
    } catch (err) {
      setError("An error occurred during signup.")
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
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription>Enter your details below to create your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register("password")} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
