import type { Metadata } from "next";
import { SeccionPendiente } from "@/components/seccion-pendiente";

export const metadata: Metadata = { title: "Deudas" };

export default function DeudasPage() {
  return <SeccionPendiente titulo="Deudas" />;
}
