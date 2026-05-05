import { Elysia } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { supabase } from '../db/supabase'
import { getCollection } from '../db/mongo'
import { getCnaesFromCnpj, buildKeywordsFromCnaes } from '../services/brasilapi'
import type { Document, Filter } from 'mongodb'

const TETO_MEI = 81_000
const ALERTA_TETO_PERCENTUAL = 0.7
const DIAS_PRAZO_CURTO = 5

type Participacao = {
  licitacao_id: string | null
  valor_estimado: number | null
  data_encerramento: string | null
  objeto_compra: string | null
  orgao_nome: string | null
}

type Perfil = {
  cnpj: string | null
  cnae: string | null
  ramo_atuacao: string | null
}

function alertaTetoMei(participacoes: Participacao[]): Record<string, unknown> | null {
  const soma = participacoes.reduce((acc, p) => acc + (Number(p.valor_estimado) || 0), 0)
  if (soma < TETO_MEI * ALERTA_TETO_PERCENTUAL) return null
  return {
    tipo: 'teto_mei',
    urgente: soma >= TETO_MEI,
    soma_participacoes: soma,
    teto: TETO_MEI,
    mensagem: `Suas participações somam R$ ${soma.toLocaleString('pt-BR')}. ${
      soma >= TETO_MEI
        ? 'Atenção: você atingiu o teto MEI!'
        : 'Você está se aproximando do teto anual MEI (R$ 81.000).'
    }`,
  }
}

function alertasPrazoCurto(participacoes: Participacao[]): Record<string, unknown>[] {
  const alertas: Record<string, unknown>[] = []
  const agora = new Date()
  const limitePrazo = new Date(agora.getTime() + DIAS_PRAZO_CURTO * 24 * 60 * 60 * 1000)

  for (const p of participacoes) {
    if (!p.data_encerramento) continue
    const dataFim = new Date(p.data_encerramento)
    if (dataFim <= agora || dataFim > limitePrazo) continue
    const diasRestantes = Math.ceil((dataFim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
    alertas.push({
      tipo: 'prazo_curto',
      dias_restantes: diasRestantes,
      licitacao_id: p.licitacao_id,
      objeto_compra: p.objeto_compra,
      orgao_nome: p.orgao_nome,
      mensagem: `O edital "${String(p.objeto_compra ?? '').slice(0, 60)}..." encerra em ${diasRestantes} dia(s).`,
    })
  }
  return alertas
}

async function alertasNovosEditais(perfil: Perfil): Promise<Record<string, unknown>[]> {
  let keywords: string[] = []

  if (perfil.ramo_atuacao) {
    keywords = buildKeywordsFromCnaes([{ codigo: perfil.cnae ?? '', descricao: perfil.ramo_atuacao }])
  } else if (perfil.cnpj) {
    const cnaes = await getCnaesFromCnpj(perfil.cnpj)
    keywords = buildKeywordsFromCnaes(cnaes)
  }

  if (keywords.length === 0) return []

  const collection = await getCollection()
  const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const filter: Filter<Document> = {
    _extraido_em: { $gte: limite48h },
    objeto_compra: { $regex: keywords.slice(0, 8).join('|'), $options: 'i' },
    valor_total_estimado: { $lte: TETO_MEI },
  }

  const novos = await collection
    .find(filter)
    .limit(5)
    .project({
      _id: 0,
      numero_controle_pncp: 1,
      objeto_compra: 1,
      valor_total_estimado: 1,
      uf: 1,
      municipio: 1,
      orgao_razao_social: 1,
      data_encerramento_proposta: 1,
    })
    .toArray()

  return novos.map(edital => ({
    tipo: 'novo_edital',
    edital,
    mensagem: 'Novo edital compatível com seu CNAE encontrado.',
  }))
}

export const alertasRoutes = new Elysia({ prefix: '/alertas' })
  .use(authPlugin)

  .get('/', async ({ userId, set }) => {
    try {
      const [{ data: perfil }, { data: participacoes }] = await Promise.all([
        supabase.from('mei_profile').select('cnpj, cnae, ramo_atuacao').eq('user_id', userId).single(),
        supabase.from('participacoes').select('licitacao_id, valor_estimado, data_encerramento, objeto_compra, orgao_nome').eq('user_id', userId),
      ])

      const alertas: Record<string, unknown>[] = []

      if (participacoes && participacoes.length > 0) {
        const tetoAlerta = alertaTetoMei(participacoes)
        if (tetoAlerta) alertas.push(tetoAlerta)
        alertas.push(...alertasPrazoCurto(participacoes))
      }

      if (perfil?.cnpj || perfil?.ramo_atuacao) {
        const novos = await alertasNovosEditais(perfil)
        alertas.push(...novos)
      }

      return { data: alertas, total: alertas.length }
    } catch (err) {
      set.status = 500
      return { error: 'Erro ao gerar alertas', details: String(err) }
    }
  })
