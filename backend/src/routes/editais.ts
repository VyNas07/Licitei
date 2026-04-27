import { Elysia, t } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { getCollection } from '../db/mongo'
import type { Document, Filter } from 'mongodb'

export const editaisRoutes = new Elysia({ prefix: '/editais' })
  .use(authPlugin)

  // GET /editais — listagem paginada com filtros
  .get(
    '/',
    async ({ query, set }) => {
      try {
        const { page = 1, limit = 20, uf, valor_min, valor_max, situacao, q } = query
        const pageNum = Math.max(1, Number(page))
        const limitNum = Math.min(50, Math.max(1, Number(limit)))
        const skip = (pageNum - 1) * limitNum

        const filter: Filter<Document> = {}

        if (uf) filter['uf'] = uf.toUpperCase()
        if (situacao) filter['situacao_compra_nome'] = { $regex: situacao, $options: 'i' }
        if (q) filter['objeto_compra'] = { $regex: q, $options: 'i' }

        if (valor_min || valor_max) {
          const valorFilter: Record<string, number> = {}
          if (valor_min) valorFilter['$gte'] = Number(valor_min)
          if (valor_max) valorFilter['$lte'] = Number(valor_max)
          filter['valor_total_estimado'] = valorFilter
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
        }
      } catch (err) {
        set.status = 500
        return { error: 'Erro ao buscar editais', details: String(err) }
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        uf: t.Optional(t.String()),
        valor_min: t.Optional(t.Numeric()),
        valor_max: t.Optional(t.Numeric()),
        situacao: t.Optional(t.String()),
        q: t.Optional(t.String()),
      }),
    }
  )

  // GET /editais/:id — detalhe completo
  .get('/:id', async ({ params, set }) => {
    try {
      const collection = await getCollection()
      const edital = await collection.findOne(
        { numero_controle_pncp: params.id },
        { projection: { _id: 0, _extraido_em: 0, _fonte: 0 } }
      )

      if (!edital) {
        set.status = 404
        return { error: 'Edital não encontrado' }
      }

      return edital
    } catch (err) {
      set.status = 500
      return { error: 'Erro ao buscar edital', details: String(err) }
    }
  })
