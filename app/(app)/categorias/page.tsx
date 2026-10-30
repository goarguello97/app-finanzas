import type { Metadata } from "next";
import { SeccionPendiente } from "@/components/seccion-pendiente";

export const metadata: Metadata = { title: "Categorías" };

export default function CategoriasPage() {
  return <SeccionPendiente titulo="Categorías" />;
}
