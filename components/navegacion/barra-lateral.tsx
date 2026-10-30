"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { estaActivo, NAVEGACION_ESCRITORIO } from "./items";

export function BarraLateral() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col gap-8 border-r px-3 py-6 lg:flex">
      <p className="px-3 text-lg font-semibold tracking-tight">Finanzas</p>
      <nav aria-label="Principal">
        <ul className="flex flex-col gap-1">
          {NAVEGACION_ESCRITORIO.map((item) => {
            const activo = estaActivo(pathname, item);
            const Icono = item.icono;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-control px-3 text-sm transition-colors",
                    activo
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icono aria-hidden className="size-5" weight={activo ? "fill" : "regular"} />
                  {item.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
