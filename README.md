# Finanzas

App web de finanzas personales para un único usuario: cuentas en pesos y dólares, carga rápida de gastos, resumen mensual, deudas con simulador de bola de nieve y avalancha, metas de ahorro y cotización USDC diaria.

Stack: Next.js 16 (App Router), Supabase (Postgres y Auth), Tailwind 4, Zod, `decimal.js` y Vitest. Se instala como PWA.

## Puesta en marcha local

Requiere Node 24.

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Vinculalo y aplicá las migraciones de `supabase/migrations`:

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref TU-PROJECT-REF
   ```

   ```bash
   npx supabase db push
   ```

3. Regenerá los tipos:

   ```bash
   npm run db:types
   ```

### 2. Login con Google

1. En Google Cloud Console creá un cliente OAuth de tipo aplicación web, con esta URI de redirección: `https://TU-PROJECT-REF.supabase.co/auth/v1/callback`.
2. En Supabase, en Authentication > Providers > Google, activalo y cargá el client ID y el secret.
3. En Authentication > URL Configuration, agregá estas Redirect URLs: `http://localhost:3000/auth/callback` y la de producción, `https://TU-DOMINIO/auth/callback`.
4. Después de tu primer login, desactivá **Allow new users to sign up** en Authentication > Sign In / Providers. La app ya rechaza cualquier otro email, pero así ni siquiera se crea el usuario.

### 3. Variables de entorno

Copiá `.env.example` a `.env.local` y completalo:

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La clave `anon` o `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | La clave `service_role` o `sb_secret_...`. Solo la usa el cron, del lado del servidor |
| `ALLOWED_EMAIL` | El único email que puede entrar |
| `CRON_SECRET` | Generalo con `openssl rand -hex 32` |

### 4. Correr

```bash
npm install
```

```bash
npm run dev
```

## Deploy en Vercel

1. Instalá y vinculá el proyecto:

   ```bash
   npx vercel login
   ```

   ```bash
   npx vercel link
   ```

2. Cargá las cinco variables de entorno en Vercel, en Settings > Environment Variables, para Production. Con `CRON_SECRET` cargado, Vercel lo manda solo en cada ejecución del cron.
3. Publicá:

   ```bash
   npx vercel deploy --prod
   ```

4. En Supabase, en Authentication > URL Configuration, poné el dominio de Vercel como Site URL y agregá `https://TU-DOMINIO/auth/callback` a las Redirect URLs.

## Cotización

Vercel Cron llama a `/api/cron/cotizacion` todos los días a las 9:00 de Buenos Aires (ver `vercel.json`). Lee USDC de CriptoYa para el exchange configurado en Ajustes (por defecto `dolarapp`). Si la respuesta es inválida, no guarda nada y lo registra en los logs. Para correrlo a mano, con `$CRON_SECRET` en tu entorno:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://TU-DOMINIO/api/cron/cotizacion
```

Si la última cotización tiene más de 48 horas, Inicio lo avisa.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Tests con Vitest, incluidas las migraciones sobre Postgres embebido |
| `npm run iconos` | Regenera los íconos de la PWA |
| `npm run db:types` | Regenera los tipos de la base |

## Estructura

| Carpeta | Contenido |
|---|---|
| `app/` | Rutas. `(app)` requiere sesión; `api/cron` se protege con `CRON_SECRET` |
| `actions/` | Server Actions, validadas con Zod |
| `components/` | UI; `ui/` son los componentes base de shadcn adaptados |
| `lib/` | Lógica pura: dinero, fechas, simulador de deudas, resumen, cotización |
| `supabase/migrations/` | Esquema, RLS, vistas y funciones |
| `tests/` | Vitest |

Las decisiones de diseño y sus motivos están en [DECISIONES.md](DECISIONES.md).
