import { Suspense } from "react";
import { CargaRapidaServidor } from "@/components/carga-rapida/carga-rapida-servidor";
import { BarraInferior } from "@/components/navegacion/barra-inferior";
import { BarraLateral } from "@/components/navegacion/barra-lateral";
import { requireUser } from "@/lib/auth/sesion";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-[100dvh]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-aviso focus:rounded-control focus:bg-card focus:px-4 focus:py-3 focus:shadow-md"
      >
        Saltar al contenido
      </a>
      <BarraLateral />
      <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 outline-none pb-[calc(10rem+env(safe-area-inset-bottom))] lg:pb-28">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 lg:px-10 lg:pt-10">{children}</div>
      </main>
      <BarraInferior />
      <Suspense fallback={null}>
        <CargaRapidaServidor />
      </Suspense>
    </div>
  );
}
