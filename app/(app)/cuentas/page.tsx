import type { Metadata } from "next";
import { SeccionPendiente } from "@/components/seccion-pendiente";

export const metadata: Metadata = { title: "Cuentas" };

export default function CuentasPage() {
  return <SeccionPendiente titulo="Cuentas" />;
}
