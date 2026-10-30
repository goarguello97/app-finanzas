import type { Metadata } from "next";
import { SeccionPendiente } from "@/components/seccion-pendiente";

export const metadata: Metadata = { title: "Metas" };

export default function MetasPage() {
  return <SeccionPendiente titulo="Metas" />;
}
