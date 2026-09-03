export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
