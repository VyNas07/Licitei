export function formatarData(valor: string | undefined): string {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime()) || data.getFullYear() < 2000) return '—';
  return data.toLocaleDateString('pt-BR');
}
