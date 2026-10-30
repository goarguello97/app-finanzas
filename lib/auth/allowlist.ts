/** Sin ALLOWED_EMAIL configurado no entra nadie. */
export function emailPermitido(email: string | null | undefined, permitido: string | undefined): boolean {
  const esperado = permitido?.trim().toLowerCase();
  if (!esperado) return false;
  return email?.trim().toLowerCase() === esperado;
}
