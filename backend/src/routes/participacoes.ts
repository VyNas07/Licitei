import { Elysia, t } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { supabase } from '../db/supabase'
import { getCollection } from '../db/mongo'

const STATUS_VALIDOS = ['acompanhando', 'proposta_enviada', 'venceu', 'perdeu', 'desistiu'] as const
type StatusParticipacao = typeof STATUS_VALIDOS[number]

export const participacoesRoutes = new Elysia({ prefix: '/participacoes' })
  .use(authPlugin)

  // GET /participacoes — lista participações do usuário (dados já desnormalizados)
  .get('/', async ({ userId, set }) => {
    try {
      const { data, error } = await supabase
        .from('participacoes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        set.status = 500
        return { error: 'Erro ao buscar participações', details: error.message }
      }

      return { data: data ?? [] }
    } catch (err) {
      set.status = 500
      return { error: 'Erro interno', details: String(err) }
    }
  })

  // POST /participacoes — inicia acompanhamento de um edital
  .post(
    '/',
    async ({ userId, body, set }) => {
      try {
        const collection = await getCollection()
        const edital = await collection.findOne(
          { numero_controle_pncp: body.licitacao_id },
          { projection: { _id: 0, objeto_compra: 1, orgao_razao_social: 1, valor_total_estimado: 1, data_encerramento_proposta: 1 } }
        )

        if (!edital) {
          set.status = 404
          return { error: 'Edital não encontrado no MongoDB' }
        }

        const { data, error } = await supabase
          .from('participacoes')
          .insert({
            user_id: userId,
            licitacao_id: body.licitacao_id,
            status: 'acompanhando',
            objeto_compra: edital['objeto_compra'] as string ?? null,
            orgao_nome: edital['orgao_razao_social'] as string ?? null,
            valor_estimado: edital['valor_total_estimado'] as number ?? null,
            data_encerramento: edital['data_encerramento_proposta'] ?? null,
          })
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            set.status = 409
            return { error: 'Edital já está nas participações' }
          }
          set.status = 500
          return { error: 'Erro ao criar participação', details: error.message }
        }

        set.status = 201
        return data
      } catch (err) {
        set.status = 500
        return { error: 'Erro interno', details: String(err) }
      }
    },
    {
      body: t.Object({
        licitacao_id: t.String({ minLength: 1 }),
      }),
    }
  )

  // PATCH /participacoes/:id — atualiza status da participação
  .patch(
    '/:id',
    async ({ userId, params, body, set }) => {
      if (!STATUS_VALIDOS.includes(body.status as StatusParticipacao)) {
        set.status = 400
        return { error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` }
      }

      const { data, error, count } = await supabase
        .from('participacoes')
        .update({ status: body.status })
        .eq('id', params.id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error || count === 0) {
        set.status = 404
        return { error: 'Participação não encontrada' }
      }

      return data
    },
    {
      body: t.Object({
        status: t.String(),
      }),
    }
  )

  // DELETE /participacoes/:id — remove participação
  .delete('/:id', async ({ userId, params, set }) => {
    const { error, count } = await supabase
      .from('participacoes')
      .delete({ count: 'exact' })
      .eq('id', params.id)
      .eq('user_id', userId)

    if (error) {
      set.status = 500
      return { error: 'Erro ao remover participação', details: error.message }
    }

    if (count === 0) {
      set.status = 404
      return { error: 'Participação não encontrada' }
    }

    return { message: 'Participação removida com sucesso' }
  })
