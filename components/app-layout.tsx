'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Calendar, ShoppingCart, Wrench, Truck, DollarSign, BarChart3, Settings } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { LogoutButton } from '@/components/auth/logout-button'

const navItems = [
  { href: '/dashboard', label: 'Hoy', icon: Calendar },
  { href: '/orders', label: 'Pedidos', icon: ShoppingCart },
  { href: '/production', label: 'Producción', icon: Wrench },
  { href: '/deliveries', label: 'Entregas', icon: Truck },
  { href: '/finances', label: 'Gastos', icon: DollarSign },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (!sidebarOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [sidebarOpen])

  if (pathname === '/login' || pathname === '/restablecer-contrasena') {
    return <>{children}</>
  }

  return (
    <div className="min-h-dvh bg-background md:flex">
      <header className="sticky top-0 z-30 flex h-[calc(3.75rem+env(safe-area-inset-top))] items-end justify-between border-b border-white/10 bg-black px-4 pb-2.5 pt-[env(safe-area-inset-top)] text-white md:hidden">
        <div className="flex items-center gap-2.5">
          <BrandLogo compact priority />
          <div>
            <p className="text-sm font-semibold leading-4">Medalleros OS</p>
            <p className="text-[0.6875rem] leading-4 text-white/55">{navItems.find((item) => pathname.startsWith(item.href))?.label ?? 'Operaciones'}</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex size-11 items-center justify-center rounded-lg text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          type="button"
          aria-label="Abrir navegación"
          aria-expanded={sidebarOpen}
          aria-controls="app-navigation"
        >
          <Menu size={22} />
        </button>
      </header>

      {sidebarOpen ? (
        <button
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] md:hidden"
          onClick={() => setSidebarOpen(false)}
          type="button"
          aria-label="Cerrar navegación"
        />
      ) : null}
      <aside
        id="app-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] -translate-x-full flex-col border-r border-white/10 bg-black text-sidebar-foreground shadow-2xl transition-transform duration-200 md:sticky md:top-0 md:z-20 md:h-dvh md:w-[4.5rem] md:translate-x-0 md:shadow-none xl:w-60 ${
          sidebarOpen ? 'translate-x-0' : ''
        }`}
      >
        <div className="flex min-h-20 items-center justify-between border-b border-white/10 px-5 pt-[env(safe-area-inset-top)] md:justify-center md:px-0 xl:justify-between xl:px-5">
          <BrandLogo className="w-44 md:hidden xl:block" priority />
          <BrandLogo compact className="hidden md:block xl:hidden" priority />
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex size-11 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:hidden"
            type="button"
            aria-label="Cerrar navegación"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
          <p className="px-3 pb-2 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-white/35 md:hidden xl:block">Operación</p>
          <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:justify-center md:px-0 xl:justify-start xl:px-3 ${
                  isActive
                    ? 'bg-white text-black font-semibold'
                    : 'text-white/68 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                <span className="md:hidden xl:inline">{item.label}</span>
              </Link>
            )
          })}
          </div>
        </nav>
        <div className="border-t border-white/10 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:px-2 xl:px-5">
          <p className="text-xs font-semibold text-white md:hidden xl:block">Medalleros SC</p>
          <p className="mt-0.5 text-[0.6875rem] text-white/40 md:hidden xl:block">Gestión operativa</p>
          <div className="mt-3 border-t border-white/10 pt-3 md:mt-0 md:border-0 md:pt-0 md:[&_button]:justify-center md:[&_button]:px-0 md:[&_span]:hidden xl:mt-3 xl:border-t xl:pt-3 xl:[&_button]:justify-start xl:[&_button]:px-3 xl:[&_span]:inline">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>

      <nav aria-label="Navegación principal móvil" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-8px_24px_rgba(0,0,0,0.16)] md:hidden">
        <div className="grid grid-cols-5">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[0.5625rem] font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${isActive ? 'bg-white text-black' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
