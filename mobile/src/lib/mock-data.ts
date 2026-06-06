export const MEI_EXCLUSIVO_TETO = 80000;

export function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}
