import { Elysia } from 'elysia'
import { getDb } from '../db/mongo'
import { supabase } from '../db/supabase'

export const healthRoutes = new Elysia()
  .get('/health', async () => {
    const [mongoResult, supabaseResult] = await Promise.allSettled([
      getDb().then(db => db.command({ ping: 1 })),
      supabase.from('mei_profile').select('id').limit(1),
    ])

    const mongo = mongoResult.status === 'fulfilled' ? 'connected' : 'disconnected'
    const supabaseOk =
      supabaseResult.status === 'fulfilled' && !supabaseResult.value.error
    const supabaseStatus = supabaseOk ? 'connected' : 'disconnected'

    return {
      status: mongo === 'connected' && supabaseOk ? 'ok' : 'degraded',
      mongo,
      supabase: supabaseStatus,
      timestamp: new Date().toISOString(),
    }
  })
