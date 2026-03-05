import { LoginForm } from "@/components/auth/login-form"
import { Suspense } from "react"

export default function LoginPage() {
  return (
    <>
      <h2 className="text-xl font-semibold mb-6">Sign in to your account</h2>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  )
}
