"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BackspaceIcon, CaretDownIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { crearMovimiento, deshacerMovimiento } from "@/actions/movimientos";
import { MontoMovimiento } from "@/components/dinero/monto";
import { ErrorDeCampo } from "@/components/error-de-campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Moneda } from "@/lib/dinero";
import { aplicarTecla, mostrarEntrada, type Tecla } from "@/lib/dinero/teclado";
import { esFechaValida, etiquetaDia, hoyBuenosAires } from "@/lib/fechas";
import { cn } from "@/lib/utils";

export interface CuentaCarga {
  id: string;
  nombre: string;
  moneda: string;
  tipo: string;
}

export interface CategoriaCargaUI {
  id: string;
  nombre: string;
  tipo: string;
}

type TipoMovimiento = "gasto" | "ingreso";

interface Aviso {
  id: string;
  tipo: TipoMovimiento;
  monto: string;
  moneda: Moneda;
  falloDeshacer?: boolean;
}

const SIMBOLOS: Record<string, string> = { ARS: "$", USD: "US$" };
const TECLAS: Tecla[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "borrar"];
const DURACION_AVISO_MS = 6000;

const CLASE_CHIP = "flex h-10 shrink-0 touch-manipulation items-center rounded-control border px-3 text-sm whitespace-nowrap transition-colors";
const CHIP_ACTIVO = "border-primary bg-primary font-medium text-primary-foreground";
const CHIP_INACTIVO = "border-input bg-card hover:bg-accent";

export function CargaRapida({
  cuentas,
  categorias,
  cuentaInicial,
  errorDeCarga,
}: {
  cuentas: CuentaCarga[];
  categorias: CategoriaCargaUI[];
  cuentaInicial: string | null;
  errorDeCarga: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [tipo, setTipo] = useState<TipoMovimiento>("gasto");
  const [entrada, setEntrada] = useState("");
  const [cuentaId, setCuentaId] = useState(cuentaInicial);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [fecha, setFecha] = useState("");
  const [nota, setNota] = useState("");
  const [cuotas, setCuotas] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string>();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [deshaciendo, iniciarDeshacer] = useTransition();

  // La cuenta elegida puede dejar de existir, o aparecer la primera, sin que el componente se remonte.
  const cuentaValida = cuentas.some((c) => c.id === cuentaId) ? cuentaId : cuentaInicial;
  const cuenta = cuentas.find((c) => c.id === cuentaValida) ?? null;
  const moneda = (cuenta?.moneda ?? "ARS") as Moneda;
  const categoriasDelTipo = categorias.filter((c) => c.tipo === tipo);
  const hoy = fecha ? hoyBuenosAires() : "";
  const permiteCuotas = tipo === "gasto" && cuenta?.tipo === "tarjeta";

  const abrir = () => {
    setTipo("gasto");
    setEntrada("");
    setCategoriaId(null);
    setMostrarOpciones(false);
    setFecha(hoyBuenosAires());
    setNota("");
    setCuotas("");
    setErrores({});
    setMensaje(undefined);
    dialogo.current?.showModal();
  };

  const cerrar = () => dialogo.current?.close();

  const pulsar = useCallback((tecla: Tecla) => {
    setEntrada((actual) => aplicarTecla(actual, tecla));
    setErrores((actuales) => (actuales.monto ? { ...actuales, monto: "" } : actuales));
  }, []);

  // Teclado físico en escritorio. No interfiere con los campos de texto de "más opciones".
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      if (!dialogo.current?.open) return;
      const destino = evento.target as HTMLElement;
      if (destino.tagName === "INPUT" || destino.tagName === "TEXTAREA") return;
      if (/^[0-9]$/.test(evento.key)) pulsar(evento.key as Tecla);
      else if (evento.key === "," || evento.key === ".") pulsar(",");
      else if (evento.key === "Backspace") pulsar("borrar");
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [pulsar]);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(null), DURACION_AVISO_MS);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const cambiarTipo = (nuevo: TipoMovimiento) => {
    setTipo(nuevo);
    setCategoriaId(null);
    setCuotas("");
  };

  const guardar = () => {
    const faltantes: Record<string, string> = {};
    if (entrada === "") faltantes.monto = "Escribí un monto.";
    if (categoriasDelTipo.length > 0 && !categoriaId) faltantes.categoria_id = "Elegí una categoría.";
    if (Object.keys(faltantes).length > 0) {
      setErrores(faltantes);
      return;
    }

    iniciar(async () => {
      setMensaje(undefined);
      setErrores({});
      const monto = entrada.replace(/,$/, "");
      try {
        const resultado = await crearMovimiento({
          tipo,
          monto,
          cuenta_id: cuentaValida ?? "",
          categoria_id: categoriaId ?? "",
          fecha: esFechaValida(fecha) ? fecha : hoyBuenosAires(),
          nota,
          cuotas: permiteCuotas ? cuotas : "",
        });
        if (resultado.ok) {
          setCuentaId(cuentaValida);
          setAviso({ id: resultado.id, tipo, monto: monto.replace(",", "."), moneda });
          cerrar();
          return;
        }
        setErrores(resultado.errores ?? {});
        setMensaje(resultado.mensaje);
      } catch {
        setMensaje("No pudimos guardar el movimiento. Revisá tu conexión y probá de nuevo.");
      }
    });
  };

  const deshacer = () => {
    if (!aviso) return;
    iniciarDeshacer(async () => {
      const { ok } = await deshacerMovimiento(aviso.id).catch(() => ({ ok: false }));
      if (ok) setAviso(null);
      else setAviso({ ...aviso, falloDeshacer: true });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Cargar movimiento"
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-navegacion flex size-16 touch-manipulation items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_oklch(0.25_0.04_215/0.55)] transition-transform outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.96] lg:right-10 lg:bottom-10"
      >
        <PlusIcon aria-hidden className="size-7" weight="bold" />
      </button>

      <dialog
        ref={dialogo}
        aria-label="Cargar movimiento"
        className="panel-inferior m-0 mt-auto max-h-[94dvh] w-full max-w-none overflow-y-auto rounded-t-superficie bg-card text-foreground backdrop:bg-foreground/40 lg:m-auto lg:max-w-md lg:rounded-superficie"
      >
        <div className="flex flex-col gap-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <div role="radiogroup" aria-label="Tipo de movimiento" className="grid flex-1 grid-cols-2 rounded-control border border-input p-0.5">
              {(["gasto", "ingreso"] as const).map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  role="radio"
                  aria-checked={tipo === opcion}
                  onClick={() => cambiarTipo(opcion)}
                  className={cn(
                    "h-10 touch-manipulation rounded-[8px] text-sm transition-colors",
                    tipo === opcion ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  {opcion === "gasto" ? "Gasto" : "Ingreso"}
                </button>
              ))}
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Cerrar" onClick={cerrar}>
              <XIcon aria-hidden className="size-5" />
            </Button>
          </div>

          {errorDeCarga ? (
            <ErrorDeCampo mensaje="No pudimos cargar tus cuentas. Revisá tu conexión y recargá la página." />
          ) : cuentas.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-6">
              <p>Para cargar un movimiento, primero creá una cuenta.</p>
              <Button asChild onClick={cerrar}>
                <Link href="/cuentas/nueva">Crear cuenta</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <p
                  aria-live="polite"
                  aria-label={`Monto: ${SIMBOLOS[moneda]} ${mostrarEntrada(entrada)}`}
                  className={cn(
                    "truncate text-right text-5xl font-semibold tracking-tight",
                    entrada === "" && "text-muted-foreground",
                  )}
                >
                  <span className="mr-2 text-2xl font-normal text-muted-foreground">{SIMBOLOS[moneda]}</span>
                  {mostrarEntrada(entrada)}
                </p>
                <ErrorDeCampo mensaje={errores.monto} />
              </div>

              {cuentas.length > 1 && (
                <div role="radiogroup" aria-label="Cuenta" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
                  {cuentas.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={c.id === cuentaValida}
                      onClick={() => {
                        setCuentaId(c.id);
                        setCuotas("");
                      }}
                      className={cn(CLASE_CHIP, c.id === cuentaValida ? CHIP_ACTIVO : CHIP_INACTIVO)}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
              )}
              <ErrorDeCampo mensaje={errores.cuenta_id} />

              {categoriasDelTipo.length > 0 ? (
                <div
                  role="radiogroup"
                  aria-label="Categoría"
                  className="-mx-4 grid auto-cols-max grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
                >
                  {categoriasDelTipo.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={c.id === categoriaId}
                      onClick={() => {
                        setCategoriaId(c.id);
                        setErrores((actuales) => ({ ...actuales, categoria_id: "" }));
                      }}
                      className={cn(CLASE_CHIP, c.id === categoriaId ? CHIP_ACTIVO : CHIP_INACTIVO)}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
              ) : null}
              <ErrorDeCampo mensaje={errores.categoria_id} />

              <div className="flex flex-col">
                <button
                  type="button"
                  aria-expanded={mostrarOpciones}
                  onClick={() => setMostrarOpciones((actual) => !actual)}
                  className="flex h-9 w-fit touch-manipulation items-center gap-1 text-sm text-muted-foreground"
                >
                  {fecha ? etiquetaDia(fecha, hoy) : "Hoy"}
                  {nota.trim() && ", con nota"}
                  {Number(cuotas) > 1 && `, ${cuotas} cuotas`}
                  <CaretDownIcon aria-hidden className={cn("size-3.5 transition-transform", mostrarOpciones && "rotate-180")} />
                </button>

                {mostrarOpciones && (
                  <div className="grid grid-cols-2 gap-3 pt-2 pb-1">
                    <div className="flex min-w-0 flex-col gap-2">
                      <Label htmlFor="carga-fecha">Fecha</Label>
                      <Input id="carga-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-invalid={Boolean(errores.fecha)} />
                      <ErrorDeCampo mensaje={errores.fecha} />
                    </div>
                    {permiteCuotas && (
                      <div className="flex min-w-0 flex-col gap-2">
                        <Label htmlFor="carga-cuotas">Cuotas</Label>
                        <Input
                          id="carga-cuotas"
                          inputMode="numeric"
                          value={cuotas}
                          onChange={(e) => setCuotas(e.target.value)}
                          aria-invalid={Boolean(errores.cuotas)}
                        />
                        <ErrorDeCampo mensaje={errores.cuotas} />
                      </div>
                    )}
                    <div className="col-span-2 flex flex-col gap-2">
                      <Label htmlFor="carga-nota">Nota (opcional)</Label>
                      <Input id="carga-nota" value={nota} onChange={(e) => setNota(e.target.value)} aria-invalid={Boolean(errores.nota)} />
                      <ErrorDeCampo mensaje={errores.nota} />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {TECLAS.map((tecla) => (
                  <button
                    key={tecla}
                    type="button"
                    aria-label={tecla === "borrar" ? "Borrar" : tecla === "," ? "Coma" : tecla}
                    onClick={() => pulsar(tecla)}
                    className="flex h-14 touch-manipulation items-center justify-center rounded-control bg-muted text-2xl font-medium transition-transform select-none active:scale-[0.97] active:bg-accent"
                  >
                    {tecla === "borrar" ? <BackspaceIcon aria-hidden className="size-6" /> : tecla}
                  </button>
                ))}
              </div>

              <Button type="button" size="lg" disabled={pendiente} onClick={guardar} className="w-full">
                {pendiente ? "Guardando..." : tipo === "gasto" ? "Guardar gasto" : "Guardar ingreso"}
              </Button>
              <div aria-live="polite">
                <ErrorDeCampo mensaje={mensaje} />
              </div>
            </>
          )}
        </div>
      </dialog>

      {aviso && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(10rem+env(safe-area-inset-bottom))] z-aviso flex items-center justify-between gap-3 rounded-superficie border bg-card py-2 pr-2 pl-4 shadow-[0_8px_24px_-8px_oklch(0.25_0.04_215/0.35)] lg:right-10 lg:bottom-32 lg:left-auto lg:w-96"
        >
          {aviso.falloDeshacer ? (
            <ErrorDeCampo mensaje="No pudimos deshacerlo. Podés borrarlo desde Movimientos." />
          ) : (
            <>
              <span className="flex min-w-0 flex-col text-sm">
                <span>{aviso.tipo === "gasto" ? "Gasto guardado" : "Ingreso guardado"}</span>
                <MontoMovimiento monto={aviso.monto} moneda={aviso.moneda} tipo={aviso.tipo} />
              </span>
              <Button type="button" variant="ghost" disabled={deshaciendo} onClick={deshacer}>
                {deshaciendo ? "Deshaciendo..." : "Deshacer"}
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}
