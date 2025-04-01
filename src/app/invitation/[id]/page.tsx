"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react"

export default function AcceptInvitationPage({
  params,
}: {
  params: { id: string }
}) {
  const { data: session, status } = useSession()
  const [state, setState] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Verifying your invitation...")
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    async function handleInvitation() {
      try {
        if (!session?.user) {
          // Store inviteId before redirecting to login
          sessionStorage.setItem("inviteId", params.id)
          router.push("/")
          return
        }

        // Process the invitation if user is logged in
        const response = await axios.post(`/api/invite/${params.id}/accept`)

        if (response.status === 200) {
          setState("success")
          setMessage("Invitation accepted successfully!")

          // Redirect after a short delay to show success message
          setTimeout(() => {
            router.push("/dashboard")
          }, 2000)
        }
      } catch (error: any) {
        setState("error")

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          sessionStorage.setItem("inviteId", params.id)
          setMessage("Please log in to accept this invitation")

          // Redirect after a short delay
          setTimeout(() => {
            router.push("/")
          }, 2000)
          return
        }

        // Handle other errors
        setMessage(error.response?.data?.message || "Failed to accept invitation. Please try again.")
      }
    }

    handleInvitation()
  }, [params.id, router, session, status])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Team Invitation</CardTitle>
          <CardDescription>
            {status === "loading" ? "Checking your session..." : "Processing your invitation"}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center py-6">
          {(status === "loading" || state === "loading") && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">{message}</p>
            </div>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-center font-medium">{message}</p>
              <p className="text-center text-sm text-muted-foreground">Redirecting you to the dashboard...</p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center font-medium">{message}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t bg-muted/50 p-4">
          {state === "error" && (
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>

              <Button onClick={() => router.push("/")}>
                Go to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {state === "success" && (
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

