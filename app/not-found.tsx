import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NoEncontrada() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">No encontramos esta página</h1>
      <p className="text-muted-foreground">Puede que la dirección esté mal escrita.</p>
      <Button asChild className="self-start">
        <Link href="/">Ir al inicio</Link>
      </Button>
    </main>
  );
}
