# Decisiones

Decisiones tomadas durante la construcción, con su motivo.

## Aprobadas en el plan

- **Saldo de deudas:** `pagos_deuda.interes` guarda qué parte de cada pago es interés. La vista `deudas_saldo` calcula `pendiente` descontando solo capital. `deudas_estado` sigue existiendo, pero la app no la usa para saldos.
- **Compra y venta de dólares:** la categoría "Cambio de moneda" (en gasto y en ingreso) tiene `excluye_totales = true`. No entra en `resumen_mensual` ni en `extra_mensual`, pero sí afecta el saldo de la cuenta.
- **Deudas en USD en el simulador:** se convierten a ARS con la cotización del día, y la pantalla lo avisa.
- **Datos para el simulador:** `tasa_anual` y `pago_minimo` son obligatorios al cargar una deuda. En préstamos, el mínimo se autocompleta con la cuota.
- **Aportes a metas:** no generan movimiento. Registran plata reservada que ya está en una cuenta.

## Base de datos

- **`0002_capital_cambio_y_pagos.sql`:** default `dolarapp` para el exchange, columna de interés, vista `deudas_saldo`, `excluye_totales`, y `registrar_pago_deuda` para que pago y movimiento se guarden juntos o no se guarde ninguno.
- **Pago desde otra moneda:** `registrar_pago_deuda` rechaza pagar una deuda con una cuenta de otra moneda, porque el monto no se podría registrar igual en ambos lados sin una conversión.
- **Estado de la deuda:** `registrar_pago_deuda` la marca `saldada` cuando el capital pagado cubre `monto_total`.
- **Fuente del esquema:** `supabase/migrations`. El `schema.sql` de la raíz queda fuera de git.
- **Tests de SQL:** corren sobre PGlite (Postgres embebido) con un stub de `auth`, sin depender de Docker ni de un proyecto real.
- **Tipos de la base:** `lib/supabase/database.types.ts` se genera con `npm run db:types` desde el proyecto vinculado; no se edita a mano.

## Fechas y dinero

- **Fecha de los registros:** la app siempre envía la fecha de Buenos Aires. El default `current_date` de la base usa UTC y después de las 21:00 daría el día siguiente.
- **Cálculo:** `decimal.js` en toda la lógica. `aNumeroDb` convierte a `number` solo para enviar a la base; es seguro porque numeric(14,2) tiene como mucho 14 dígitos significativos.
- **Formato:** propio en vez de `Intl`, para que server y cliente den el mismo texto y el monto no pase por un float.
- **Entrada de montos:** `1.234` es mil doscientos treinta y cuatro (punto de miles), y `1.23` o `1234.56` se toman como decimales, porque algunos teclados de celular solo ofrecen punto.
- **Conversión de moneda:** USD a ARS con `venta` y ARS a USD con `compra`, que es lo conservador.
- **"Extra" del mes:** solo cuenta ingresos en ARS, como ya hace la vista. El ingreso mínimo se expresa en pesos.

## Auth

- **`proxy.ts`:** Next 16 renombró `middleware` a `proxy`. Excluye `/api/cron`, que se protege con `CRON_SECRET`.
- **`getClaims` en vez de `getUser`:** con claves asimétricas verifica el token sin ir al servidor de auth en cada navegación, y eso importa para la velocidad en el celular.
- **Doble control del email:** `proxy.ts` y `requireUser()`. Si `ALLOWED_EMAIL` está vacío, no entra nadie.
- **Inicialización:** la existencia de la fila de `configuracion` marca que ya se hizo, así las categorías borradas no vuelven. Se crea al final para reintentar completo si algo falla.

## Interfaz

- **Taste Skill:** su sección 13 excluye dashboards y UI densa de producto. Se aplican el Design Read, los diales, el sistema de diseño, modo oscuro, estados, tipografía, copy y prohibiciones generales. Las reglas de landing (hero, logos, imágenes, secciones) quedan como "no aplica" en cada pre-flight.
- **Design Read:** herramienta personal de finanzas de uso diario, mobile-first, para un único usuario, con un lenguaje calmo y centrado en los números, sobre Tailwind v4 y shadcn/ui personalizado.
- **Diales:** `DESIGN_VARIANCE` 3, `MOTION_INTENSITY` 3 (solo CSS, sin la librería Motion), `VISUAL_DENSITY` 5.
- **Color:** un acento (pino) más cuatro semánticos. Se aparta a propósito de la regla de "un solo acento", porque el brief los pide. `tests/contraste.test.ts` verifica WCAG AA en ambos modos.
- **Radios:** controles 10px, superficies 16px. Solo el botón flotante es redondo.
- **Capas:** navegación 30, paneles 40, avisos 50.
- **Tema:** sigue al sistema por defecto, con selector manual en Ajustes.
- **Tamaño táctil:** controles de 44 px como mínimo. Inputs con texto de 16 px para que iOS no haga zoom al enfocarlos.
- **Carga rápida (Fase 2):** teclado numérico propio dentro de un panel inferior, para garantizar la coma y que la pantalla no salte.

## PWA

- **Service worker:** solo habilita la instalación; no intercepta pedidos ni cachea, porque offline no es requisito.
