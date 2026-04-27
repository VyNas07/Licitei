import { Elysia } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { supabase } from '../db/supabase'
import { getCollection } from '../db/mongo'
import { getCnaesFromCnpj, buildKeywordsFromCnaes } from '../services/brasilapi'
import type { Document, Filter } from 'mongodb'

const TETO_MEI = 81_000
const ALERTA_TETO_PERCENTUAL = 0.70 // emite alerta a partir de 70% do teto
const DIAS_PRAZO_CURTO = 5

export const alertasRoutes = new Elysia({ prefix: '/alertas' })
  .use(authPlugin)

  .get('/', async ({ userId, set }) => {
    try {
      const alertas: Array<Record<string, unknown>> = []

      // 1. Busca perfil
      const { data: perfil } = await supabase
        .from('perfis_mei')
        .select('cnpj, cnaes')
        .eq('id_usuario', userId)
        .single()

      // 2. Busca favoritos
      const { data: favs } = await supabase
        .from('favoritos')
        .select('numero_controle_pncp, created_at')
        .eq('user_id', userId)

      const collection = await getCollection()

      if (favs && favs.length > 0) {
        const ids = favs.map(f => f.numero_controle_pncp)
        const editaisFavoritos = await collection
          .find({ numero_controle_pncp: { $in: ids } })
          .project({ _id: 0, numero_controle_pncp: 1, valor_total_estimado: 1, data_encerramento_proposta: 1, objeto_compra: 1, uf: 1, municipio: 1, orgao_razao_social: 1 })
          .toArray()

        // ALERTA: Teto MEI
        const somaFavoritos = editaisFavoritos.reduce(
          (acc, e) => acc + (Number(e['valor_total_estimado']) || 0),
          0
        )
        if (somaFavoritos >= TETO_MEI * ALERTA_TETO_PERCENTUAL) {
          alertas.push({
            tipo: 'teto_mei',
            urgente: somaFavoritos >= TETO_MEI,
            soma_favoritos: somaFavoritos,
            teto: TETO_MEI,
            mensagem: `Seus favoritos somam R$ ${somaFavoritos.toLocaleString('pt-BR')}. ${somaFavoritos >= TETO_MEI ? 'Atenção: você atingiu o teto MEI!' : 'Você está se aproximando do teto anual MEI (R$ 81.000).'}`,
          })
        }

        // ALERTA: Prazo curto nos favoritos
        const agora = new Date()
        const limitePrazo = new Date(agora.getTime() + DIAS_PRAZO_CURTO * 24 * 60 * 60 * 1000)

        for (const edital of editaisFavoritos) {
          const encerramento = edital['data_encerramento_proposta']
          if (!encerramento) continue
          const dataFim = new Date(encerramento as string)
          if (dataFim > agora && dataFim <= limitePrazo) {
            const diasRestantes = Math.ceil((dataFim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
            alertas.push({
              tipo: 'prazo_curto',
              dias_restantes: diasRestantes,
              edital,
              mensagem: `O edital "${String(edital['objeto_compra']).slice(0, 60)}..." encerra em ${diasRestantes} dia(s).`,
            })
          }
        }
      }

      // 3. ALERTA: Novos editais compatíveis (últimas 48h)
      if (perfil) {
        let cnaesDescricoes: string[] = perfil.cnaes ?? []
        if (cnaesDescricoes.length === 0 && perfil.cnpj) {
          const cnaes = await getCnaesFromCnpj(perfil.cnpj)
          cnaesDescricoes = cnaes.map(c => c.descricao)
        }

        const keywords = buildKeywordsFromCnaes(
          cnaesDescricoes.map(d => ({ codigo: '', descricao: d }))
        )

        if (keywords.length > 0) {
          const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000)
          const filter: Filter<Document> = {
            _extraido_em: { $gte: limite48h },
            objeto_compra: { $regex: keywords.slice(0, 8).join('|'), $options: 'i' },
            valor_total_estimado: { $lte: TETO_MEI },
          }

          const novos = await collection
            .find(filter)
            .limit(5)
            .project({ _id: 0, numero_controle_pncp: 1, objeto_compra: 1, valor_total_estimado: 1, uf: 1, municipio: 1, orgao_razao_social: 1, data_encerramento_proposta: 1 })
            .toArray()

          for (const edital of novos) {
            alertas.push({
              tipo: 'novo_edital',
              edital,
              mensagem: 'Novo edital compatível com seu CNAE encontrado.',
            })
          }
        }
      }

      return { data: alertas, total: alertas.length }
    } catch (err) {
      set.status = 500
      return { error: 'Erro ao gerar alertas', details: String(err) }
    }
  })
