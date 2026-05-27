import { Elysia, t } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { supabase } from '../db/supabase'

export const savedSearchesRoutes = new Elysia({ prefix: '/saved-searches' })
  .use(authPlugin)

  // GET /saved-searches — lista buscas salvas do usuário
  .get('/', async ({ userId, set }) => {
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        set.status = 500
        return { error: 'Erro ao buscar pesquisas salvas' }
      }

      return { data: data ?? [] }
    } catch {
      set.status = 500
      return { error: 'Erro interno' }
    }
  })

  // POST /saved-searches — salva uma nova busca
  .post(
    '/',
    async ({ userId, body, set }) => {
      try {
        const { data, error } = await supabase
          .from('saved_searches')
          .insert({
            user_id: userId,
            termo_busca: body.termo_busca,
            filtros: body.filtros ?? null,
          })
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            set.status = 409
            return { error: 'Busca já salva anteriormente' }
          }
          set.status = 500
          return { error: 'Erro ao salvar pesquisa' }
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
        termo_busca: t.String({ minLength: 1 }),
        filtros: t.Optional(
          t.Object({
            uf: t.Optional(t.String()),
            valor_min: t.Optional(t.Number()),
            valor_max: t.Optional(t.Number()),
            municipio: t.Optional(t.String()),
            cnae: t.Optional(t.String()),
            categorias: t.Optional(t.Array(t.String())),
          })
        ),
      }),
    }
  )

  // DELETE /saved-searches/:id — remove uma busca salva
  .delete('/:id', async ({ userId, params, set }) => {
    try {
      const { error, count } = await supabase
        .from('saved_searches')
        .delete({ count: 'exact' })
        .eq('id', params.id)
        .eq('user_id', userId)

      if (error) {
        set.status = 500
        return { error: 'Erro ao remover pesquisa salva' }
      }

      if (count === 0) {
        set.status = 404
        return { error: 'Pesquisa salva não encontrada' }
      }

      return { message: 'Pesquisa salva removida com sucesso' }
    } catch {
      set.status = 500
      return { error: 'Erro interno' }
    }
  })
