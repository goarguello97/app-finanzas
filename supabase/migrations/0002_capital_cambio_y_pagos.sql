-- =========================================================
-- 0002: ajustes al esquema base. Motivos en DECISIONES.md.
--  1. Default del exchange de cotización.
--  2. Pagos de deuda con la parte de interés separada, para que el
--     saldo pendiente descuente solo capital.
--  3. Categorías excluidas de los totales (compra y venta de dólares).
--  4. Registro atómico de un pago y su movimiento.
-- =========================================================

-- ---------- 1. EXCHANGE ----------
alter table public.configuracion
  alter column exchange_cotizacion set default 'dolarapp';

-- ---------- 2. CAPITAL E INTERÉS EN LOS PAGOS ----------
alter table public.pagos_deuda
  add column interes numeric(14,2) not null default 0,
  add constraint pagos_deuda_interes_valido check (interes >= 0 and interes <= monto);

-- Reemplaza a deudas_estado para saldos: pendiente = monto_total - capital pagado.
-- cuotas_restantes queda fuera a propósito: contar pagos falla con pagos extra o parciales.
create view public.deudas_saldo with (security_invoker = true) as
select
  d.*,
  coalesce(sum(p.monto), 0)                                 as pagado,
  coalesce(sum(p.interes), 0)                               as interes_pagado,
  coalesce(sum(p.monto - p.interes), 0)                     as capital_pagado,
  d.monto_total - coalesce(sum(p.monto - p.interes), 0)     as pendiente,
  count(p.id)                                               as pagos_realizados
from public.deudas d
left join public.pagos_deuda p on p.deuda_id = d.id
group by d.id;

-- ---------- 3. CATEGORÍAS FUERA DE LOS TOTALES ----------
alter table public.categorias
  add column excluye_totales boolean not null default false;

-- Misma forma que en 0001; extra_mensual se apoya en esta vista y hereda el filtro.
create or replace view public.resumen_mensual with (security_invoker = true) as
select
  m.user_id,
  date_trunc('month', m.fecha)::date as mes,
  c.moneda,
  m.tipo,
  sum(m.monto) as total
from public.movimientos m
join public.cuentas c on c.id = m.cuenta_id
left join public.categorias cat on cat.id = m.categoria_id
where not coalesce(cat.excluye_totales, false)
group by m.user_id, mes, c.moneda, m.tipo;

-- ---------- 4. PAGO ATÓMICO ----------
-- security invoker: corre con los permisos del usuario, así que aplica RLS.
-- Sin p_cuenta_id registra el pago solo, sin movimiento.
create function public.registrar_pago_deuda(
  p_deuda_id     uuid,
  p_monto        numeric,
  p_fecha        date,
  p_interes      numeric default 0,
  p_cuenta_id    uuid    default null,
  p_categoria_id uuid    default null,
  p_nota         text    default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_moneda_deuda  text;
  v_acreedor      text;
  v_monto_total   numeric;
  v_moneda_cuenta text;
  v_movimiento_id uuid;
  v_pago_id       uuid;
  v_capital       numeric;
begin
  select moneda, acreedor, monto_total
    into v_moneda_deuda, v_acreedor, v_monto_total
    from public.deudas
   where id = p_deuda_id
     for update;

  if not found then
    raise exception 'La deuda no existe' using errcode = 'P0002';
  end if;

  if p_cuenta_id is not null then
    select moneda into v_moneda_cuenta from public.cuentas where id = p_cuenta_id;

    if not found then
      raise exception 'La cuenta no existe' using errcode = 'P0002';
    end if;

    if v_moneda_cuenta <> v_moneda_deuda then
      raise exception 'La cuenta está en % y la deuda en %', v_moneda_cuenta, v_moneda_deuda
        using errcode = '22023';
    end if;

    insert into public.movimientos (cuenta_id, categoria_id, tipo, monto, fecha, nota)
    values (p_cuenta_id, p_categoria_id, 'gasto', p_monto, p_fecha,
            coalesce(p_nota, 'Pago a ' || v_acreedor))
    returning id into v_movimiento_id;
  end if;

  insert into public.pagos_deuda (deuda_id, movimiento_id, monto, interes, fecha)
  values (p_deuda_id, v_movimiento_id, p_monto, p_interes, p_fecha)
  returning id into v_pago_id;

  select coalesce(sum(monto - interes), 0) into v_capital
    from public.pagos_deuda
   where deuda_id = p_deuda_id;

  if v_capital >= v_monto_total then
    update public.deudas set estado = 'saldada' where id = p_deuda_id;
  end if;

  return v_pago_id;
end;
$$;

revoke execute on function public.registrar_pago_deuda(uuid, numeric, date, numeric, uuid, uuid, text) from public, anon;
grant execute on function public.registrar_pago_deuda(uuid, numeric, date, numeric, uuid, uuid, text) to authenticated;
