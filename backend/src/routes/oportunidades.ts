import { Elysia, t } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { supabase } from '../db/supabase'
import { getCollection } from '../db/mongo'
import { getCnaesFromCnpj, buildKeywordsFromCnaes } from '../services/brasilapi'
import type { Document, Filter } from 'mongodb'

export const oportunidadesRoutes = new Elysia({ prefix: '/oportunidades' })
  .use(authPlugin)

  // GET /oportunidades — editais filtrados pelo CNAE do usuário logado
  .get(
    '/',
    async ({ userId, query, set }) => {
      try {
        const { page = 1, limit = 20, uf, municipio, valor_max, cnae, incluir_vencidos = false } = query
        const pageNum = Math.max(1, Number(page))
        const limitNum = Math.min(100, Math.max(1, Number(limit)))
        const skip = (pageNum - 1) * limitNum

        // 1. Busca perfil do usuário no Supabase
        const { data: perfil } = await supabase
          .from('mei_profile')
          .select('cnpj, cnae, ramo_atuacao')
          .eq('user_id', userId)
          .single()

        let keywords: string[] = []

        if (cnae) {
          // Filtro explícito por CNAE enviado pelo frontend — sobrescreve o do perfil
          keywords = buildKeywordsFromCnaes([{ codigo: cnae, descricao: cnae }])
        } else if (perfil?.ramo_atuacao) {
          keywords = buildKeywordsFromCnaes([{ codigo: perfil.cnae ?? '', descricao: perfil.ramo_atuacao }])
        } else if (perfil?.cnpj) {
          const cnaes = await getCnaesFromCnpj(perfil.cnpj)
          keywords = buildKeywordsFromCnaes(cnaes)
        }

        // 3. Monta filtro MongoDB
        const filter: Filter<Document> = {}

        // Teto MEI: oculta editais acima de R$ 81.000
        filter['valor_total_estimado'] = { $lte: valor_max ? Number(valor_max) : 81000 }

        if (uf) filter['uf'] = uf.toUpperCase()

        const escapeRegex = (str: string) => str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
        if (municipio) filter['municipio'] = { $regex: escapeRegex(municipio), $options: 'i' }

        // Editais sem data_encerramento_proposta (null/ausente) são incluídos como "sem prazo definido"
        if (!incluir_vencidos) {
          filter['$or'] = [
            { data_encerramento_proposta: { $gte: new Date() } },
            { data_encerramento_proposta: { $exists: false } },
            { data_encerramento_proposta: null },
          ]
        }

        if (keywords.length > 0) {
          filter['objeto_compra'] = { $regex: keywords.slice(0, 10).map(escapeRegex).join('|'), $options: 'i' }
        }

        const collection = await getCollection()
        const [data, total] = await Promise.all([
          collection
            .find(filter)
            .sort({ data_encerramento_proposta: 1 })
            .skip(skip)
            .limit(limitNum)
            .project({
              _id: 0,
              numero_controle_pncp: 1,
              objeto_compra: 1,
              orgao_razao_social: 1,
              valor_total_estimado: 1,
              uf: 1,
              municipio: 1,
              data_encerramento_proposta: 1,
              situacao_compra_nome: 1,
              modalidade_nome: 1,
            })
            .toArray(),
          collection.countDocuments(filter),
        ])

        const agora = Date.now()
        const dataComDias = data.map((edital: Document) => ({
          ...edital,
          dias_ate_encerramento: edital.data_encerramento_proposta
            ? Math.ceil((new Date(edital.data_encerramento_proposta as Date | string).getTime() - agora) / 86_400_000)
            : -1,
        }))

        return {
          data: dataComDias,
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          keywords_usados: keywords.slice(0, 10),
        }
      } catch {
        set.status = 500
        return { error: 'Erro ao buscar oportunidades' }
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        uf: t.Optional(t.String()),
        municipio: t.Optional(t.String()),
        valor_max: t.Optional(t.Numeric()),
        cnae: t.Optional(t.String()),
        incluir_vencidos: t.Optional(t.BooleanString()),
      }),
    }
  )
