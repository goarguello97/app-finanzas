"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarMovimiento } from "@/actions/movimientos";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { OpcionesRadio } from "@/components/opciones-radio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNativo } from "@/components/ui/select-nativo";

const OPCIONES_TIPO = [
  { valor: "gasto", etiqueta: "Gasto" },
  { valor: "ingreso", etiqueta: "Ingreso" },
];

export interface ValoresMovimiento {
  tipo: string;
  monto: string;
  cuenta_id: string;
  categoria_id: string;
  fecha: string;
  nota: string;
  cuotas: string;
}

export function FormMovimiento({
  id,
  inicial,
  cuentas,
  categorias,
  volverA,
}: {
  id: string;
  inicial: ValoresMovimiento;
  cuentas: { id: string; nombre: string; tipo: string; archivada: boolean }[];
  categorias: { id: string; nombre: string; tipo: string }[];
  volverA: string;
}) {
  const router = useRouter();
  const [valores, setValores] = useState(inicial);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string>();
  const [pendiente, iniciar] = useTransition();

  const cambiar = (campo: keyof ValoresMovimiento, valor: string) => setValores((actuales) => ({ ...actuales, [campo]: valor }));

  const cuenta = cuentas.find((c) => c.id === valores.cuenta_id);
  const permiteCuotas = valores.tipo === "gasto" && cuenta?.tipo === "tarjeta";
  const categoriasDelTipo = categorias.filter((c) => c.tipo === valores.tipo);
  // Una cuenta archivada solo se ofrece si es la que ya tiene el movimiento.
  const cuentasOpciones = cuentas.filter((c) => !c.archivada || c.id === inicial.cuenta_id);

  const guardar = (evento: React.FormEvent) => {
    evento.preventDefault();
    iniciar(async () => {
      setMensaje(undefined);
      try {
        const resultado = await actualizarMovimiento(id, {
          ...valores,
          tipo: valores.tipo as "ingreso" | "gasto",
          cuotas: permiteCuotas ? valores.cuotas : "",
        });
        if (resultado.ok) {
          router.push(volverA);
          return;
        }
        setErrores(resultado.errores ?? {});
        setMensaje(resultado.mensaje);
      } catch {
        setMensaje("No pudimos guardar el movimiento. Revisá tu conexión y probá de nuevo.");
      }
    });
  };

  return (
    <form onSubmit={guardar} className="flex max-w-md flex-col gap-5" noValidate>
      <OpcionesRadio
        leyenda="Tipo"
        nombre="tipo"
        opciones={OPCIONES_TIPO}
        valor={valores.tipo}
        onChange={(tipo) => setValores((actuales) => ({ ...actuales, tipo, categoria_id: "" }))}
        error={<ErrorDeCampo mensaje={errores.tipo} />}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="monto">Monto</Label>
        <Input
          id="monto"
          inputMode="decimal"
          autoComplete="off"
          value={valores.monto}
          onChange={(e) => cambiar("monto", e.target.value)}
          aria-invalid={Boolean(errores.monto)}
          aria-describedby="monto-error"
        />
        <ErrorDeCampo id="monto-error" mensaje={errores.monto} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cuenta_id">Cuenta</Label>
        <SelectNativo
          id="cuenta_id"
          value={valores.cuenta_id}
          onChange={(e) => cambiar("cuenta_id", e.target.value)}
          aria-invalid={Boolean(errores.cuenta_id)}
          aria-describedby="cuenta_id-error"
        >
          {cuentasOpciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </SelectNativo>
        <ErrorDeCampo id="cuenta_id-error" mensaje={errores.cuenta_id} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="categoria_id">Categoría</Label>
        <SelectNativo
          id="categoria_id"
          value={valores.categoria_id}
          onChange={(e) => cambiar("categoria_id", e.target.value)}
          aria-invalid={Boolean(errores.categoria_id)}
          aria-describedby="categoria_id-error"
        >
          <option value="">Sin categoría</option>
          {categoriasDelTipo.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </SelectNativo>
        <ErrorDeCampo id="categoria_id-error" mensaje={errores.categoria_id} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fecha">Fecha</Label>
        <Input
          id="fecha"
          type="date"
          value={valores.fecha}
          onChange={(e) => cambiar("fecha", e.target.value)}
          aria-invalid={Boolean(errores.fecha)}
          aria-describedby="fecha-error"
        />
        <ErrorDeCampo id="fecha-error" mensaje={errores.fecha} />
      </div>

      {permiteCuotas && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="cuotas">Cuotas</Label>
          <Input
            id="cuotas"
            inputMode="numeric"
            value={valores.cuotas}
            onChange={(e) => cambiar("cuotas", e.target.value)}
            aria-invalid={Boolean(errores.cuotas)}
            aria-describedby="cuotas-error"
          />
          <ErrorDeCampo id="cuotas-error" mensaje={errores.cuotas} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="nota">Nota (opcional)</Label>
        <Input
          id="nota"
          value={valores.nota}
          onChange={(e) => cambiar("nota", e.target.value)}
          aria-invalid={Boolean(errores.nota)}
          aria-describedby="nota-error"
        />
        <ErrorDeCampo id="nota-error" mensaje={errores.nota} />
      </div>

      <div className="flex flex-col items-start gap-3">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando..." : "Guardar cambios"}
        </Button>
        <div aria-live="polite">
          <ErrorDeCampo mensaje={mensaje} />
        </div>
      </div>
    </form>
  );
}
