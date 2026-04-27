import { Elysia, t } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { supabase } from '../db/supabase'
import { getCollection } from '../db/mongo'

export const favoritosRoutes = new Elysia({ prefix: '/favoritos' })
  .use(authPlugin)

  // GET /favoritos — lista editais salvos com dados completos do MongoDB
  .get('/', async ({ userId, set }) => {
    try {
      const { data: favs, error } = await supabase
        .from('favoritos')
        .select('numero_controle_pncp, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        set.status = 500
        return { error: 'Erro ao buscar favoritos' }
      }

      if (!favs || favs.length === 0) return { data: [] }

      const ids = favs.map(f => f.numero_controle_pncp)
      const collection = await getCollection()

      const editais = await collection
        .find({ numero_controle_pncp: { $in: ids } })
        .project({ _id: 0, _extraido_em: 0, _fonte: 0 })
        .toArray()

      // Mantém a ordem dos favoritos e injeta data de salvamento
      const favMap = Object.fromEntries(favs.map(f => [f.numero_controle_pncp, f.created_at]))
      const data = editais.map(e => ({
        ...e,
        salvo_em: favMap[e['numero_controle_pncp'] as string] ?? null,
      }))

      return { data }
    } catch (err) {
      set.status = 500
      return { error: 'Erro interno', details: String(err) }
    }
  })

  // POST /favoritos — salva um edital
  .post(
    '/',
    async ({ userId, body, set }) => {
      const { error } = await supabase
        .from('favoritos')
        .insert({ user_id: userId, numero_controle_pncp: body.numero_controle_pncp })

      if (error) {
        if (error.code === '23505') {
          // Violação de UNIQUE — já está nos favoritos
          set.status = 409
          return { error: 'Edital já está nos favoritos' }
        }
        set.status = 500
        return { error: 'Erro ao salvar favorito', details: error.message }
      }

      set.status = 201
      return { message: 'Edital salvo nos favoritos' }
    },
    {
      body: t.Object({
        numero_controle_pncp: t.String({ minLength: 1 }),
      }),
    }
  )

  // DELETE /favoritos/:pncp_id — remove um favorito
  .delete('/:pncp_id', async ({ userId, params, set }) => {
    const { error, count } = await supabase
      .from('favoritos')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
      .eq('numero_controle_pncp', params.pncp_id)

    if (error) {
      set.status = 500
      return { error: 'Erro ao remover favorito', details: error.message }
    }

    if (count === 0) {
      set.status = 404
      return { error: 'Favorito não encontrado' }
    }

    return { message: 'Favorito removido com sucesso' }
  })
