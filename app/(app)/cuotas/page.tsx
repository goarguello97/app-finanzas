import type { Metadata } from "next";
import { SeccionPendiente } from "@/components/seccion-pendiente";

export const metadata: Metadata = { title: "Cuotas" };

export default function CuotasPage() {
  return <SeccionPendiente titulo="Cuotas" />;
}
