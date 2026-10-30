import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/ssr";

export function EnlaceVolver({ href, etiqueta }: { href: string; etiqueta: string }) {
  return (
    <Link href={href} className="-ml-1 flex h-11 w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
      <CaretLeftIcon aria-hidden className="size-4" />
      {etiqueta}
    </Link>
  );
}
