/**
 * Consulta dados de um CNPJ na BrasilAPI e retorna os CNAEs associados.
 * https://brasilapi.com.br/docs#tag/CNPJ
 */

interface BrasilApiCnpj {
  cnpj: string
  razao_social: string
  cnae_fiscal: number
  cnae_fiscal_descricao: string
  cnaes_secundarios?: Array<{ codigo: number; descricao: string }>
}

export interface CnaeInfo {
  codigo: string
  descricao: string
}

export async function getCnaesFromCnpj(cnpj: string): Promise<CnaeInfo[]> {
  const cnpjLimpo = cnpj.replace(/\D/g, '')

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`)
    if (!res.ok) {
      console.warn(`[BrasilAPI] CNPJ ${cnpjLimpo} não encontrado — status ${res.status}`)
      return []
    }

    const data = (await res.json()) as BrasilApiCnpj
    const cnaes: CnaeInfo[] = []

    // CNAE principal
    if (data.cnae_fiscal) {
      cnaes.push({
        codigo: String(data.cnae_fiscal),
        descricao: data.cnae_fiscal_descricao ?? '',
      })
    }

    // CNAEs secundários
    for (const sec of data.cnaes_secundarios ?? []) {
      cnaes.push({ codigo: String(sec.codigo), descricao: sec.descricao })
    }

    return cnaes
  } catch (err) {
    console.error(`[BrasilAPI] Erro ao consultar CNPJ ${cnpjLimpo}:`, err)
    return []
  }
}

/**
 * Extrai palavras-chave relevantes das descrições dos CNAEs
 * para usar como filtro de busca textual no MongoDB.
 */
export function buildKeywordsFromCnaes(cnaes: CnaeInfo[]): string[] {
  const stopwords = new Set([
    'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'as', 'os',
    'para', 'por', 'com', 'sem', 'ou', 'não', 'na', 'no', 'nas', 'nos',
    'um', 'uma', 'outros', 'outras', 'exceto',
  ])

  const keywords = new Set<string>()

  for (const cnae of cnaes) {
    const words = cnae.descricao
      .toLowerCase()
      .split(/[\s,;()/]+/)
      .filter(w => w.length > 3 && !stopwords.has(w))

    for (const word of words) keywords.add(word)
  }

  return [...keywords]
}
