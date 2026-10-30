import { Encabezado } from "@/components/encabezado";

/** Lugar reservado para las secciones que todavía no se construyeron. */
export function SeccionPendiente({ titulo }: { titulo: string }) {
  return <Encabezado titulo={titulo} descripcion="Esta sección todavía no está disponible." />;
}
