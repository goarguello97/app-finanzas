function exigir(nombre: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Revisá .env.example.`);
  return valor;
}

/** Se accede por nombre completo porque Next reemplaza NEXT_PUBLIC_* en build. */
export function envSupabase() {
  return {
    url: exigir("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: exigir("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}
