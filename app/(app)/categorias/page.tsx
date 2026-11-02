import type { Metadata } from "next";
import Link from "next/link";
import { CaretRightIcon, PlusIcon } from "@phosphor-icons/react/ssr";
import { Encabezado } from "@/components/encabezado";
import { EstadoVacio } from "@/components/estado-vacio";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/sesion";
import { crearClienteServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Categorías" };

const GRUPOS = [
  { tipo: "gasto", titulo: "Gastos" },
  { tipo: "ingreso", titulo: "Ingresos" },
];

export default async function CategoriasPage() {
  await requireUser();
  const supabase = await crearClienteServer();
  const { data, error } = await supabase.from("categorias").select("id, nombre, tipo, excluye_totales").order("nombre");
  if (error) throw new Error(`Leer categorías: ${error.message}`);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <Encabezado titulo="Categorías" />
        <Button asChild variant="outline">
          <Link href="/categorias/nueva">
            <PlusIcon aria-hidden weight="bold" />
            Nueva
          </Link>
        </Button>
      </div>

      {data.length === 0 ? (
        <EstadoVacio titulo="No tenés categorías" descripcion="Te ayudan a ver en qué se va la plata.">
          <Button asChild>
            <Link href="/categorias/nueva">Crear categoría</Link>
          </Button>
        </EstadoVacio>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {GRUPOS.map(({ tipo, titulo }) => {
            const categorias = data.filter((c) => c.tipo === tipo);
            if (categorias.length === 0) return null;
            return (
              <section key={tipo} aria-labelledby={`titulo-${tipo}`} className="flex flex-col gap-3">
                <h2 id={`titulo-${tipo}`} className="text-lg font-medium">
                  {titulo}
                </h2>
                <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">
                  {categorias.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/categorias/${c.id}`}
                        className="flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-accent active:bg-accent"
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{c.nombre}</span>
                          {c.excluye_totales && <span className="text-sm text-muted-foreground">No cuenta en los totales</span>}
                        </span>
                        <CaretRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
