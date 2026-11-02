-- =========================================================
-- 0003: borrado atómico de un pago de deuda.
-- Borrar solo el pago dejaría el gasto en el saldo de la cuenta, y hacerlo
-- en dos pasos podría dejar uno sin el otro. Además vuelve a calcular el
-- estado, porque la deuda puede dejar de estar saldada.
-- =========================================================
create function public.eliminar_pago_deuda(p_pago_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deuda_id      uuid;
  v_movimiento_id uuid;
  v_monto_total   numeric;
  v_capital       numeric;
begin
  delete from public.pagos_deuda
   where id = p_pago_id
  returning deuda_id, movimiento_id into v_deuda_id, v_movimiento_id;

  if not found then
    raise exception 'El pago no existe' using errcode = 'P0002';
  end if;

  if v_movimiento_id is not null then
    delete from public.movimientos where id = v_movimiento_id;
  end if;

  select monto_total into v_monto_total from public.deudas where id = v_deuda_id;
  select coalesce(sum(monto - interes), 0) into v_capital
    from public.pagos_deuda
   where deuda_id = v_deuda_id;

  update public.deudas
     set estado = case when v_capital >= v_monto_total then 'saldada' else 'activa' end
   where id = v_deuda_id;
end;
$$;

revoke execute on function public.eliminar_pago_deuda(uuid) from public, anon;
grant execute on function public.eliminar_pago_deuda(uuid) to authenticated;
