"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { SelectNativo } from "@/components/ui/select-nativo";
import { SIN_CATEGORIA, urlListado, type FiltrosListado } from "@/lib/movimientos/listado";

interface Opcion {
  id: string;
  nombre: string;
}

export function FiltrosMovimientos({
  filtros,
  cuentas,
  categorias,
}: {
  filtros: FiltrosListado;
  cuentas: Opcion[];
  categorias: (Opcion & { tipo: string })[];
}) {
  const router = useRouter();
  const ir = (cambios: Partial<FiltrosListado>) => router.push(urlListado({ ...filtros, ...cambios }));

  return (
    <div className="grid grid-cols-2 gap-3 lg:max-w-xl">
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="filtro-cuenta">Cuenta</Label>
        <SelectNativo id="filtro-cuenta" value={filtros.cuenta ?? ""} onChange={(e) => ir({ cuenta: e.target.value || null })}>
          <option value="">Todas</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </SelectNativo>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="filtro-categoria">Categoría</Label>
        <SelectNativo id="filtro-categoria" value={filtros.categoria ?? ""} onChange={(e) => ir({ categoria: e.target.value || null })}>
          <option value="">Todas</option>
          <option value={SIN_CATEGORIA}>Sin categoría</option>
          <optgroup label="Gastos">
            {categorias
              .filter((c) => c.tipo === "gasto")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
          </optgroup>
          <optgroup label="Ingresos">
            {categorias
              .filter((c) => c.tipo === "ingreso")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
          </optgroup>
        </SelectNativo>
      </div>
    </div>
  );
}
