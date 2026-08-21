import { SignInForm } from '@/modules/identity/ui/SignInForm'

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      <h1 className="font-display text-[28px] font-light text-ink">Panel del atelier</h1>
      <SignInForm />
    </div>
  )
}
