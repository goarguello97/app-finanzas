-- =========================================================
-- App de finanzas personales — esquema v2 para Supabase
-- Pegar en: Supabase > SQL Editor > New query > Run
--
-- Decisiones tomadas:
--  - Cuentas en ARS o USD; vista total convertida con cotización USDC.
--  - Tarjetas con cierre/vencimiento y compras en cuotas (sin uso activo hoy).
--  - Ingreso = retiros de la rotisería; el negocio no entra.
--  - Presupuesto: registrar todo + ingreso mínimo seguro opcional.
--  - Deudas: tarjetas y préstamos; la app compara bola de nieve vs avalancha.
-- =========================================================

-- ---------- CONFIGURACIÓN (una fila por usuario) ----------
create table public.configuracion (
  user_id             uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  ingreso_minimo      numeric(14,2),                 -- null = sin presupuesto
  moneda_base         text not null default 'ARS' check (moneda_base in ('ARS','USD')),
  exchange_cotizacion text,                          -- exchange de donde tomar USDC (ej: 'lemoncash')
  estrategia_deudas   text not null default 'comparar'
                        check (estrategia_deudas in ('comparar','bola_de_nieve','avalancha')),
  updated_at          timestamptz not null default now()
);

-- ---------- COTIZACIONES (globales, las carga un cron con service role) ----------
create table public.cotizaciones (
  id         bigint generated always as identity primary key,
  fecha      date not null default current_date,
  activo     text not null default 'USDC',
  fuente     text not null,                          -- exchange
  compra     numeric(14,2) not null,                 -- ARS por 1 USDC
  venta      numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (fecha, activo, fuente)
);

-- ---------- CUENTAS ----------
create table public.cuentas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre          text not null,
  tipo            text not null check (tipo in ('efectivo','banco','billetera','tarjeta')),
  moneda          text not null default 'ARS' check (moneda in ('ARS','USD')),
  saldo_inicial   numeric(14,2) not null default 0,
  -- solo tarjetas:
  dia_cierre      int check (dia_cierre between 1 and 31),
  dia_vencimiento int check (dia_vencimiento between 1 and 31),
  limite          numeric(14,2),
  archivada       boolean not null default false,
  created_at      timestamptz not null default now(),
  check (tipo = 'tarjeta' or (dia_cierre is null and dia_vencimiento is null and limite is null))
);

-- ---------- CATEGORÍAS ----------
create table public.categorias (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null,
  tipo        text not null check (tipo in ('ingreso','gasto')),
  created_at  timestamptz not null default now(),
  unique (user_id, nombre, tipo)
);

-- ---------- MOVIMIENTOS ----------
create table public.movimientos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cuenta_id     uuid not null references public.cuentas(id) on delete restrict,
  categoria_id  uuid references public.categorias(id) on delete set null,
  tipo          text not null check (tipo in ('ingreso','gasto')),
  monto         numeric(14,2) not null check (monto > 0),   -- total de la compra
  cuotas        int not null default 1 check (cuotas >= 1), -- >1 solo en tarjetas
  fecha         date not null default current_date,
  nota          text,
  created_at    timestamptz not null default now()
);
create index movimientos_user_fecha_idx on public.movimientos (user_id, fecha desc);

-- ---------- DEUDAS ----------
create table public.deudas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo             text not null check (tipo in ('tarjeta','prestamo')),
  acreedor         text not null,               -- ej: "Visa Galicia", "Préstamo Mercado Pago"
  descripcion      text,
  moneda           text not null default 'ARS' check (moneda in ('ARS','USD')),
  monto_total      numeric(14,2) not null check (monto_total > 0),  -- saldo al momento de cargarla
  cuotas_total     int check (cuotas_total > 0),
  monto_cuota      numeric(14,2) check (monto_cuota > 0),
  pago_minimo      numeric(14,2) check (pago_minimo >= 0),          -- mínimo mensual (para las estrategias)
  tasa_anual       numeric(7,2),                                    -- TNA %; clave para avalancha
  dia_vencimiento  int check (dia_vencimiento between 1 and 31),
  fecha_inicio     date not null default current_date,
  estado           text not null default 'activa' check (estado in ('activa','saldada')),
  created_at       timestamptz not null default now()
);

-- ---------- PAGOS DE DEUDA ----------
create table public.pagos_deuda (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  deuda_id       uuid not null references public.deudas(id) on delete cascade,
  movimiento_id  uuid references public.movimientos(id) on delete set null,
  monto          numeric(14,2) not null check (monto > 0),
  fecha          date not null default current_date,
  created_at     timestamptz not null default now()
);
create index pagos_deuda_deuda_idx on public.pagos_deuda (deuda_id);

-- ---------- METAS DE AHORRO ----------
create table public.metas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre          text not null,
  moneda          text not null default 'USD' check (moneda in ('ARS','USD')),
  objetivo        numeric(14,2) not null check (objetivo > 0),
  fecha_objetivo  date,
  completada      boolean not null default false,
  created_at      timestamptz not null default now()
);

create table public.aportes_meta (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meta_id     uuid not null references public.metas(id) on delete cascade,
  monto       numeric(14,2) not null,   -- negativo si retirás
  fecha       date not null default current_date,
  created_at  timestamptz not null default now()
);

-- =========================================================
-- SEGURIDAD: Row Level Security
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array['configuracion','cuentas','categorias','movimientos',
                           'deudas','pagos_deuda','metas','aportes_meta']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "solo_dueno" on public.%I for all
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Cotizaciones: cualquier usuario logueado lee; solo el service role escribe.
alter table public.cotizaciones enable row level security;
create policy "lectura_autenticados" on public.cotizaciones
  for select to authenticated using (true);

-- =========================================================
-- VISTAS (security_invoker = respetan RLS)
-- =========================================================

-- Última cotización disponible por fuente
create view public.cotizacion_actual with (security_invoker = true) as
select distinct on (fuente, activo) *
from public.cotizaciones
order by fuente, activo, fecha desc, created_at desc;

-- Saldo actual de cada cuenta (sin tarjetas: su saldo es deuda)
create view public.saldos_cuentas with (security_invoker = true) as
select
  c.*,
  c.saldo_inicial
    + coalesce(sum(case when m.tipo = 'ingreso' then m.monto else -m.monto end), 0) as saldo_actual
from public.cuentas c
left join public.movimientos m on m.cuenta_id = c.id
where c.tipo <> 'tarjeta'
group by c.id;

-- Cuotas: cada compra en cuotas desplegada mes a mes (para proyectar lo comprometido)
create view public.cuotas_proyectadas with (security_invoker = true) as
select
  m.user_id,
  m.id as movimiento_id,
  m.cuenta_id,
  n as nro_cuota,
  m.cuotas,
  (date_trunc('month', m.fecha) + make_interval(months => n))::date as mes,
  round(m.monto / m.cuotas, 2) as monto_cuota
from public.movimientos m
join public.cuentas c on c.id = m.cuenta_id and c.tipo = 'tarjeta'
cross join lateral generate_series(1, m.cuotas) as n
where m.tipo = 'gasto';

-- Resumen por mes, moneda y tipo
create view public.resumen_mensual with (security_invoker = true) as
select
  m.user_id,
  date_trunc('month', m.fecha)::date as mes,
  c.moneda,
  m.tipo,
  sum(m.monto) as total
from public.movimientos m
join public.cuentas c on c.id = m.cuenta_id
group by m.user_id, mes, c.moneda, m.tipo;

-- Ingresos del mes vs ingreso mínimo: cuánto es "extra" para deudas/ahorro
create view public.extra_mensual with (security_invoker = true) as
select
  r.user_id,
  r.mes,
  r.total                                   as ingresos,
  cfg.ingreso_minimo,
  greatest(r.total - coalesce(cfg.ingreso_minimo, r.total), 0) as extra
from public.resumen_mensual r
join public.configuracion cfg on cfg.user_id = r.user_id
where r.tipo = 'ingreso' and r.moneda = 'ARS';

-- Estado de cada deuda
create view public.deudas_estado with (security_invoker = true) as
select
  d.*,
  coalesce(sum(p.monto), 0)                                as pagado,
  d.monto_total - coalesce(sum(p.monto), 0)                as pendiente,
  count(p.id)                                              as pagos_realizados,
  case when d.cuotas_total is not null
       then greatest(d.cuotas_total - count(p.id), 0) end  as cuotas_restantes
from public.deudas d
left join public.pagos_deuda p on p.deuda_id = d.id
group by d.id;

-- Progreso de cada meta
create view public.metas_progreso with (security_invoker = true) as
select
  me.*,
  coalesce(sum(a.monto), 0) as aportado,
  round(100 * coalesce(sum(a.monto), 0) / me.objetivo, 1) as porcentaje
from public.metas me
left join public.aportes_meta a on a.meta_id = me.id
group by me.id;
