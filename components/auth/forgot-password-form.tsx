'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return

    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setError('Ingresa tu correo electrónico.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: window.location.origin + '/restablecer-contrasena',
    })

    setLoading(false)
    if (resetError) {
      setError('No pudimos procesar la solicitud. Revisa el correo e inténtalo nuevamente.')
      return
    }

    setMessage('Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña.')
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        className="text-sm font-medium text-neutral-600 underline-offset-4 hover:text-black hover:underline"
        onClick={() => {
          setOpen((current) => !current)
          setError(null)
          setMessage(null)
        }}
        aria-expanded={open}
      >
        ¿Olvidaste tu contraseña?
      </button>

      {open ? (
        <form onSubmit={handleSubmit} className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3.5">
          <label className="text-sm font-medium">
            <span className="mb-1.5 block">Correo para recuperar acceso</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 text-base outline-none transition placeholder:text-neutral-400 hover:border-neutral-400 focus:border-black focus:ring-3 focus:ring-black/10"
            />
          </label>
          {error ? <p role="alert" className="mt-3 text-sm leading-5 text-red-700">{error}</p> : null}
          {message ? <p role="status" className="mt-3 text-sm leading-5 text-neutral-600">{message}</p> : null}
          <Button type="submit" variant="outline" className="mt-3 w-full" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar instrucciones'}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
