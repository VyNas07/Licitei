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
        const { page = 1, limit = 20, uf, municipio, valor_min, valor_max, situacao, q, keywords, incluir_vencidos = false } = query
        const pageNum = Math.max(1, Number(page))
        const limitNum = Math.min(100, Math.max(1, Number(limit)))
        const skip = (pageNum - 1) * limitNum

        const filter: Filter<Document> = {}

        const escapeRegex = (str: string) => str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
        if (uf) filter['uf'] = uf.toUpperCase()
        if (municipio) filter['municipio'] = { $regex: escapeRegex(municipio), $options: 'i' }
        if (situacao) filter['situacao_compra_nome'] = { $regex: escapeRegex(situacao), $options: 'i' }

        if (valor_min || valor_max) {
          const valorFilter: Record<string, number> = {}
          if (valor_min) valorFilter['$gte'] = Number(valor_min)
          if (valor_max) valorFilter['$lte'] = Number(valor_max)
          filter['valor_total_estimado'] = valorFilter
        }

        // Todas as condições OR-style reunidas aqui para evitar conflito de chaves $or/$and
        const mustMatch: Filter<Document>[] = []

        // Editais sem data_encerramento_proposta (null/ausente) são incluídos como "sem prazo definido"
        if (!incluir_vencidos) {
          mustMatch.push({ $or: [
            { data_encerramento_proposta: { $gte: new Date() } },
            { data_encerramento_proposta: { $exists: false } },
            { data_encerramento_proposta: null },
          ]})
        }

        // q busca em objeto_compra e orgao_razao_social; keywords filtra categorias só em objeto_compra
        if (q) {
          const qRegex = { $regex: escapeRegex(q), $options: 'i' }
          mustMatch.push({ $or: [{ objeto_compra: qRegex }, { orgao_razao_social: qRegex }] })
        }
        if (keywords) {
          const safeKeywords = keywords.slice(0, 200).split('|').slice(0, 10).map(escapeRegex).join('|')
          mustMatch.push({ objeto_compra: { $regex: safeKeywords, $options: 'i' } })
        }

        if (mustMatch.length === 1) Object.assign(filter, mustMatch[0])
        if (mustMatch.length > 1) filter['$and'] = mustMatch

        const collection = await getCollection()
        const nullsSentinel = new Date('9999-12-31T00:00:00.000Z')
        const [data, total] = await Promise.all([
          collection.aggregate([
            { $match: filter },
            { $addFields: { _sort_data: { $ifNull: ['$data_encerramento_proposta', nullsSentinel] } } },
            { $sort: { _sort_data: 1 } },
            { $skip: skip },
            { $limit: limitNum },
            { $project: { _id: 0, _sort_data: 0, _extraido_em: 0, _fonte: 0 } },
          ]).toArray(),
          collection.countDocuments(filter),
        ])

        const agora = Date.now()
        const dataComDias = data.map(edital => ({
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
        }
      } catch {
        set.status = 500
        return { error: 'Erro ao buscar editais' }
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric()),
        limit: t.Optional(t.Numeric()),
        uf: t.Optional(t.String()),
        municipio: t.Optional(t.String()),
        valor_min: t.Optional(t.Numeric()),
        valor_max: t.Optional(t.Numeric()),
        situacao: t.Optional(t.String()),
        q: t.Optional(t.String()),
        keywords: t.Optional(t.String()),
        incluir_vencidos: t.Optional(t.BooleanString()),
      }),
    }
  )

  // GET /editais/:id — detalhe completo
  .get('/:id', async ({ params, set }) => {
    try {
      const collection = await getCollection()
      const edital = await collection.findOne(
        { numero_controle_pncp: decodeURIComponent(params.id) },
        { projection: { _id: 0, _extraido_em: 0, _fonte: 0 } }
      )

      if (!edital) {
        set.status = 404
        return { error: 'Edital não encontrado' }
      }

      return edital
    } catch {
      set.status = 500
      return { error: 'Erro ao buscar edital' }
    }
  })
