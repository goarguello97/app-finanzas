import type { Metadata } from "next";
import { Encabezado } from "@/components/encabezado";
import { ListaMas } from "@/components/navegacion/lista-mas";

export const metadata: Metadata = { title: "Más" };

export default function MasPage() {
  return (
    <>
      <Encabezado titulo="Más" />
      <ListaMas />
    </>
  );
}
