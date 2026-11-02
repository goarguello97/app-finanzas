import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

/** Select nativo: en el celular abre el selector del sistema, que es lo más rápido de usar. */
export function SelectNativo({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-control border border-input bg-card pr-9 pl-3 text-base transition-[color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/30",
          className,
        )}
        {...props}
      />
      <CaretDownIcon aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
