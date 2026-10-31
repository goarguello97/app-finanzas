# Finanzas

App web de finanzas personales para un único usuario. Stack: Next.js, Supabase, Tailwind y Vitest.

## Puesta en marcha

Requiere Node 24.

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Aplicá las migraciones de `supabase/migrations`, en orden. Podés pegarlas en SQL Editor o usar:

   ```bash
   npx supabase link --project-ref TU-PROJECT-REF
   ```

   ```bash
   npx supabase db push
   ```

3. Regenerá los tipos (requiere el `link` anterior):

   ```bash
   npm run db:types
   ```

### 2. Login con Google

1. En Google Cloud Console creá un cliente OAuth de tipo aplicación web, con esta URI de redirección: `https://TU-PROJECT-REF.supabase.co/auth/v1/callback`.
2. En Supabase, en Authentication > Providers > Google, activalo y cargá el client ID y el secret.
3. En Authentication > URL Configuration, poné tu dominio como Site URL y agregá estas Redirect URLs: `http://localhost:3000/auth/callback` y `https://TU-DOMINIO/auth/callback`.

### 3. Variables de entorno

Copiá `.env.example` a `.env.local` y completalo. `ALLOWED_EMAIL` es el único email que puede entrar.

### 4. Correr

```bash
npm install
```

```bash
npm run dev
```

## Cotización

Vercel Cron llama a `/api/cron/cotizacion` una vez por día (ver `vercel.json`). Para correrlo a mano, con la app levantada y `$CRON_SECRET` en tu entorno:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/cotizacion
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Tests con Vitest |
| `npm run iconos` | Regenera los íconos de la PWA |
| `npm run db:types` | Regenera los tipos de la base |

Las decisiones de diseño y sus motivos están en [DECISIONES.md](DECISIONES.md).
