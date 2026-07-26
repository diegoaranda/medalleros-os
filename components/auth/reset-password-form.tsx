'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type RecoveryState = 'checking' | 'ready' | 'invalid'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<RecoveryState>('checking')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    let recoveryDetected = false

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (
      hashParams.get('error') ||
      hashParams.get('error_code') ||
      searchParams.get('error') ||
      searchParams.get('error_code')
    ) {
      setState('invalid')
      return () => {
        active = false
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY') {
        recoveryDetected = true
        setState('ready')
      }
    })

    async function prepareRecovery() {
      const code = searchParams.get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          if (active) setState('invalid')
          return
        }
        recoveryDetected = true
      }

      const { data } = await supabase.auth.getSession()
      if (!active) return
      if (data.session && (recoveryDetected || code)) {
        setState('ready')
        return
      }

      window.setTimeout(async () => {
        const { data: delayedSession } = await supabase.auth.getSession()
        if (!active) return
        setState(delayedSession.session ? 'ready' : 'invalid')
      }, 800)
    }

    void prepareRecovery()
    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [searchParams])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('No se pudo actualizar la contraseña. Solicita un nuevo enlace e inténtalo nuevamente.')
      setLoading(false)
      return
    }

    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError('La contraseña se actualizó, pero no se pudo cerrar la sesión de recuperación. Inténtalo nuevamente.')
      setLoading(false)
      return
    }

    const successMessage = encodeURIComponent('Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.')
    router.replace('/login?message=' + successMessage)
    router.refresh()
  }

  return (
    <div className="rounded-xl bg-white p-5 text-black sm:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-[-0.025em]">Restablecer contraseña</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {state === 'invalid' ? 'Este enlace expiró o ya no es válido.' : 'Define una nueva contraseña para tu cuenta.'}
        </p>
      </div>

      {state === 'checking' ? <p className="text-sm text-neutral-500">Validando enlace...</p> : null}
      {state === 'invalid' ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-5 text-amber-800">
            Solicita un nuevo enlace desde el inicio de sesión para continuar.
          </p>
          <Link href="/login" className="inline-flex text-sm font-semibold underline-offset-4 hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      ) : null}
      {state === 'ready' ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm font-medium">
            <span className="mb-1.5 block">Nueva contraseña</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="field-control"
            />
          </label>
          <label className="text-sm font-medium">
            <span className="mb-1.5 block">Confirmar nueva contraseña</span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="field-control"
            />
          </label>
          {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">{error}</p> : null}
          <Button type="submit" size="lg" className="mt-1 w-full bg-black text-white hover:bg-neutral-800" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
