import { Elysia, t } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { config } from '../config'

export const chatRoutes = new Elysia({ prefix: '/chat' })
  .use(authPlugin)

  // POST /chat — proxy para o servidor MCP (Track 3)
  .post(
    '/',
    async ({ body, set }) => {
      try {
        const res = await fetch(`${config.mcp.url}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: body.query }),
          signal: AbortSignal.timeout(30_000), // timeout de 30s
        })

        if (!res.ok) {
          set.status = 502
          return { error: 'Assistente de IA indisponível no momento. Tente novamente.' }
        }

        const data = await res.json()
        return data
      } catch (err) {
        // MCP offline — retorna mensagem amigável em vez de 500
        set.status = 503
        return {
          error: 'Assistente temporariamente indisponível',
          details: String(err),
        }
      }
    },
    {
      body: t.Object({
        query: t.String({ minLength: 1, maxLength: 1000 }),
      }),
    }
  )
