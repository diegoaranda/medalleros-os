import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signInWithPassword } from './actions'
import { createClient } from '@/lib/supabase/server'
import { BrandLogo } from '@/components/brand-logo'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
    message?: string
    next?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const params = await searchParams
  const next = params.next?.startsWith('/') ? params.next : '/dashboard'

  if (user) {
    redirect(next)
  }

  return (
    <main className="min-h-dvh bg-black px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] text-white">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-sm flex-col justify-center">
        <div className="mb-8">
          <BrandLogo className="w-64 max-w-full" priority />
          <p className="mt-3 max-w-xs text-sm leading-5 text-white/55">Pedidos, producción y gastos en un solo lugar.</p>
        </div>

        <form action={signInWithPassword} className="rounded-xl bg-white p-5 text-black sm:p-6">
          <input type="hidden" name="next" value={next} />
          <div className="mb-5">
            <h1 className="text-xl font-bold tracking-[-0.025em]">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-neutral-500">Ingresa con tu cuenta de Medalleros.</p>
          </div>
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium">
              <span className="mb-1.5 block">Correo electrónico</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                className="min-h-12 w-full rounded-lg border border-neutral-300 bg-white px-3.5 text-base outline-none transition placeholder:text-neutral-400 hover:border-neutral-400 focus:border-black focus:ring-3 focus:ring-black/10"
              />
            </label>
            <label className="text-sm font-medium">
              <span className="mb-1.5 block">Contraseña</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="min-h-12 w-full rounded-lg border border-neutral-300 bg-white px-3.5 text-base outline-none transition hover:border-neutral-400 focus:border-black focus:ring-3 focus:ring-black/10"
              />
            </label>
            {params.error ? (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">
                {params.error}
              </p>
            ) : null}
            {params.message ? (
              <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm leading-5 text-green-700">
                {params.message}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="mt-1 w-full bg-black text-white hover:bg-neutral-800">
              Entrar
            </Button>
            <ForgotPasswordForm />
          </div>
        </form>
        <p className="mt-5 text-center text-xs text-white/35">Uso interno · Medalleros SC</p>
      </div>
    </main>
  )
}
