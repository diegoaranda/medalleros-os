'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogout() {
    if (loading) return

    setLoading(true)
    setError(null)
    const { error: signOutError } = await createClient().auth.signOut()

    if (signOutError) {
      setError('No se pudo cerrar sesión. Inténtalo nuevamente.')
      setLoading(false)
      return
    }

    router.replace('/login')
    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/68 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-50"
      >
        <LogOut size={18} strokeWidth={1.75} />
        <span>{loading ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
      </button>
      {error ? <p role="alert" className="mt-2 px-3 text-xs leading-4 text-red-300">{error}</p> : null}
    </div>
  )
}
