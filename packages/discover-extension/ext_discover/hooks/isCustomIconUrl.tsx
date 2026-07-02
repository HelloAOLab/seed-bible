export function isCustomIconUrl(icon: string | null | undefined): boolean {
  return (icon ?? "").startsWith("https");
}
