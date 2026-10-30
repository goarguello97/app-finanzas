import type { Metadata } from "next";
import { GoogleLogoIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { entrarConGoogle } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Entrar" };

const ERRORES: Record<string, string> = {
  no_autorizado: "Esa cuenta no tiene acceso a esta app. Entrá con el email autorizado.",
  auth: "No pudimos iniciar sesión. Probá de nuevo.",
  inicializacion: "No pudimos preparar tu cuenta. Probá de nuevo.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const mensaje = error ? (ERRORES[error] ?? ERRORES.auth) : null;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center gap-8 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Finanzas</h1>
        <p className="text-muted-foreground">Entrá para ver tus cuentas, deudas y metas.</p>
      </div>

      {mensaje && (
        <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
          <WarningCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" weight="bold" />
          {mensaje}
        </p>
      )}

      <form action={entrarConGoogle}>
        <Button type="submit" size="lg" className="w-full">
          <GoogleLogoIcon aria-hidden weight="bold" className="size-5" />
          Entrar con Google
        </Button>
      </form>
    </main>
  );
}
