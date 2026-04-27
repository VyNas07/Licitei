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
          .from('perfis_mei')
          .select('cnpj, cnaes')
          .eq('id_usuario', userId)
          .single()

        let keywords: string[] = []

        if (perfil) {
          // 2. Usa CNAEs já salvos ou re-busca na BrasilAPI
          let cnaesDescricoes: string[] = perfil.cnaes ?? []

          if (cnaesDescricoes.length === 0 && perfil.cnpj) {
            const cnaes = await getCnaesFromCnpj(perfil.cnpj)
            cnaesDescricoes = cnaes.map(c => c.descricao)

            // Persiste os CNAEs buscados para evitar nova chamada à BrasilAPI
            if (cnaesDescricoes.length > 0) {
              await supabase
                .from('perfis_mei')
                .update({ cnaes: cnaesDescricoes })
                .eq('id_usuario', userId)
            }

            keywords = buildKeywordsFromCnaes(cnaes)
          } else {
            keywords = buildKeywordsFromCnaes(
              cnaesDescricoes.map(d => ({ codigo: '', descricao: d }))
            )
          }
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
