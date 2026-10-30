import { BarraInferior } from "@/components/navegacion/barra-inferior";
import { BarraLateral } from "@/components/navegacion/barra-lateral";
import { requireUser } from "@/lib/auth/sesion";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-[100dvh]">
      <BarraLateral />
      <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 lg:px-10 lg:pt-10">{children}</div>
      </main>
      <BarraInferior />
    </div>
  );
}
