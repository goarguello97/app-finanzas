"use client";

import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react";
import { NAVEGACION_MAS } from "./items";

export function ListaMas() {
  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-superficie border bg-card">
      {NAVEGACION_MAS.map((item) => {
        const Icono = item.icono;
        return (
          <li key={item.href}>
            <Link href={item.href} className="flex h-14 items-center gap-3 px-4 transition-colors active:bg-accent">
              <Icono aria-hidden className="size-6 text-muted-foreground" />
              <span className="flex-1">{item.etiqueta}</span>
              <CaretRightIcon aria-hidden className="size-4 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
