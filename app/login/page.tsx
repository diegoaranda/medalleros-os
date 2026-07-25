import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signInWithPassword } from './actions'
import { createClient } from '@/lib/supabase/server'
import { BrandLogo } from '@/components/brand-logo'

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
        <div className="mb-8">
          <BrandLogo className="w-full" priority />
          <p className="mt-2 text-sm text-muted-foreground">Ingresa para gestionar pedidos, producción y finanzas.</p>
        </div>

        <form action={signInWithPassword} className="rounded-lg border border-border bg-card p-5">
          <input type="hidden" name="next" value={next} />
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Contraseña
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:ring-2 focus:ring-ring"
              />
            </label>
            {params.error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {params.error}
              </p>
            ) : null}
            <Button type="submit" size="lg" className="w-full">
              Entrar
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
