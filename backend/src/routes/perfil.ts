import { Elysia, t } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { supabase } from '../db/supabase'
import { getCnaesFromCnpj } from '../services/brasilapi'

export const perfilRoutes = new Elysia({ prefix: '/perfil' })
  .use(authPlugin)

  // GET /perfil — retorna o perfil do usuário autenticado
  .get('/', async ({ userId, set }) => {
    const { data, error } = await supabase
      .from('perfis_mei')
      .select('*')
      .eq('id_usuario', userId)
      .single()

    if (error || !data) {
      set.status = 404
      return { error: 'Perfil não encontrado' }
    }

    return data
  })

  // PUT /perfil — atualiza nome e/ou CNPJ (re-busca CNAEs se CNPJ mudar)
  .put(
    '/',
    async ({ userId, body, set }) => {
      const updates: Record<string, unknown> = {}

      if (body.nome_responsavel) updates['nome_responsavel'] = body.nome_responsavel

      if (body.cnpj) {
        const cnpjLimpo = body.cnpj.replace(/\D/g, '')
        updates['cnpj'] = cnpjLimpo

        const cnaes = await getCnaesFromCnpj(cnpjLimpo)
        updates['cnaes'] = cnaes.map(c => c.descricao)
      }

      const { data, error } = await supabase
        .from('perfis_mei')
        .update(updates)
        .eq('id_usuario', userId)
        .select()
        .single()

      if (error) {
        set.status = 500
        return { error: 'Erro ao atualizar perfil', details: error.message }
      }

      return data
    },
    {
      body: t.Object({
        nome_responsavel: t.Optional(t.String()),
        cnpj: t.Optional(t.String()),
      }),
    }
  )
