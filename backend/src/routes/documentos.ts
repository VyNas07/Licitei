// @ts-ignore: elysia types might not be installed in the environment
import { Elysia, t } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { supabase } from '../db/supabase'

const TIPOS_VALIDOS = ['certidao_negativa', 'contrato_social', 'comprovante_endereco', 'cnpj', 'outro'] as const
const STATUS_VALIDOS = ['valido', 'pendente', 'vencido'] as const
type StatusDocumento = typeof STATUS_VALIDOS[number]

type PostBody = {
  nome: string
  tipo: typeof TIPOS_VALIDOS[number]
  url: string
  status?: StatusDocumento
  validade?: string | null
  participacao_id?: string | null
}

type PatchBody = {
  status?: string
  validade?: string | null
}

export const documentosRoutes = new Elysia({ prefix: '/documentos' })
  .use(authPlugin)

  // GET /documentos — lista documentos do usuário
  .get('/', async ({ userId, set }: { userId: string; set: any }) => {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        set.status = 500
        return { error: 'Erro ao buscar documentos' }
      }

      return { data: data ?? [] }
    } catch {
      set.status = 500
      return { error: 'Erro interno' }
    }
  })

  // POST /documentos — registra metadados após upload já feito no Supabase Storage
  .post(
    '/',
    async ({ userId, body, set }: { userId: string; body: PostBody; set: any }) => {
      try {
        const { data, error } = await supabase
          .from('documentos')
          .insert({
            user_id: userId,
            nome: body.nome,
            tipo: body.tipo,
            url: body.url,
            status: body.status ?? 'pendente',
            validade: body.validade ?? null,
            participacao_id: body.participacao_id ?? null,
          })
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            set.status = 409
            return { error: 'Documento já cadastrado' }
          }
          set.status = 500
          return { error: 'Erro ao cadastrar documento', details: error.message }
        }

        set.status = 201
        return data
      } catch {
        set.status = 500
        return { error: 'Erro interno' }
      }
    },
    {
      body: t.Object({
        nome: t.String({ minLength: 1, maxLength: 200 }),
        tipo: t.Union([
          t.Literal('certidao_negativa'),
          t.Literal('contrato_social'),
          t.Literal('comprovante_endereco'),
          t.Literal('cnpj'),
          t.Literal('outro'),
        ]),
        url: t.String({ minLength: 1 }),
        status: t.Optional(t.Union([t.Literal('valido'), t.Literal('pendente'), t.Literal('vencido')])),
        validade: t.Optional(t.Nullable(t.String())),
        participacao_id: t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  // PATCH /documentos/:id — atualiza status ou validade
  .patch(
    '/:id',
    async ({ userId, params, body, set }: { userId: string; params: { id: string }; body: PatchBody; set: any }) => {
      if (body.status && !STATUS_VALIDOS.includes(body.status as StatusDocumento)) {
        set.status = 400
        return { error: `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}` }
      }

      const updates: Record<string, unknown> = {}
      if (body.status !== undefined) updates.status = body.status
      if (body.validade !== undefined) updates.validade = body.validade

      if (Object.keys(updates).length === 0) {
        set.status = 400
        return { error: 'Nenhum campo para atualizar' }
      }

      const { data, error } = await supabase
        .from('documentos')
        .update(updates)
        .eq('id', params.id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          set.status = 404
          return { error: 'Documento não encontrado' }
        }
        set.status = 500
        return { error: 'Erro ao atualizar documento' }
      }

      return data
    },
    {
      body: t.Object({
        status: t.Optional(t.String()),
        validade: t.Optional(t.Nullable(t.String())),
      }),
    }
  )

  // DELETE /documentos/:id — remove documento
  .delete('/:id', async ({ userId, params, set }: { userId: string; params: { id: string }; set: any }) => {
    const { error, count } = await supabase
      .from('documentos')
      .delete({ count: 'exact' })
      .eq('id', params.id)
      .eq('user_id', userId)

    if (error) {
      set.status = 500
      return { error: 'Erro ao remover documento' }
    }

    if (count === 0) {
      set.status = 404
      return { error: 'Documento não encontrado' }
    }

    return { message: 'Documento removido com sucesso' }
  })
