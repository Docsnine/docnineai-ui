import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, MailCheck } from "lucide-react"

export function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Link to="/" className="mb-8 flex items-center gap-2 font-semibold text-primary">
        <BookOpen className="h-6 w-6" />
        <span className="text-xl">Docnine</span>
      </Link>
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-1">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>We've sent a verification link to your email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please click the link in the email to verify your account and continue to the dashboard.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button variant="outline" className="w-full" asChild>
            <Link to="/login">Back to login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
