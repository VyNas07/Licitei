import { Elysia } from 'elysia'
import { getDb } from '../db/mongo'

export const healthRoutes = new Elysia()
  .get('/health', async () => {
    try {
      const db = await getDb()
      await db.command({ ping: 1 })
      return { status: 'ok', mongo: 'connected', timestamp: new Date().toISOString() }
    } catch {
      return { status: 'degraded', mongo: 'disconnected', timestamp: new Date().toISOString() }
    }
  })
