import type { Metadata } from "next";
import { SeccionPendiente } from "@/components/seccion-pendiente";

export const metadata: Metadata = { title: "Movimientos" };

export default function MovimientosPage() {
  return <SeccionPendiente titulo="Movimientos" />;
}
