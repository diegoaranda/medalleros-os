export default function Loading() {
  return (
    <div className="app-page" role="status" aria-label="Cargando contenido">
      <div className="mb-7 space-y-2">
        <div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="surface overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="space-y-3 p-4 sm:p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-7 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t border-border p-4 sm:p-5">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
