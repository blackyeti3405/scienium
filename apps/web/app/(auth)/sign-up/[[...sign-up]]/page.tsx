import { SignUp } from '@clerk/nextjs'
import { ClerkAuthShell } from '@/components/auth/ClerkAuthShell'

export default function SignUpPage() {
  return <ClerkAuthShell Widget={SignUp} />
}
