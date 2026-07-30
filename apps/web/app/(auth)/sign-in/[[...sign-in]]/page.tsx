import { SignIn } from '@clerk/nextjs'
import { ClerkAuthShell } from '@/components/auth/ClerkAuthShell'

export default function SignInPage() {
  return <ClerkAuthShell Widget={SignIn} />
}
