"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { estaActivo, NAVEGACION_MOVIL } from "./items";

export function BarraInferior() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-navegacion border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAVEGACION_MOVIL.map((item) => {
          const activo = estaActivo(pathname, item);
          const Icono = item.icono;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors",
                  activo ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                <Icono aria-hidden className="size-6" weight={activo ? "fill" : "regular"} />
                {item.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
