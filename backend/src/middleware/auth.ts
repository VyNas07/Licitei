import { Elysia } from 'elysia'
import { supabase } from '../db/supabase'

/**
 * Plugin de autenticação via JWT do Supabase.
 * Injeta `userId` e `userEmail` no contexto de todas as rotas que o usarem.
 */
export const authPlugin = new Elysia({ name: 'auth' })
  .derive({ as: 'scoped' }, async ({ headers, set }) => {
    const authHeader = headers['authorization']

    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      throw new Error('Token não fornecido')
    }

    const token = authHeader.slice(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      set.status = 401
      throw new Error('Token inválido ou expirado')
    }

    return { userId: user.id, userEmail: user.email ?? '' }
  })
