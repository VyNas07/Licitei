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
        const { page = 1, limit = 20, uf, valor_max } = query
        const pageNum = Math.max(1, Number(page))
        const limitNum = Math.min(50, Math.max(1, Number(limit)))
        const skip = (pageNum - 1) * limitNum

        // 1. Busca perfil do usuário no Supabase
        const { data: perfil } = await supabase
          .from('mei_profile')
          .select('cnpj, cnae, ramo_atuacao')
          .eq('user_id', userId)
          .single()

        let keywords: string[] = []

        if (perfil?.ramo_atuacao) {
          // 2a. Usa ramo_atuacao — preenchido manualmente ou auto-populado via CNPJ no PUT /perfil
          keywords = buildKeywordsFromCnaes([{ codigo: perfil.cnae ?? '', descricao: perfil.ramo_atuacao }])
        } else if (perfil?.cnpj) {
          // 2b. Fallback: CNPJ disponível mas ramo não preenchido — chama BrasilAPI
          const cnaes = await getCnaesFromCnpj(perfil.cnpj)
          keywords = buildKeywordsFromCnaes(cnaes)
        }

        // 3. Monta filtro MongoDB
        const filter: Filter<Document> = {}

        // Teto MEI: oculta editais acima de R$ 81.000
        filter['valor_total_estimado'] = { $lte: valor_max ? Number(valor_max) : 81000 }

        if (uf) filter['uf'] = uf.toUpperCase()

        // Só editais ainda abertos
        filter['data_encerramento_proposta'] = { $gte: new Date() }

        if (keywords.length > 0) {
          filter['objeto_compra'] = { $regex: keywords.slice(0, 10).join('|'), $options: 'i' }
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

        return {
          data,
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          keywords_usados: keywords.slice(0, 10),
        }
      } catch (err) {
        set.status = 500
        return { error: 'Erro ao buscar oportunidades', details: String(err) }
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        uf: t.Optional(t.String()),
        valor_max: t.Optional(t.Numeric()),
      }),
    }
  )
