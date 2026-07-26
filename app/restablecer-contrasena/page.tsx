import { BrandLogo } from '@/components/brand-logo'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <main className="min-h-dvh bg-black px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-sm flex-col justify-center">
        <div className="mb-8">
          <BrandLogo className="w-64 max-w-full" priority />
          <p className="mt-3 max-w-xs text-sm leading-5 text-white/55">Recupera el acceso a Medalleros OS.</p>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  )
}
