# Correcciones administrativas de pedidos

## Migración pendiente

`supabase/migrations/20261126000100_order_admin_corrections.sql` está preparada y requiere autorización antes de aplicarse al proyecto Supabase. La aplicación muestra un error explicativo si las funciones todavía no existen. No se modificaron datos reales.

El esquema versionado contiene `cancelado` y una FK `order_payments.order_id -> orders.id ON DELETE CASCADE`. `expenses` no depende de pedidos. La migración comprueba esa FK, el estado y la ausencia de dependientes desconocidos antes de crear las funciones. Si la base desplegada tiene otras relaciones, se detiene para su revisión.

Las políticas actuales comparten los pedidos entre todos los usuarios autenticados. No existe rol administrador. Las acciones requieren usuario y perfil en el servidor y en SQL; las funciones `SECURITY INVOKER` respetan RLS y solo conceden ejecución a `authenticated`. No se introdujo una distinción de roles inexistente.

## Transacciones y concurrencia

La confirmación carga el pedido desde `order_financials` y los pagos en una misma instantánea. Su revisión incluye todos los campos del pedido y de sus pagos. La mutación bloquea el pedido con `FOR UPDATE` (también impide nuevos pagos por la FK), bloquea los pagos existentes y verifica nuevamente la revisión. Una confirmación obsoleta o una repetición se rechaza. La eliminación ejecuta un único `DELETE` del pedido: sus pagos e historial administrativo se eliminan por cascada dentro de la misma transacción. Los gastos independientes permanecen.

Cancelar conserva fecha histórica de entrega, datos, pagos y costos; añade un evento administrativo. Deshacer entrega solo acepta `entregado`, pasa a `listo`, limpia `delivered_at` y añade un evento. Ninguna corrección despacha eventos de entrega del navegador ni envía push. No hay integración push ni triggers de entrega en el esquema versionado; los triggers de una base desplegada no fueron inspeccionados.

Las fórmulas financieras existentes excluyen cancelados de ventas, saldo global y utilidad proyectada, pero conservan sus cobros como dinero recibido. Reportes ahora conserva esos cobros también. El saldo individual sigue visible como registro histórico; no se representa como devolución. El filtro de fechas y atributos de Reportes mantiene su alcance existente.

## Pruebas reproducibles con PostgreSQL local desechable

El ejecutor no lee `.env`, no se conecta a Supabase y solo usa `127.0.0.1:55439`. Crea una base `medalleros_admin_test_<pid>`, carga el esquema y las definiciones SQL pendientes para verificarlas, usa clientes ficticios y elimina la base al terminar. Debe ejecutarse únicamente con un servidor PostgreSQL local desechable en ese puerto; no usar un túnel o proxy.

```sh
initdb -D /private/tmp/medalleros-admin-pg -A trust --no-locale -E UTF8
pg_ctl -D /private/tmp/medalleros-admin-pg -l /private/tmp/medalleros-admin-pg.log -o '-k /private/tmp -p 55439 -h 127.0.0.1' start
node --test tests/order-admin.test.cjs
pg_ctl -D /private/tmp/medalleros-admin-pg stop
npm run lint
npx tsc --noEmit --incremental false
npm run build
git diff --check
```

Cobertura: eliminación sin pagos, eliminación con pagos, confirmación adicional y conservación frente a rechazo, cancelación en producción y por envolver, entrega deshecha con pagos, saldos y contadores, fórmulas financieras y Reportes, gastos/otros pedidos intactos, revisión obsoleta tras editar pagos, repetición de cancelación/entrega deshecha, dos eliminaciones simultáneas (solo una tiene éxito), cascada del historial, rollback ante fallos en historial o cascada, falta de sesión, privilegios anónimos y RLS restrictiva.

No se usaron pedidos reales; en particular, no se tocó el pedido de Gerald. No se ejecutaron migraciones sobre Supabase, commit, push ni deploy.

## Verificación realizada

Pasaron las 8 pruebas automatizadas y las comprobaciones `lint`, TypeScript independiente (`tsc --noEmit --incremental false`), build de producción y `git diff --check`. La configuración existente omite la validación de tipos durante el build, por lo que se ejecutó TypeScript por separado.

Se verificó la interfaz con Playwright sobre una copia temporal sin credenciales reales, con datos y acciones simulados: 390×844 (móvil), 768×1024 (iPad) y 1440×900 (escritorio). Se comprobó el contenido financiero, ausencia de desbordamiento horizontal, desplazamiento vertical móvil, checkbox obligatorio con pagos/costos, eliminación sin checkbox cuando ambos faltan, Escape, bloqueo durante el envío, deshacer entrega solo en entregados y acceso desde el detalle de Entregas. La ruta y los mocks visuales no forman parte del repositorio final.

## Archivos modificados o añadidos

- `app/orders/actions.ts`: impide cancelar/deshacer entrega mediante el selector genérico y rechaza actualizaciones de estado obsoletas.
- `app/orders/admin/actions.ts`: autenticación, permisos, RPC y revalidación de las seis pantallas.
- `app/orders/admin/types.ts`: tipos de confirmación y detección de pagos/costos registrados.
- `app/orders/admin/order-admin-actions.tsx`: sección administrativa, confirmaciones y protección ante envíos repetidos.
- `components/orders/order-detail-modal.tsx`: integración dentro de Acciones del detalle de Pedidos.
- `components/deliveries/delivery-detail-modal.tsx`: integración dentro del detalle de Entregas.
- `lib/finance/metrics.ts`: conserva los cobros de cancelados en Reportes.
- `lib/supabase/database.types.ts`: funciones y tabla de historial; metadatos requeridos para tipar el cliente.
- `supabase/migrations/20261126000100_order_admin_corrections.sql`: migración pendiente con transacciones, historial y RLS.
- `tests/order-admin.sql`: casos transaccionales con datos ficticios.
- `tests/order-admin.test.cjs`: ocho pruebas automatizadas de finanzas, servidor, RLS y concurrencia.
- `tests/ORDER_ADMIN_VALIDATION.md`: alcance, límites y reproducción de las pruebas.

El `package-lock.json` no versionado ya existía al comenzar y no fue modificado. Se retiraron los artefactos temporales del navegador y el cambio automático del build en `next-env.d.ts`.
